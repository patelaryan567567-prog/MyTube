import axios from "axios";

const BASE_URL = "https://www.googleapis.com/youtube/v3";
const api = axios.create({ baseURL: BASE_URL });

const HOME_KEYS   = [import.meta.env.VITE_API_HOME,  import.meta.env.VITE_API_EXTRA];
const SEARCH_KEYS = [import.meta.env.VITE_API_SEARCH, import.meta.env.VITE_API_EXTRA];
const VIDEO_KEYS  = [import.meta.env.VITE_API_VIDEO,  import.meta.env.VITE_API_EXTRA];

const cache = {};
const smartGet = async (url, params, keys) => {
  const cacheKey = url + JSON.stringify(params);
  if (cache[cacheKey]) return cache[cacheKey];
  for (const key of keys) {
    try {
      const res = await api.get(url, { params: { ...params, key } });
      cache[cacheKey] = res;
      return res;
    } catch (err) {
      const reason = err?.response?.data?.error?.errors?.[0]?.reason;
      if (err?.response?.status === 403 && (reason === "quotaExceeded" || reason === "dailyLimitExceeded")) {
        console.warn("Key exhausted, trying next...");
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

export const searchVideos = (query, pageToken = "") =>
  smartGet("/search", { part: "snippet", q: query, maxResults: 20, pageToken }, SEARCH_KEYS);

export const getSearchSuggestions = (query) =>
  smartGet("/search", { part: "snippet", q: query, maxResults: 8 }, SEARCH_KEYS);

export const getVideoById = (id) =>
  smartGet("/videos", { part: "snippet,statistics", id }, VIDEO_KEYS);

export const getRelatedVideos = (query, pageToken = "") =>
  smartGet("/search", { part: "snippet", q: query, type: "video", maxResults: 15, pageToken }, VIDEO_KEYS);

export const getChannelDetails = (channelId) =>
  smartGet("/channels", { part: "snippet,statistics,brandingSettings", id: channelId }, VIDEO_KEYS);

export const getChannelVideos = (channelId, pageToken = "", eventType = "") =>
  smartGet("/search", { part: "snippet", channelId, type: "video", maxResults: 20, order: "date", pageToken, ...(eventType && { eventType }) }, VIDEO_KEYS);

export const getChannelPlaylists = (channelId) =>
  smartGet("/playlists", { part: "snippet,contentDetails", channelId, maxResults: 20 }, VIDEO_KEYS);

export const getPlaylistVideos = (playlistId) =>
  smartGet("/playlistItems", { part: "snippet", playlistId, maxResults: 20 }, VIDEO_KEYS);
