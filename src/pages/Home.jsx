import { useEffect, useState, useRef, useCallback } from "react";
import { getTrending, getVideosByCategory } from "../api/youtube";
import VideoCard from "../components/VideoCard";
import CategoryBar from "../components/CategoryBar";

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const categoryRef = useRef("0");
  const nextTokenRef = useRef("");
  const loadingRef = useRef(false);
  const observerRef = useRef(null);
  const bottomRef = useRef(null);

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
    <div>
      <CategoryBar onSelect={handleCategorySelect} />
      {loading ? (
        <p style={styles.msg}>Loading...</p>
      ) : (
        <>
          <div className="video-grid">
            {videos.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
          <div ref={bottomRef} style={styles.bottom}>
            {loadingMore && <p style={styles.msg}>Loading more...</p>}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  msg: { textAlign: "center", marginTop: 40, color: "#aaa" },
  bottom: { marginTop: 20, textAlign: "center" },
};
