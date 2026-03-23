import axios from "axios";

const API_KEY = import.meta.env.VITE_YT_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

const api = axios.create({ baseURL: BASE_URL });

export const getTrending = () =>
  api.get("/videos", {
    params: { part: "snippet,statistics", chart: "mostPopular", maxResults: 20, regionCode: "IN", key: API_KEY },
  });

export const searchVideos = (query) =>
  api.get("/search", {
    params: { part: "snippet", q: query, maxResults: 20, key: API_KEY },
  });

export const getChannelVideos = (channelId) =>
  api.get("/search", {
    params: { part: "snippet", channelId, type: "video", maxResults: 20, order: "date", key: API_KEY },
  });

export const getVideoById = (id) =>
  api.get("/videos", {
    params: { part: "snippet,statistics", id, key: API_KEY },
  });

export const getRelatedVideos = (query) =>
  api.get("/search", {
    params: { part: "snippet", q: query, type: "video", maxResults: 15, key: API_KEY },
  });

export const getChannelDetails = (channelId) =>
  api.get("/channels", {
    params: { part: "snippet,statistics", id: channelId, key: API_KEY },
  });

export const getVideosByCategory = (categoryId) =>
  api.get("/videos", {
    params: { part: "snippet,statistics", chart: "mostPopular", videoCategoryId: categoryId, maxResults: 20, regionCode: "IN", key: API_KEY },
  });
