import { createContext, useContext, useState } from "react";

const AuthContext = createContext();
const USER_KEY  = "mytube_user";
const SUBS_KEY  = "mytube_subscriptions";
const WL_KEY    = "mytube_watchlater";
const LIKED_KEY = "mytube_liked";

const load = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch { return null; } });
  const [subscriptions, setSubscriptions] = useState(() => load(SUBS_KEY));
  const [watchLater, setWatchLater]       = useState(() => load(WL_KEY));
  const [likedVideos, setLikedVideos]     = useState(() => load(LIKED_KEY));

  const handleSetUser = (u) => {
    setUser(u);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  };

  const toggleSubscription = (channel) => {
    setSubscriptions((prev) => {
      const updated = prev.find((c) => c.id === channel.id) ? prev.filter((c) => c.id !== channel.id) : [channel, ...prev];
      save(SUBS_KEY, updated); return updated;
    });
  };

  const toggleWatchLater = (video) => {
    setWatchLater((prev) => {
      const updated = prev.find((v) => v.id === video.id) ? prev.filter((v) => v.id !== video.id) : [video, ...prev];
      save(WL_KEY, updated); return updated;
    });
  };

  const toggleLiked = (video) => {
    setLikedVideos((prev) => {
      const updated = prev.find((v) => v.id === video.id) ? prev.filter((v) => v.id !== video.id) : [video, ...prev];
      save(LIKED_KEY, updated); return updated;
    });
  };

  const isSubscribed   = (id) => subscriptions.some((c) => c.id === id);
  const isWatchLater   = (id) => watchLater.some((v) => v.id === id);
  const isLiked        = (id) => likedVideos.some((v) => v.id === id);

  return (
    <AuthContext.Provider value={{
      user, setUser: handleSetUser,
      subscriptions, toggleSubscription, isSubscribed,
      watchLater, toggleWatchLater, isWatchLater,
      likedVideos, toggleLiked, isLiked,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
