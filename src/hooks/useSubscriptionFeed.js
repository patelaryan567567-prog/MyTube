import { useEffect, useState } from "react";
import { getChannelUploads, getVideosByIds } from "../api/youtube";
import { toSeconds } from "../utils/duration";

const MAX_CHANNELS   = 30;          // channels sampled from the user's subscriptions
const PER_CHANNEL    = 6;           // recent uploads read per channel
const SECTION_SIZE   = 8;           // videos shown in each Home section
const PER_CHANNEL_CAP = 2;          // keeps one busy channel from filling a section
const POPULAR_DAYS   = 30;          // "popular" looks at the last 30 days
const CACHE_KEY      = "mytube_subfeed";
const CACHE_MS       = 15 * 60 * 1000;
const DAY_MS         = 24 * 60 * 60 * 1000;

const EMPTY = { latest: [], popular: [] };

// Keep only what the video cards need so the cache stays small.
const slim = (v) => ({
  id: v.id,
  snippet: {
    title: v.snippet?.title,
    channelId: v.snippet?.channelId,
    channelTitle: v.snippet?.channelTitle,
    publishedAt: v.snippet?.publishedAt,
    thumbnails: { medium: v.snippet?.thumbnails?.medium },
  },
  statistics: { viewCount: v.statistics?.viewCount },
  contentDetails: { duration: v.contentDetails?.duration },
});

const pick = (list, size) => {
  const perChannel = {};
  const out = [];
  for (const v of list) {
    const ch = v.snippet.channelId;
    if ((perChannel[ch] || 0) >= PER_CHANNEL_CAP) continue;
    perChannel[ch] = (perChannel[ch] || 0) + 1;
    out.push(v);
    if (out.length === size) break;
  }
  return out;
};

const readCache = (idsKey) => {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY));
    if (c && c.idsKey === idsKey && Date.now() - c.ts < CACHE_MS) return c;
  } catch { /* ignore */ }
  return null;
};

/**
 * Builds the Home feed from the user's subscriptions:
 * the newest uploads and the most-viewed recent uploads.
 */
export default function useSubscriptionFeed(subscriptions, enabled) {
  const [feed, setFeed] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const channelIds = subscriptions
    .map((c) => c.id)
    .filter((id) => typeof id === "string" && id.startsWith("UC"))
    .slice(0, MAX_CHANNELS);
  const idsKey = channelIds.join(",");

  useEffect(() => {
    if (!enabled || !idsKey) return;
    let cancelled = false;

    const run = async () => {
      const cached = readCache(idsKey);
      if (cached) { setFeed({ latest: cached.latest, popular: cached.popular }); return; }

      setLoading(true);
      try {
        const results = await Promise.allSettled(idsKey.split(",").map((id) => getChannelUploads(id, PER_CHANNEL)));
        const videoIds = new Set();
        results.forEach((r) => {
          if (r.status !== "fulfilled") return;
          (r.value.data.items || []).forEach((it) => {
            if (it.contentDetails?.videoId) videoIds.add(it.contentDetails.videoId);
          });
        });
        if (!videoIds.size) { if (!cancelled) setFeed(EMPTY); return; }

        const details = (await getVideosByIds([...videoIds]))
          // Shorts and live/upcoming streams are left out of these sections.
          .filter((v) => toSeconds(v.contentDetails?.duration) > 60)
          .map(slim);

        const byDate = [...details].sort((a, b) => Date.parse(b.snippet.publishedAt) - Date.parse(a.snippet.publishedAt));
        const latest = pick(byDate, SECTION_SIZE);
        const latestIds = new Set(latest.map((v) => v.id));

        const cutoff = Date.now() - POPULAR_DAYS * DAY_MS;
        const recent = byDate.filter((v) => Date.parse(v.snippet.publishedAt) >= cutoff && !latestIds.has(v.id));
        const pool = recent.length >= SECTION_SIZE ? recent : byDate.filter((v) => !latestIds.has(v.id));
        const popular = pick(
          [...pool].sort((a, b) => Number(b.statistics.viewCount || 0) - Number(a.statistics.viewCount || 0)),
          SECTION_SIZE
        );

        if (cancelled) return;
        setFeed({ latest, popular });
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ idsKey, ts: Date.now(), latest, popular })); } catch { /* ignore */ }
      } catch (err) {
        console.error("Could not build the subscription feed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [enabled, idsKey]);

  const active = enabled && Boolean(idsKey);
  return { latest: active ? feed.latest : [], popular: active ? feed.popular : [], loading: active && loading };
}
