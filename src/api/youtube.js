import axios from "axios";

const BASE_URL = "https://www.googleapis.com/youtube/v3";
const api = axios.create({ baseURL: BASE_URL });

const ALL_KEYS = [
  import.meta.env.VITE_API_HOME,
  import.meta.env.VITE_API_SEARCH,
  import.meta.env.VITE_API_VIDEO,
  import.meta.env.VITE_API_EXTRA,
  import.meta.env.VITE_API_EXTRA2,
  import.meta.env.VITE_API_EXTRA3,
  import.meta.env.VITE_API_EXTRA4,
  import.meta.env.VITE_API_EXTRA5,
  import.meta.env.VITE_API_EXTRA6,
  import.meta.env.VITE_API_EXTRA7,
].filter(Boolean);

const HOME_KEYS   = [import.meta.env.VITE_API_HOME,   ...ALL_KEYS.filter(k => k !== import.meta.env.VITE_API_HOME)];
const SEARCH_KEYS = [import.meta.env.VITE_API_SEARCH, ...ALL_KEYS.filter(k => k !== import.meta.env.VITE_API_SEARCH)];
const VIDEO_KEYS  = [import.meta.env.VITE_API_VIDEO,  ...ALL_KEYS.filter(k => k !== import.meta.env.VITE_API_VIDEO)];

const cache = {};
const smartGet = async (url, params, keys) => {
  const cacheKey = url + JSON.stringify(params);
  if (!params.pageToken && cache[cacheKey]) return cache[cacheKey];
  for (const key of keys) {
    try {
      const res = await api.get(url, { params: { ...params, key } });
      if (!params.pageToken) cache[cacheKey] = res;
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

export const getTrending = (pageToken = "") =>
  smartGet("/videos", { part: "snippet,statistics,contentDetails", chart: "mostPopular", maxResults: 20, regionCode: "IN", pageToken }, HOME_KEYS);

export const getVideosByCategory = (categoryId, pageToken = "") =>
  smartGet("/videos", { part: "snippet,statistics,contentDetails", chart: "mostPopular", videoCategoryId: categoryId, maxResults: 20, regionCode: "IN", pageToken }, HOME_KEYS);

export const searchVideos = (query, pageToken = "") =>
  smartGet("/search", { part: "snippet", q: query, maxResults: 20, pageToken }, SEARCH_KEYS);

export const getSearchSuggestions = (query) =>
  smartGet("/search", { part: "snippet", q: query, maxResults: 8 }, SEARCH_KEYS);

export const getVideoById = (id) =>
  smartGet("/videos", { part: "snippet,statistics,contentDetails", id }, VIDEO_KEYS);

export const getVideoDurations = (ids) =>
  smartGet("/videos", { part: "contentDetails", id: ids.join(","), maxResults: 50 }, VIDEO_KEYS);

export const getTrendingByCountry = (regionCode = "IN", pageToken = "") =>
  smartGet("/videos", { part: "snippet,statistics", chart: "mostPopular", maxResults: 20, regionCode, pageToken }, HOME_KEYS);

export const getRelatedVideos = (query, pageToken = "") =>
  smartGet("/search", { part: "snippet", q: query, type: "video", maxResults: 15, pageToken }, VIDEO_KEYS);

export const getChannelDetails = (channelId) =>
  smartGet("/channels", { part: "snippet,statistics,brandingSettings,contentDetails", id: channelId }, VIDEO_KEYS);

export const getChannelVideos = async (channelId, pageToken = "") => {
  try {
    const cKey = "uploads_" + channelId;
    let uploadsId = cache[cKey];
    if (!uploadsId) {
      const cRes = await smartGet("/channels", { part: "contentDetails", id: channelId }, VIDEO_KEYS);
      uploadsId = cRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsId) return { data: { items: [], nextPageToken: "" } };
      cache[cKey] = uploadsId;
    }
    const res = await smartGet("/playlistItems", {
      part: "snippet", playlistId: uploadsId, maxResults: 20, pageToken
    }, VIDEO_KEYS);
    const items = (res.data.items || []).filter(i => i.snippet?.resourceId?.videoId).map((item) => ({
      id: { videoId: item.snippet.resourceId.videoId },
      snippet: { ...item.snippet, thumbnails: item.snippet.thumbnails },
    }));
    return { data: { items, nextPageToken: res.data.nextPageToken || "" } };
  } catch (err) {
    console.error("getChannelVideos error:", err?.response?.data?.error?.message || err.message);
    return { data: { items: [], nextPageToken: "" } };
  }
};

export const getChannelLive = async (channelId, pageToken = "") => {
  const [liveRes, completedRes] = await Promise.allSettled([
    smartGet("/search", { part: "snippet", channelId, type: "video", maxResults: 5, eventType: "live" }, VIDEO_KEYS),
    smartGet("/search", { part: "snippet", channelId, type: "video", maxResults: 20, eventType: "completed", pageToken }, VIDEO_KEYS),
  ]);
  const liveItems = liveRes.status === "fulfilled" ? liveRes.value.data.items.map(v => ({ ...v, isLive: true })) : [];
  const completedItems = completedRes.status === "fulfilled" ? completedRes.value.data.items : [];
  const nextPageToken = completedRes.status === "fulfilled" ? completedRes.value.data.nextPageToken : "";
  return { data: { items: [...liveItems, ...completedItems], nextPageToken } };
};

export const getChannelPlaylists = (channelId) =>
  smartGet("/playlists", { part: "snippet,contentDetails", channelId, maxResults: 20 }, VIDEO_KEYS);

export const getPlaylistVideos = (playlistId) =>
  smartGet("/playlistItems", { part: "snippet", playlistId, maxResults: 20 }, VIDEO_KEYS);

export const getVideoComments = (videoId, pageToken = "") =>
  smartGet("/commentThreads", { part: "snippet", videoId, maxResults: 20, order: "relevance", pageToken }, VIDEO_KEYS);

const SHORTS_QUERIES = [
  "#shorts funny", "#shorts dance", "#shorts cooking", "#shorts gaming",
  "#shorts travel", "#shorts music", "#shorts comedy", "#shorts diy",
  "#shorts animals", "#shorts sports", "#shorts tech", "#shorts art",
  "#shorts food", "#shorts fitness", "#shorts nature", "#shorts viral",
];

export const getShorts = (pageToken = "") => {
  const q = SHORTS_QUERIES[Math.floor(Math.random() * SHORTS_QUERIES.length)];
  return smartGet("/search", { part: "snippet", q, type: "video", videoDuration: "short", maxResults: 20, regionCode: "IN", pageToken }, SEARCH_KEYS);
};

export const getShortsByIds = (ids) =>
  smartGet("/videos", { part: "snippet,statistics,contentDetails", id: ids.join(",") }, VIDEO_KEYS);
