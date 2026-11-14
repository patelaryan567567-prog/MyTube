import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
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
const LEGACY_KEYS = ["mytube_subscriptions", "mytube_liked"];

const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const writeJSON = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage unavailable */ }
};
const removeKeys = (...keys) => keys.forEach((k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } });

// YouTube OAuth access token is used for live YouTube API mutations when valid,
// while Firebase Auth + Firestore keeps the user logged in permanently!
const readSession = () => {
  const s = readJSON(SESSION_KEY, null);
  return s?.token && s.expiresAt > Date.now() ? s : null;
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [user, setUser] = useState(() => readJSON(USER_KEY, null));
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUid, setFirebaseUid] = useState(null);

  const [subscriptions, setSubscriptions] = useState([]);
  const [likedVideos, setLikedVideos]     = useState([]);
  const [likedMap, setLikedMap]           = useState({});
  const [watchLater, setWatchLater]       = useState(() => readJSON(WL_KEY, []));
  const [syncing, setSyncing]             = useState(false);

  const token = session?.token || null;
  const syncedTokenRef = useRef(null);

  // 1. Listen to Firebase Authentication state (persists indefinitely across sessions/reloads)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = {
          uid: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split("@")[0] || "MyTube User",
          email: fbUser.email || "",
          picture: fbUser.photoURL || "",
        };
        setUser(profile);
        setFirebaseUid(fbUser.uid);
        writeJSON(USER_KEY, profile);
        try {
          await upsertUserProfile(fbUser, profile);
        } catch (err) {
          console.error("Failed to sync user profile to Firestore:", err);
        }
      } else {
        // Only clear user state when Firebase Auth explicitly signs out
        setUser(null);
        setFirebaseUid(null);
        setSession(null);
        setSubscriptions([]);
        setLikedVideos([]);
        setLikedMap({});
        removeKeys(SESSION_KEY, USER_KEY, ...LEGACY_KEYS);
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
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, subsPath);
      }
    );

    const likedPath = `users/${firebaseUid}/likedVideos`;
    const likedQuery = query(collection(db, "users", firebaseUid, "likedVideos"), where("uid", "==", firebaseUid));
    const unsubLiked = onSnapshot(
      likedQuery,
      (snapshot) => {
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
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, likedPath);
      }
    );

    const wlPath = `users/${firebaseUid}/watchLater`;
    const wlQuery = query(collection(db, "users", firebaseUid, "watchLater"), where("uid", "==", firebaseUid));
    const unsubWatchLater = onSnapshot(
      wlQuery,
      (snapshot) => {
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
        handleFirestoreError(error, OperationType.LIST, wlPath);
      }
    );

    return () => {
      unsubSubs();
      unsubLiked();
      unsubWatchLater();
    };
  }, [authReady, firebaseUid]);

  // Shared handling for failed YouTube API calls — never logs the user out of the website!
  const handleApiError = useCallback((err, action) => {
    const { status, reason } = account.errorInfo(err);
    console.error(`Could not ${action}:`, err?.response?.data || err);
    if (status === 401) {
      // YouTube OAuth access token expired, but keep the user logged in via Firebase!
      setSession(null);
      removeKeys(SESSION_KEY);
      return;
    }
    if (status === 403 && (reason === "quotaExceeded" || reason === "rateLimitExceeded")) {
      console.warn("YouTube's daily limit has been reached. Saved to your MyTube cloud library.");
    }
  }, []);

  // 3. When a fresh YouTube OAuth access token is present, sync subscriptions & likes from YouTube into Firestore
  useEffect(() => {
    if (!token || !firebaseUid || syncedTokenRef.current === token) return;
    let cancelled = false;
    syncedTokenRef.current = token;

    const run = async () => {
      setSyncing(true);
      try {
        await upsertUserProfile(auth.currentUser);
        const [subs, liked] = await Promise.all([
          account.listMySubscriptions(token),
          account.listMyLikedVideos(token),
        ]);
        if (cancelled) return;
        setSubscriptions(subs);
        setLikedVideos(liked);
        setLikedMap({});

        // Persist fetched YouTube subscriptions and likes into Firestore in the background
        await Promise.all([
          ...subs.slice(0, 100).map((ch) => saveSubscriptionToFirestore(firebaseUid, ch)),
          ...liked.slice(0, 50).map((v) => saveVideoItemToFirestore(firebaseUid, "likedVideos", v)),
        ]);
      } catch (err) {
        if (!cancelled) handleApiError(err, "load your YouTube data");
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [token, firebaseUid, handleApiError]);

  // 4. Sign in with Firebase Google Auth Popup (persists login forever until explicit sign-out)
  const signIn = useCallback(async () => {
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
      removeKeys(...LEGACY_KEYS);
      setUser(profile);
      setFirebaseUid(fbUser.uid);

      await upsertUserProfile(fbUser, profile);

      // Migrate any existing local Watch Later items to Firestore on sign-in
      const localWl = readJSON(WL_KEY, []);
      if (Array.isArray(localWl) && localWl.length > 0) {
        await Promise.all(
          localWl.map((v) => saveVideoItemToFirestore(fbUser.uid, "watchLater", v))
        );
      }

      if (accessToken) {
        const expiresAt = Date.now() + 3550 * 1000;
        const nextSession = { token: accessToken, expiresAt };
        writeJSON(SESSION_KEY, nextSession);
        setSession(nextSession);
      }
    } catch (err) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        return;
      }
      console.error("Firebase Google sign-in error:", err);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
    setSession(null);
    setUser(null);
    setFirebaseUid(null);
    setSubscriptions([]);
    setLikedVideos([]);
    setLikedMap({});
    removeKeys(SESSION_KEY, USER_KEY, ...LEGACY_KEYS);
  }, []);

  // ── Subscriptions (synced with Firestore + YouTube when token is active) ──
  const toggleSubscription = async (channel) => {
    if (!user) return;
    const existing = subscriptions.find((c) => c.id === channel.id);

    if (existing) {
      setSubscriptions((prev) => prev.filter((c) => c.id !== channel.id));
      if (firebaseUid) {
        removeSubscriptionFromFirestore(firebaseUid, channel.id).catch(console.error);
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
      setSubscriptions((prev) => [newSub, ...prev]);
      if (token) {
        try {
          const subId = await account.subscribe(token, channel.id);
          newSub.subId = subId || "";
          setSubscriptions((prev) => prev.map((c) => (c.id === channel.id ? { ...c, subId } : c)));
        } catch (err) {
          handleApiError(err, "subscribe");
        }
      }
      if (firebaseUid) {
        saveSubscriptionToFirestore(firebaseUid, newSub).catch(console.error);
      }
    }
  };

  // ── Likes (synced with Firestore + YouTube when token is active) ──
  const isLiked = (id) => (id in likedMap ? likedMap[id] : likedVideos.some((v) => v.id === id));

  const toggleLiked = async (video) => {
    if (!user) return;
    const nowLiked = !isLiked(video.id);
    const apply = (liked) => {
      setLikedMap((m) => ({ ...m, [video.id]: liked }));
      setLikedVideos((prev) => {
        const without = prev.filter((v) => v.id !== video.id);
        return liked ? [video, ...without] : without;
      });
    };
    apply(nowLiked);

    if (firebaseUid) {
      if (nowLiked) {
        saveVideoItemToFirestore(firebaseUid, "likedVideos", video).catch(console.error);
      } else {
        removeVideoItemFromFirestore(firebaseUid, "likedVideos", video.id).catch(console.error);
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
    } catch { /* fallback to Firestore liked list */ }
  }, [token]);

  // ── Watch Later (synced with Firestore + localStorage cache) ──
  const toggleWatchLater = (video) => {
    const exists = watchLater.some((v) => v.id === video.id);
    const updated = exists
      ? watchLater.filter((v) => v.id !== video.id)
      : [video, ...watchLater];
    setWatchLater(updated);
    writeJSON(WL_KEY, updated);

    if (firebaseUid) {
      if (exists) {
        removeVideoItemFromFirestore(firebaseUid, "watchLater", video.id).catch(console.error);
      } else {
        saveVideoItemToFirestore(firebaseUid, "watchLater", video).catch(console.error);
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
