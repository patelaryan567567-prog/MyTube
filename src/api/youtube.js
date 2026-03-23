import axios from "axios";

const BASE_URL = "https://www.googleapis.com/youtube/v3";
const api = axios.create({ baseURL: BASE_URL });

// Separate keys for each feature + fallback
const HOME_KEYS   = [import.meta.env.VITE_API_HOME,  import.meta.env.VITE_API_EXTRA];
const SEARCH_KEYS = [import.meta.env.VITE_API_SEARCH, import.meta.env.VITE_API_EXTRA];
const VIDEO_KEYS  = [import.meta.env.VITE_API_VIDEO,  import.meta.env.VITE_API_EXTRA];

const cache = {};

// Auto-fallback: tries each key until one works
const smartGet = async (url, params, keys) => {
  const cacheKey = url + JSON.stringify(params);
  if (cache[cacheKey]) return cache[cacheKey];

  for (const key of keys) {
    try {
      const res = await api.get(url, { params: { ...params, key } });
      cache[cacheKey] = res;
      return res;
    } catch (err) {
      const status = err?.response?.status;
      const reason = err?.response?.data?.error?.errors?.[0]?.reason;
      // If quota exceeded or forbidden, try next key
      if (status === 403 && (reason === "quotaExceeded" || reason === "dailyLimitExceeded")) {
        console.warn(`Key exhausted, trying next key...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error("All API keys exhausted!");
};

export const getTrending = () =>
  smartGet("/videos", { part: "snippet,statistics", chart: "mostPopular", maxResults: 20, regionCode: "IN" }, HOME_KEYS);

export const getVideosByCategory = (categoryId) =>
  smartGet("/videos", { part: "snippet,statistics", chart: "mostPopular", videoCategoryId: categoryId, maxResults: 20, regionCode: "IN" }, HOME_KEYS);

export const searchVideos = (query) =>
  smartGet("/search", { part: "snippet", q: query, maxResults: 20 }, SEARCH_KEYS);

export const getVideoById = (id) =>
  smartGet("/videos", { part: "snippet,statistics", id }, VIDEO_KEYS);

export const getRelatedVideos = (query) =>
  smartGet("/search", { part: "snippet", q: query, type: "video", maxResults: 15 }, VIDEO_KEYS);

export const getChannelDetails = (channelId) =>
  smartGet("/channels", { part: "snippet,statistics", id: channelId }, VIDEO_KEYS);

export const getChannelVideos = (channelId) =>
  smartGet("/search", { part: "snippet", channelId, type: "video", maxResults: 20, order: "date" }, VIDEO_KEYS);
