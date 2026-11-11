import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useGoogleLogin, hasGrantedAllScopesGoogle } from "@react-oauth/google";
import * as account from "../api/youtubeAccount";

const AuthContext = createContext();

const USER_KEY    = "mytube_user";
const SESSION_KEY = "mytube_yt_session";
const WL_KEY      = "mytube_watchlater";
// Older versions kept these in the browser; they now come from the YouTube account.
const LEGACY_KEYS = ["mytube_subscriptions", "mytube_liked"];

const YT_SCOPE = "https://www.googleapis.com/auth/youtube";
const SCOPES   = `openid email profile ${YT_SCOPE}`;

const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const writeJSON = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage unavailable */ }
};
const removeKeys = (...keys) => keys.forEach((k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } });

// A session is only valid while its access token has not expired.
const readSession = () => {
  const s = readJSON(SESSION_KEY, null);
  return s?.token && s.expiresAt > Date.now() ? s : null;
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  // Show the cached profile immediately on load, even if the access token has
  // expired — a silent re-auth below usually renews it before anything needs it.
  const [user, setUser] = useState(() => readJSON(USER_KEY, null));
  const [sessionExpired, setSessionExpired] = useState(false);
  const hadCachedUser = useRef(Boolean(readJSON(USER_KEY, null)));
  const silentAttempt = useRef(false);
  const silentTimeout = useRef(null);

  const [subscriptions, setSubscriptions] = useState([]);
  const [likedVideos, setLikedVideos]     = useState([]);
  const [likedMap, setLikedMap]           = useState({}); // videoId -> boolean, for videos beyond the loaded list
  const [watchLater, setWatchLater]       = useState(() => readJSON(WL_KEY, []));
  const [syncing, setSyncing]             = useState(false);

  const token = session?.token || null;

  const clearSession = useCallback((expired = false) => {
    setSession(null);
    setUser(null);
    setSubscriptions([]);
    setLikedVideos([]);
    setLikedMap({});
    setSessionExpired(expired);
    removeKeys(SESSION_KEY, USER_KEY, ...LEGACY_KEYS);
  }, []);

  // Shared handling for failed YouTube calls.
  const handleApiError = useCallback((err, action) => {
    const { status, reason } = account.errorInfo(err);
    console.error(`Could not ${action}:`, err?.response?.data || err);
    if (status === 401) { clearSession(true); return; }
    if (status === 403 && (reason === "quotaExceeded" || reason === "rateLimitExceeded")) {
      alert("YouTube's daily limit has been reached. Please try again later.");
    } else if (status === 403) {
      alert("MyTube doesn't have permission to do that on your YouTube account. Try signing out and signing in again.");
    } else {
      alert(`Couldn't ${action}. Please try again.`);
    }
  }, [clearSession]);

  // Load the real subscriptions and likes from the user's YouTube account.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
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
      } catch (err) {
        if (!cancelled) handleApiError(err, "load your YouTube data");
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [token, handleApiError]);

  // Shared by both the interactive "Sign in" click and the silent background renewal.
  const applySession = useCallback(async (resp) => {
    if (!hasGrantedAllScopesGoogle(resp, YT_SCOPE)) {
      throw new Error("missing-scope");
    }
    const profile = await account.getProfile(resp.access_token);
    // Expire slightly early so we never use a token that is about to lapse.
    const expiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000 - 30000;
    const next = { token: resp.access_token, expiresAt };
    writeJSON(SESSION_KEY, next);
    writeJSON(USER_KEY, profile);
    removeKeys(...LEGACY_KEYS);
    setUser(profile);
    setSession(next);
    setSessionExpired(false);
  }, []);

  const signIn = useGoogleLogin({
    scope: SCOPES,
    onSuccess: async (resp) => {
      clearTimeout(silentTimeout.current);
      const silent = silentAttempt.current;
      silentAttempt.current = false;
      try {
        await applySession(resp);
      } catch (err) {
        console.error(err);
        if (silent) {
          // The browser's Google session no longer covers us — the user has to sign in by hand.
          clearSession(true);
        } else if (err.message === "missing-scope") {
          alert("MyTube needs access to your YouTube account to show your subscriptions and likes. Please allow it and try again.");
        } else {
          alert("Sign-in failed. Please try again.");
        }
      }
    },
    onError: (err) => {
      clearTimeout(silentTimeout.current);
      const silent = silentAttempt.current;
      silentAttempt.current = false;
      if (silent) { clearSession(true); return; }
      console.error("Google sign-in error:", err);
    },
  });

  // Renews the session using Google's existing browser login, without showing any UI.
  // Works as long as the user is still signed into their Google account in this browser
  // and already granted MyTube's YouTube permission — exactly the common "I closed the
  // tab and came back" case, so people aren't forced to sign in again every hour.
  //
  // Some browsers block the hidden sign-in step entirely (third-party cookie/storage
  // restrictions) and never call onSuccess or onError at all, which used to leave the
  // app stuck showing a stale "signed in" avatar while subscriptions, likes and
  // everything else silently never loaded. If nothing happens within a few seconds,
  // give up and fall back to the normal "please sign in again" state instead of hanging.
  const trySilentSignIn = useCallback(() => {
    silentAttempt.current = true;
    signIn({ prompt: "" });
    clearTimeout(silentTimeout.current);
    silentTimeout.current = setTimeout(() => {
      if (silentAttempt.current) {
        silentAttempt.current = false;
        clearSession(true);
      }
    }, 6000);
  }, [signIn, clearSession]);

  // On load, if there's a cached profile but the token already expired, quietly renew it
  // instead of showing a logged-out state the user didn't ask for.
  useEffect(() => {
    if (!session && hadCachedUser.current) trySilentSignIn();
    // Only ever run once, right after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the access token is about to expire, renew it the same silent way.
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => trySilentSignIn(), Math.max(session.expiresAt - Date.now(), 0));
    return () => clearTimeout(timer);
  }, [session, trySilentSignIn]);

  const signOut = useCallback(() => {
    clearTimeout(silentTimeout.current);
    silentAttempt.current = false;
    clearSession(false);
  }, [clearSession]);

  // Don't let a pending silent-renewal timeout fire after the provider is gone.
  useEffect(() => () => clearTimeout(silentTimeout.current), []);

  // ── Subscriptions (synced with YouTube) ──
  const toggleSubscription = async (channel) => {
    if (!token) return;
    const existing = subscriptions.find((c) => c.id === channel.id);

    if (existing) {
      if (!existing.subId) return;
      setSubscriptions((prev) => prev.filter((c) => c.id !== channel.id));
      try {
        await account.unsubscribe(token, existing.subId);
      } catch (err) {
        setSubscriptions((prev) => [existing, ...prev]);
        handleApiError(err, "unsubscribe");
      }
    } else {
      setSubscriptions((prev) => [{ ...channel }, ...prev]);
      try {
        const subId = await account.subscribe(token, channel.id);
        setSubscriptions((prev) => prev.map((c) => (c.id === channel.id ? { ...c, subId } : c)));
      } catch (err) {
        setSubscriptions((prev) => prev.filter((c) => c.id !== channel.id));
        handleApiError(err, "subscribe");
      }
    }
  };

  // ── Likes (synced with YouTube) ──
  const isLiked = (id) => (id in likedMap ? likedMap[id] : likedVideos.some((v) => v.id === id));

  const toggleLiked = async (video) => {
    if (!token) return;
    const nowLiked = !isLiked(video.id);
    const apply = (liked) => {
      setLikedMap((m) => ({ ...m, [video.id]: liked }));
      setLikedVideos((prev) => {
        const without = prev.filter((v) => v.id !== video.id);
        return liked ? [video, ...without] : without;
      });
    };
    apply(nowLiked);
    try {
      await account.rateVideo(token, video.id, nowLiked ? "like" : "none");
    } catch (err) {
      apply(!nowLiked);
      handleApiError(err, nowLiked ? "like this video" : "remove your like");
    }
  };

  // Checks the real rating of a video (the loaded list only holds the latest likes).
  const loadRating = useCallback(async (id) => {
    if (!token) return;
    try {
      const rating = await account.getRating(token, id);
      setLikedMap((m) => ({ ...m, [id]: rating === "like" }));
    } catch { /* the loaded list is used instead */ }
  }, [token]);

  // ── Watch Later (YouTube does not expose this list, so it stays in this browser) ──
  const toggleWatchLater = (video) => {
    setWatchLater((prev) => {
      const updated = prev.find((v) => v.id === video.id) ? prev.filter((v) => v.id !== video.id) : [video, ...prev];
      writeJSON(WL_KEY, updated);
      return updated;
    });
  };

  const isSubscribed = (id) => subscriptions.some((c) => c.id === id);
  const isWatchLater = (id) => watchLater.some((v) => v.id === id);

  return (
    <AuthContext.Provider value={{
      user, signIn, signOut, sessionExpired, syncing,
      subscriptions, toggleSubscription, isSubscribed,
      watchLater, toggleWatchLater, isWatchLater,
      likedVideos, toggleLiked, isLiked, loadRating,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
