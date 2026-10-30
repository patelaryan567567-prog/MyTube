import { useEffect, useState, useRef, useCallback } from "react";
import { getTrending, getVideosByCategory, getShorts, getShortsByIds } from "../api/youtube";
import VideoCard from "../components/VideoCard";
import CategoryBar from "../components/CategoryBar";
import { useNavigate } from "react-router-dom";
import { toSeconds } from "../utils/duration";
import { useAuth } from "../context/AuthContext";
import useSubscriptionFeed from "../hooks/useSubscriptionFeed";

function FeedSection({ title, items }) {
  if (!items.length) return null;
  return (
    <div style={s.feedWrap}>
      <h3 style={s.feedTitle}>{title}</h3>
      <div className="video-grid" style={s.feedGrid}>
        {items.map((v) => <VideoCard key={v.id} video={v} />)}
      </div>
    </div>
  );
}

export default function Home() {
  const [videos, setVideos]       = useState([]);
  const [shorts, setShorts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const categoryRef  = useRef("0");
  const nextTokenRef = useRef("");
  const loadingRef   = useRef(false);
  const observerRef  = useRef(null);
  const bottomRef    = useRef(null);
  const navigate     = useNavigate();
  const { user, subscriptions } = useAuth();
  const { latest: latestFromSubs, popular: popularFromSubs } =
    useSubscriptionFeed(subscriptions, Boolean(user) && subscriptions.length > 0);

  // Fetch the Shorts shelf separately
  useEffect(() => {
    (async () => {
      try {
        const res = await getShorts("");
        const ids = (res.data.items || []).map((v) => v.id?.videoId).filter(Boolean);
        if (!ids.length) return;
        const details = await getShortsByIds(ids);
        const filtered = (details.data.items || []).filter((v) => toSeconds(v.contentDetails?.duration) <= 60);
        setShorts(filtered.slice(0, 16));
      } catch (e) { console.error(e); }
    })();
  }, []);

  const fetchVideos = useCallback(async (pageToken = "", reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const cat = categoryRef.current;
      const res = cat === "0" ? await getTrending(pageToken) : await getVideosByCategory(cat, pageToken);
      const items = res.data.items || [];
      if (reset) setVideos(items); else setVideos((prev) => [...prev, ...items]);
      nextTokenRef.current = res.data.nextPageToken || "";
    } catch (err) { console.error(err); }
    finally {
      if (reset) setLoading(false); else setLoadingMore(false);
      loadingRef.current = false;
    }
  }, []);

  const handleCategorySelect = (categoryId) => {
    categoryRef.current = categoryId;
    nextTokenRef.current = "";
    loadingRef.current = false;
    fetchVideos("", true);
  };

  useEffect(() => { fetchVideos("", true); }, [fetchVideos]);

  useEffect(() => {
    if (!bottomRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextTokenRef.current && !loadingRef.current) {
        loadingRef.current = true;
        fetchVideos(nextTokenRef.current);
      }
    }, { rootMargin: "200px" });
    observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [fetchVideos, videos]);

  return (
    <div className="page-content">
      <CategoryBar onSelect={handleCategorySelect} />
      {loading ? (
        <p style={s.msg}>Loading…</p>
      ) : (
        <>
          <FeedSection title="Latest from your subscriptions" items={latestFromSubs} />
          <FeedSection title="Popular with your subscriptions" items={popularFromSubs} />

          {shorts.length > 0 && (
            <div style={s.shortsWrap}>
              <h3 style={s.shortsTitle}>Shorts</h3>
              <div style={s.shortsRow}>
                {shorts.map((v) => {
                  const vid = v.id?.videoId || v.id;
                  return (
                    <div key={vid} style={s.shortCard} onClick={() => navigate(`/shorts/${vid}`)}>
                      <img
                        src={v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url}
                        alt={v.snippet.title}
                        style={s.shortThumb}
                      />
                      <p style={s.shortTitle}>{v.snippet.title?.slice(0, 50)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="video-grid">
            {videos.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
          <div ref={bottomRef} style={s.bottom}>
            {loadingMore && <p style={s.msg}>Loading more…</p>}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  msg: { textAlign: "center", marginTop: 40, color: "var(--text-muted)" },
  bottom: { marginTop: 20, textAlign: "center" },
  feedWrap: { padding: "12px 20px 0" },
  feedTitle: { fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 4 },
  feedGrid: { padding: "8px 0 4px", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" },
  shortsWrap: { padding: "12px 20px 0" },
  shortsTitle: { fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 10 },
  shortsRow: { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "thin" },
  shortCard: { flexShrink: 0, width: 120, cursor: "pointer" },
  shortThumb: { width: 120, height: 200, objectFit: "cover", borderRadius: 10, display: "block" },
  shortTitle: { fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.3 },
};
