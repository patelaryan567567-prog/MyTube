import axios from "axios";
import { formatDuration } from "../utils/duration";

// Calls that act on the signed-in user's own YouTube account.
// They authenticate with the user's OAuth access token (not the shared API keys).

const BASE_URL = "https://www.googleapis.com/youtube/v3";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

const authed = (token) =>
  axios.create({ baseURL: BASE_URL, headers: { Authorization: `Bearer ${token}` } });

/** Converts a YouTube video resource into the compact shape used by the saved lists. */
export const toSavedVideo = (v) => ({
  id: v.id,
  title: v.snippet?.title,
  thumb: v.snippet?.thumbnails?.medium?.url,
  channel: v.snippet?.channelTitle,
  duration: formatDuration(v.contentDetails?.duration),
});

/** Extracts a status code and reason from an axios error. */
export const errorInfo = (err) => ({
  status: err?.response?.status,
  reason: err?.response?.data?.error?.errors?.[0]?.reason || err?.response?.data?.error?.status,
});

export const getProfile = async (token) => {
  const { data } = await axios.get(USERINFO_URL, { headers: { Authorization: `Bearer ${token}` } });
  return { name: data.name, email: data.email, picture: data.picture };
};

/** All channels the user subscribes to (most relevant first). */
export const listMySubscriptions = async (token, max = 500) => {
  const api = authed(token);
  const out = [];
  let pageToken = "";
  do {
    const { data } = await api.get("/subscriptions", {
      params: { part: "snippet", mine: true, maxResults: 50, order: "relevance", pageToken: pageToken || undefined },
    });
    for (const item of data.items || []) {
      const channelId = item.snippet?.resourceId?.channelId;
      if (!channelId) continue;
      out.push({
        id: channelId,
        subId: item.id,
        name: item.snippet.title,
        avatar: item.snippet.thumbnails?.default?.url || item.snippet.thumbnails?.medium?.url,
      });
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken && out.length < max);
  return out;
};

/** The user's most recent liked videos (up to 50). */
export const listMyLikedVideos = async (token) => {
  const { data } = await authed(token).get("/videos", {
    params: { part: "snippet,contentDetails", myRating: "like", maxResults: 50 },
  });
  return (data.items || []).map(toSavedVideo);
};

/** Subscribes to a channel. Returns the new subscription id. */
export const subscribe = async (token, channelId) => {
  const { data } = await authed(token).post(
    "/subscriptions",
    { snippet: { resourceId: { kind: "youtube#channel", channelId } } },
    { params: { part: "snippet" } }
  );
  return data.id;
};

export const unsubscribe = async (token, subscriptionId) => {
  await authed(token).delete("/subscriptions", { params: { id: subscriptionId } });
};

/** rating: "like" or "none" */
export const rateVideo = async (token, videoId, rating) => {
  await authed(token).post("/videos/rate", null, { params: { id: videoId, rating } });
};

/** Returns "like", "dislike" or "none". */
export const getRating = async (token, videoId) => {
  const { data } = await authed(token).get("/videos/getRating", { params: { id: videoId } });
  return data.items?.[0]?.rating || "none";
};
