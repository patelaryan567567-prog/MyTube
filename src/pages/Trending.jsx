import { useEffect, useState, useRef, useCallback } from "react";
import { getTrendingByCountry } from "../api/youtube";
import VideoCard from "../components/VideoCard";

const COUNTRIES = [
  { code: "IN", name: "🇮🇳 India" },
  { code: "US", name: "🇺🇸 USA" },
  { code: "GB", name: "🇬🇧 UK" },
  { code: "JP", name: "🇯🇵 Japan" },
  { code: "KR", name: "🇰🇷 Korea" },
  { code: "BR", name: "🇧🇷 Brazil" },
  { code: "DE", name: "🇩🇪 Germany" },
  { code: "FR", name: "🇫🇷 France" },
];

export default function Trending() {
  const [videos, setVideos]       = useState([]);
  const [country, setCountry]     = useState("IN");
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextTokenRef  = useRef("");
  const loadingRef    = useRef(false);
  const observerRef   = useRef(null);
  const bottomRef     = useRef(null);

  const fetchVideos = useCallback(async (pageToken = "", reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await getTrendingByCountry(country, pageToken);
      const items = res.data.items || [];
      if (reset) setVideos(items); else setVideos((p) => [...p, ...items]);
      nextTokenRef.current = res.data.nextPageToken || "";
    } catch (err) { console.error(err); }
    finally {
      if (reset) setLoading(false); else setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [country]);

  useEffect(() => { nextTokenRef.current = ""; fetchVideos("", true); }, [fetchVideos]);

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
    <div>
      <div style={s.header}>
        <h2 style={s.heading}>🔥 Trending</h2>
        <div style={s.countryBar}>
          {COUNTRIES.map((c) => (
            <button key={c.code} onClick={() => setCountry(c.code)}
              style={{ ...s.countryBtn, ...(country === c.code ? s.activeBtn : {}) }}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      {loading ? <p style={s.msg}>Loading...</p> : (
        <>
          <div className="video-grid">
            {videos.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
          <div ref={bottomRef} style={{ textAlign: "center", padding: 20 }}>
            {loadingMore && <p style={s.msg}>Loading more...</p>}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  header: { padding: "16px 20px 0" },
  heading: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 12 },
  countryBar: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" },
  countryBtn: { padding: "6px 14px", borderRadius: 20, border: "none", background: "#272727", color: "#fff", cursor: "pointer", whiteSpace: "nowrap", fontSize: 13 },
  activeBtn: { background: "#fff", color: "#000" },
  msg: { textAlign: "center", marginTop: 40, color: "#aaa" },
};
