import { useEffect, useState, useRef, useCallback } from "react";
import { getTrending, getVideosByCategory, getShorts, getShortsByIds } from "../api/youtube";
import VideoCard from "../components/VideoCard";
import CategoryBar from "../components/CategoryBar";
import { useNavigate } from "react-router-dom";
import { toSeconds } from "../utils/duration";
import { useAuth } from "../context/AuthContext";
import useSubscriptionFeed from "../hooks/useSubscriptionFeed";
import ImageWithSkeleton from "../components/ImageWithSkeleton";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";

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
  const [videos, setVideos]           = useState([]);
  const [shorts, setShorts]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const categoryRef   = useRef("0");
  const nextTokenRef  = useRef("");
  const loadingRef    = useRef(false);
  const observerRef   = useRef(null);
  const bottomRef     = useRef(null);
  const shortsRowRef  = useRef(null);
  const navigate      = useNavigate();
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

  const scrollShorts = (dir) => {
    shortsRowRef.current?.scrollBy({ left: dir * 520, behavior: "smooth" });
  };

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
              <div style={s.shortsHeader}>
                <h3 style={s.shortsTitle}>Shorts</h3>
                <div style={s.shortsNav}>
                  <button style={s.arrowBtn} onClick={() => scrollShorts(-1)} aria-label="Scroll Shorts left">
                    <MdChevronLeft size={20} />
                  </button>
                  <button style={s.arrowBtn} onClick={() => scrollShorts(1)} aria-label="Scroll Shorts right">
                    <MdChevronRight size={20} />
                  </button>
                </div>
              </div>
              <div ref={shortsRowRef} className="shorts-scroll" style={s.shortsRow}>
                {shorts.map((v) => {
                  const vid = v.id?.videoId || v.id;
                  return (
                    <div key={vid} className="video-card-item" style={s.shortCard} onClick={() => navigate(`/shorts/${vid}`)}>
                      <ImageWithSkeleton
                        src={v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url}
                        alt={v.snippet.title}
                        style={s.shortThumb}
                      />
                      <p style={s.shortTitle}>{v.snippet.title?.slice(0, 52)}</p>
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
  feedWrap: { padding: "12px 24px 0", maxWidth: 2200, margin: "0 auto" },
  feedTitle: { fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 4 },
  feedGrid: { padding: "8px 0 4px", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" },
  shortsWrap: { padding: "14px 24px 4px", maxWidth: 2200, margin: "0 auto" },
  shortsHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  shortsTitle: { fontSize: 18, fontWeight: 600, color: "var(--text)" },
  shortsNav: { display: "flex", gap: 6 },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "var(--hover-bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  shortsRow: { display: "flex", gap: 14, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" },
  shortCard: { flexShrink: 0, width: 156, cursor: "pointer" },
  shortThumb: { width: 156, height: 264, borderRadius: 12 },
  shortTitle: { fontSize: 12, fontWeight: 500, color: "var(--text)", marginTop: 6, lineHeight: 1.35 },
};
