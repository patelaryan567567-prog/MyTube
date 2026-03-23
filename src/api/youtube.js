import axios from "axios";

const API_KEY = import.meta.env.VITE_YT_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

const api = axios.create({ baseURL: BASE_URL });

const cache = {};
const cachedGet = async (url, params) => {
  const key = url + JSON.stringify(params);
  if (cache[key]) return cache[key];
  const res = await api.get(url, { params });
  cache[key] = res;
  return res;
};

export const getTrending = () =>
  cachedGet("/videos", { part: "snippet,statistics", chart: "mostPopular", maxResults: 20, regionCode: "IN", key: API_KEY });

export const searchVideos = (query) =>
  cachedGet("/search", { part: "snippet", q: query, maxResults: 20, key: API_KEY });

export const getVideoById = (id) =>
  cachedGet("/videos", { part: "snippet,statistics", id, key: API_KEY });

export const getRelatedVideos = (query) =>
  cachedGet("/search", { part: "snippet", q: query, type: "video", maxResults: 15, key: API_KEY });

export const getChannelDetails = (channelId) =>
  cachedGet("/channels", { part: "snippet,statistics", id: channelId, key: API_KEY });

export const getVideosByCategory = (categoryId) =>
  cachedGet("/videos", { part: "snippet,statistics", chart: "mostPopular", videoCategoryId: categoryId, maxResults: 20, regionCode: "IN", key: API_KEY });

export const getChannelVideos = (channelId) =>
  cachedGet("/search", { part: "snippet", channelId, type: "video", maxResults: 20, order: "date", key: API_KEY });
