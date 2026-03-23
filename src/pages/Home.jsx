import { useEffect, useState, useRef, useCallback } from "react";
import { getTrending, getVideosByCategory, getShorts, getShortsByIds } from "../api/youtube";
import VideoCard from "../components/VideoCard";
import CategoryBar from "../components/CategoryBar";
import { useNavigate } from "react-router-dom";

const toSecs = (iso) => {
  if (!iso) return 999;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 999;
  return (parseInt(m[1]||0)*3600)+(parseInt(m[2]||0)*60)+parseInt(m[3]||0);
};

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

  // Fetch shorts separately
  useEffect(() => {
    (async () => {
      try {
        const res = await getShorts("");
        const ids = (res.data.items || []).map((v) => v.id?.videoId).filter(Boolean);
        if (!ids.length) return;
        const details = await getShortsByIds(ids);
        const filtered = (details.data.items || []).filter((v) => toSecs(v.contentDetails?.duration) <= 60);
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

  useEffect(() => { fetchVideos("", true); }, []);

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
        <p style={s.msg}>Loading...</p>
      ) : (
        <>
          {/* Shorts Section */}
          {shorts.length > 0 && (
            <div style={s.shortsWrap}>
              <p style={s.shortsTitle}>⚡ Shorts</p>
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
            {loadingMore && <p style={s.msg}>Loading more...</p>}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  msg: { textAlign: "center", marginTop: 40, color: "#aaa" },
  bottom: { marginTop: 20, textAlign: "center" },
  shortsWrap: { padding: "12px 20px 0" },
  shortsTitle: { fontSize: 16, fontWeight: "bold", color: "var(--text)", marginBottom: 10 },
  shortsRow: { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "thin" },
  shortCard: { flexShrink: 0, width: 120, cursor: "pointer" },
  shortThumb: { width: 120, height: 200, objectFit: "cover", borderRadius: 10, display: "block" },
  shortTitle: { fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.3 },
};
