import { createContext, useContext, useState, useEffect, useCallback } from "react";
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
  const [user, setUser] = useState(() => (readSession() ? readJSON(USER_KEY, null) : null));
  const [sessionExpired, setSessionExpired] = useState(false);

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

  // Sign the user out automatically when the access token expires.
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => clearSession(true), Math.max(session.expiresAt - Date.now(), 0));
    return () => clearTimeout(timer);
  }, [session, clearSession]);

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

  const signIn = useGoogleLogin({
    scope: SCOPES,
    onSuccess: async (resp) => {
      if (!hasGrantedAllScopesGoogle(resp, YT_SCOPE)) {
        alert("MyTube needs access to your YouTube account to show your subscriptions and likes. Please allow it and try again.");
        return;
      }
      try {
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
      } catch (err) {
        console.error(err);
        alert("Sign-in failed. Please try again.");
      }
    },
    onError: (err) => console.error("Google sign-in error:", err),
  });

  const signOut = useCallback(() => clearSession(false), [clearSession]);

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
