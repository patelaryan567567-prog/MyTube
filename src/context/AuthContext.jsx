import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useGoogleLogin, hasGrantedAllScopesGoogle } from "@react-oauth/google";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import * as account from "../api/youtubeAccount";
import {
  auth,
  db,
  googleProvider,
  OperationType,
  handleFirestoreError,
  upsertUserProfile,
  saveSubscriptionToFirestore,
  removeSubscriptionFromFirestore,
  saveVideoItemToFirestore,
  removeVideoItemFromFirestore,
} from "../firebase";

const AuthContext = createContext();

const USER_KEY    = "mytube_user";
const SESSION_KEY = "mytube_yt_session";
const WL_KEY      = "mytube_watchlater";
const SUBS_KEY    = "mytube_subscriptions";
const LIKED_KEY   = "mytube_liked";

const YT_SCOPE = "https://www.googleapis.com/auth/youtube";
const SCOPES   = `openid email profile ${YT_SCOPE}`;

const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const writeJSON = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage unavailable */ }
};
const removeKeys = (...keys) => keys.forEach((k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } });

// YouTube OAuth access token is valid for ~1 hour for live YouTube API calls,
// while Firebase Auth + Firestore + cached state keeps the user logged in permanently!
const readSession = () => {
  const s = readJSON(SESSION_KEY, null);
  return s?.token && s.expiresAt > Date.now() ? s : null;
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  // Keep cached user, subscriptions, likedVideos, and watchLater immediately available on load
  // so the user NEVER gets logged out when the 1-hour YouTube token expires.
  const [user, setUser] = useState(() => readJSON(USER_KEY, null));
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUid, setFirebaseUid] = useState(null);

  const [subscriptions, setSubscriptions] = useState(() => readJSON(SUBS_KEY, []));
  const [likedVideos, setLikedVideos]     = useState(() => readJSON(LIKED_KEY, []));
  const [likedMap, setLikedMap]           = useState({});
  const [watchLater, setWatchLater]       = useState(() => readJSON(WL_KEY, []));
  const [syncing, setSyncing]             = useState(false);

  const token = session?.token || null;
  const syncedTokenRef = useRef(null);
  const pendingActionRef = useRef(null);

  // 1. Listen to Firebase Authentication state (persists indefinitely across sessions/reloads)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const cached = readJSON(USER_KEY, null);
        const profile = {
          uid: fbUser.uid,
          name: fbUser.displayName || cached?.name || fbUser.email?.split("@")[0] || "MyTube User",
          email: fbUser.email || cached?.email || "",
          picture: fbUser.photoURL || cached?.picture || "",
        };
        setUser(profile);
        setFirebaseUid(fbUser.uid);
        writeJSON(USER_KEY, profile);
        try {
          await upsertUserProfile(fbUser, profile);
        } catch (err) {
          console.warn("Could not sync user profile to Firestore:", err);
        }
      } else {
        setFirebaseUid(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Attach real-time Firestore listeners once Firebase Auth is ready and user is signed in
  useEffect(() => {
    if (!authReady || !firebaseUid) return;

    const subsPath = `users/${firebaseUid}/subscriptions`;
    const subsQuery = query(collection(db, "users", firebaseUid, "subscriptions"), where("uid", "==", firebaseUid));
    const unsubSubs = onSnapshot(
      subsQuery,
      (snapshot) => {
        if (snapshot.empty) return;
        const items = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: data.id,
            subId: data.subId || "",
            name: data.name,
            avatar: data.avatar,
          };
        });
        setSubscriptions(items);
        writeJSON(SUBS_KEY, items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, subsPath);
        } catch (e) {
          console.warn(e);
        }
      }
    );

    const likedPath = `users/${firebaseUid}/likedVideos`;
    const likedQuery = query(collection(db, "users", firebaseUid, "likedVideos"), where("uid", "==", firebaseUid));
    const unsubLiked = onSnapshot(
      likedQuery,
      (snapshot) => {
        if (snapshot.empty) return;
        const items = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: data.id,
            title: data.title,
            thumb: data.thumb,
            channel: data.channel,
            duration: data.duration,
          };
        });
        setLikedVideos(items);
        writeJSON(LIKED_KEY, items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, likedPath);
        } catch (e) {
          console.warn(e);
        }
      }
    );

    const wlPath = `users/${firebaseUid}/watchLater`;
    const wlQuery = query(collection(db, "users", firebaseUid, "watchLater"), where("uid", "==", firebaseUid));
    const unsubWatchLater = onSnapshot(
      wlQuery,
      (snapshot) => {
        if (snapshot.empty) return;
        const items = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: data.id,
            title: data.title,
            thumb: data.thumb,
            channel: data.channel,
            duration: data.duration,
          };
        });
        setWatchLater(items);
        writeJSON(WL_KEY, items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, wlPath);
        } catch (e) {
          console.warn(e);
        }
      }
    );

    return () => {
      unsubSubs();
      unsubLiked();
      unsubWatchLater();
    };
  }, [authReady, firebaseUid]);

  // Shared handling for failed YouTube API calls — NEVER logs the user out of the website!
  const handleApiError = useCallback((err, action) => {
    const { status, reason } = account.errorInfo(err);
    console.error(`Could not ${action}:`, err?.response?.data || err);
    if (status === 401) {
      // Only clear the expired 1-hour YouTube token; keep user logged in on the website!
      setSession(null);
      removeKeys(SESSION_KEY);
      return;
    }
    if (status === 403 && (reason === "quotaExceeded" || reason === "rateLimitExceeded")) {
      console.warn("YouTube daily quota reached; changes are saved in your MyTube account.");
    }
  }, []);

  // 3. Import real subscriptions & liked videos from YouTube whenever we get a valid OAuth access_token,
  // and persist them into both localStorage and Cloud Firestore!
  useEffect(() => {
    if (!token || syncedTokenRef.current === token) return;
    let cancelled = false;
    syncedTokenRef.current = token;

    const run = async () => {
      setSyncing(true);
      try {
        const [subs, liked] = await Promise.all([
          account.listMySubscriptions(token),
          account.listMyLikedVideos(token),
        ]);
        if (cancelled) return;
        setSubscriptions(subs);
        setLikedVideos(liked);
        setLikedMap({});
        writeJSON(SUBS_KEY, subs);
        writeJSON(LIKED_KEY, liked);

        const activeUid = firebaseUid || auth.currentUser?.uid;
        if (activeUid) {
          await upsertUserProfile(auth.currentUser);
          await Promise.all([
            ...subs.slice(0, 100).map((ch) => saveSubscriptionToFirestore(activeUid, ch)),
            ...liked.slice(0, 50).map((v) => saveVideoItemToFirestore(activeUid, "likedVideos", v)),
          ]);
        }
      } catch (err) {
        if (!cancelled) handleApiError(err, "load your YouTube data");
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [token, firebaseUid, handleApiError]);

  // Helper to apply an OAuth access_token from VITE_GOOGLE_CLIENT_ID AND bridge it into Firebase Auth
  const applyOAuthToken = useCallback(async (accessToken, expiresIn = 3600) => {
    const profile = await account.getProfile(accessToken);
    const expiresAt = Date.now() + (Number(expiresIn) || 3600) * 1000 - 30000;
    const nextSession = { token: accessToken, expiresAt };

    writeJSON(SESSION_KEY, nextSession);
    writeJSON(USER_KEY, profile);
    setUser((prev) => ({ ...prev, ...profile }));
    setSession(nextSession);

    // Bridge the Google OAuth access_token directly into Firebase Authentication
    // without opening a second popup!
    try {
      const credential = GoogleAuthProvider.credential(null, accessToken);
      const fbResult = await signInWithCredential(auth, credential);
      const fbUser = fbResult.user;
      const fullProfile = {
        uid: fbUser.uid,
        name: profile.name || fbUser.displayName || "MyTube User",
        email: profile.email || fbUser.email || "",
        picture: profile.picture || fbUser.photoURL || "",
      };
      setUser(fullProfile);
      setFirebaseUid(fbUser.uid);
      writeJSON(USER_KEY, fullProfile);
      await upsertUserProfile(fbUser, fullProfile);

      // Sync any local Watch Later items to Firestore
      const localWl = readJSON(WL_KEY, []);
      if (Array.isArray(localWl) && localWl.length > 0) {
        await Promise.all(
          localWl.map((v) => saveVideoItemToFirestore(fbUser.uid, "watchLater", v))
        );
      }
    } catch (fbErr) {
      // Even if Firebase Auth Google provider isn't enabled yet in Firebase Console on Netlify,
      // the user stays signed in via USER_KEY + local cache!
      console.warn("Firebase Auth credential bridge note:", fbErr?.message || fbErr);
    }

    if (pendingActionRef.current) {
      const fn = pendingActionRef.current;
      pendingActionRef.current = null;
      fn(accessToken);
    }
  }, []);

  // Fallback login via Firebase signInWithPopup if VITE_GOOGLE_CLIENT_ID is not set or fails
  const signInWithFirebasePopup = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      const fbUser = result.user;

      const profile = {
        uid: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split("@")[0] || "MyTube User",
        email: fbUser.email || "",
        picture: fbUser.photoURL || "",
      };

      writeJSON(USER_KEY, profile);
      setUser(profile);
      setFirebaseUid(fbUser.uid);

      try {
        await upsertUserProfile(fbUser, profile);
      } catch (e) {
        console.warn("Could not upsert profile to Firestore:", e);
      }

      if (accessToken) {
        const nextSession = { token: accessToken, expiresAt: Date.now() + 3550 * 1000 };
        writeJSON(SESSION_KEY, nextSession);
        setSession(nextSession);
      }
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        return;
      }
      console.error("Firebase sign-in error:", err);
    }
  }, []);

  // Primary Google OAuth login using VITE_GOOGLE_CLIENT_ID (best for YouTube Data API v3 scopes)
  const googleOAuthLogin = useGoogleLogin({
    scope: SCOPES,
    onSuccess: async (resp) => {
      try {
        if (!hasGrantedAllScopesGoogle(resp, YT_SCOPE)) {
          console.warn("YouTube scope was not granted; continuing with basic profile.");
        }
        await applyOAuthToken(resp.access_token, resp.expires_in);
      } catch (err) {
        console.error("Google OAuth login failed, trying Firebase popup fallback:", err);
        await signInWithFirebasePopup();
      }
    },
    onError: async (err) => {
      console.warn("Google OAuth client error, falling back to Firebase Auth popup:", err);
      await signInWithFirebasePopup();
    },
  });

  const signIn = useCallback(() => {
    if (import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      googleOAuthLogin();
    } else {
      signInWithFirebasePopup();
    }
  }, [googleOAuthLogin, signInWithFirebasePopup]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn("Error signing out of Firebase:", err);
    }
    syncedTokenRef.current = null;
    setSession(null);
    setUser(null);
    setFirebaseUid(null);
    setSubscriptions([]);
    setLikedVideos([]);
    setLikedMap({});
    removeKeys(SESSION_KEY, USER_KEY, SUBS_KEY, LIKED_KEY);
  }, []);

  // ── Subscriptions (synced with YouTube + Firestore + localStorage) ──
  const toggleSubscription = async (channel) => {
    if (!user) return;
    const existing = subscriptions.find((c) => c.id === channel.id);

    if (existing) {
      const updated = subscriptions.filter((c) => c.id !== channel.id);
      setSubscriptions(updated);
      writeJSON(SUBS_KEY, updated);

      if (firebaseUid) {
        removeSubscriptionFromFirestore(firebaseUid, channel.id).catch(console.warn);
      }
      if (token && existing.subId) {
        try {
          await account.unsubscribe(token, existing.subId);
        } catch (err) {
          handleApiError(err, "unsubscribe");
        }
      }
    } else {
      const newSub = {
        id: channel.id,
        subId: channel.subId || "",
        name: channel.name || "Channel",
        avatar: channel.avatar || "",
      };
      const updated = [newSub, ...subscriptions];
      setSubscriptions(updated);
      writeJSON(SUBS_KEY, updated);

      if (token) {
        try {
          const subId = await account.subscribe(token, channel.id);
          newSub.subId = subId || "";
          setSubscriptions((prev) => {
            const next = prev.map((c) => (c.id === channel.id ? { ...c, subId } : c));
            writeJSON(SUBS_KEY, next);
            return next;
          });
        } catch (err) {
          handleApiError(err, "subscribe");
        }
      }
      if (firebaseUid) {
        saveSubscriptionToFirestore(firebaseUid, newSub).catch(console.warn);
      }
    }
  };

  // ── Likes (synced with YouTube + Firestore + localStorage) ──
  const isLiked = (id) => (id in likedMap ? likedMap[id] : likedVideos.some((v) => v.id === id));

  const toggleLiked = async (video) => {
    if (!user) return;
    const nowLiked = !isLiked(video.id);
    const apply = (liked) => {
      setLikedMap((m) => ({ ...m, [video.id]: liked }));
      setLikedVideos((prev) => {
        const without = prev.filter((v) => v.id !== video.id);
        const next = liked ? [video, ...without] : without;
        writeJSON(LIKED_KEY, next);
        return next;
      });
    };
    apply(nowLiked);

    if (firebaseUid) {
      if (nowLiked) {
        saveVideoItemToFirestore(firebaseUid, "likedVideos", video).catch(console.warn);
      } else {
        removeVideoItemFromFirestore(firebaseUid, "likedVideos", video.id).catch(console.warn);
      }
    }

    if (token) {
      try {
        await account.rateVideo(token, video.id, nowLiked ? "like" : "none");
      } catch (err) {
        handleApiError(err, nowLiked ? "like this video" : "remove your like");
      }
    }
  };

  // Checks the real rating of a video when a YouTube OAuth token is active
  const loadRating = useCallback(async (id) => {
    if (!token) return;
    try {
      const rating = await account.getRating(token, id);
      setLikedMap((m) => ({ ...m, [id]: rating === "like" }));
    } catch { /* fallback to saved likedVideos list */ }
  }, [token]);

  // ── Watch Later (synced with Firestore + localStorage) ──
  const toggleWatchLater = (video) => {
    const exists = watchLater.some((v) => v.id === video.id);
    const updated = exists
      ? watchLater.filter((v) => v.id !== video.id)
      : [video, ...watchLater];
    setWatchLater(updated);
    writeJSON(WL_KEY, updated);

    if (firebaseUid) {
      if (exists) {
        removeVideoItemFromFirestore(firebaseUid, "watchLater", video.id).catch(console.warn);
      } else {
        saveVideoItemToFirestore(firebaseUid, "watchLater", video).catch(console.warn);
      }
    }
  };

  const isSubscribed = (id) => subscriptions.some((c) => c.id === id);
  const isWatchLater = (id) => watchLater.some((v) => v.id === id);

  return (
    <AuthContext.Provider value={{
      user,
      signIn,
      signOut,
      sessionExpired: false,
      syncing,
      subscriptions,
      toggleSubscription,
      isSubscribed,
      watchLater,
      toggleWatchLater,
      isWatchLater,
      likedVideos,
      toggleLiked,
      isLiked,
      loadRating,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
