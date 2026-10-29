import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { searchVideos } from "../api/youtube";
import VideoCard from "../components/VideoCard";
import ChannelCard from "../components/ChannelCard";

export default function Search() {
  const [params] = useSearchParams();
  const query = params.get("q");
  const [videos, setVideos] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(Boolean(query));
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef(null);
  const bottomRef = useRef(null);
  const nextTokenRef = useRef("");
  const loadingRef = useRef(false);

  const fetchVideos = useCallback(async (pageToken = "", reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await searchVideos(query, pageToken);
      const items = res.data.items || [];
      if (reset) {
        setChannels(items.filter((i) => i.id?.kind === "youtube#channel"));
        setVideos(items.filter((i) => i.id?.kind === "youtube#video"));
      } else {
        setVideos((prev) => [...prev, ...items.filter((i) => i.id?.kind === "youtube#video")]);
      }
      nextTokenRef.current = res.data.nextPageToken || "";
    } catch (err) { console.error(err); }
    finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [query]);

  useEffect(() => {
    nextTokenRef.current = "";
    loadingRef.current = false;
    if (query) fetchVideos("", true);
  }, [query, fetchVideos]);

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

  if (!query) return <div className="page-content"><p style={styles.msg}>Type something in the search bar to get started.</p></div>;
  if (loading) return <div className="page-content"><p style={styles.msg}>Searching…</p></div>;

  return (
    <div className="page-content" style={styles.container}>
      <p style={styles.heading}>
        Results for <span style={styles.query}>{query}</span>
      </p>
      {channels.length > 0 && (
        <div style={styles.section}>
          {channels.map((c) => <ChannelCard key={c.id?.channelId} channel={c} />)}
        </div>
      )}
      {videos.length === 0 && channels.length === 0 && (
        <p style={styles.msg}>No results found. Try different keywords.</p>
      )}
      <div className="video-grid">
        {videos.map((v, i) => <VideoCard key={`${v.id?.videoId}-${i}`} video={v} />)}
      </div>
      <div ref={bottomRef} style={styles.bottom}>
        {loadingMore && <p style={styles.msg}>Loading more…</p>}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 16 },
  heading: { color: "var(--text-muted)", marginBottom: 16, fontSize: 15 },
  query: { color: "var(--text)", fontWeight: 600 },
  section: { marginBottom: 20 },
  bottom: { marginTop: 20, textAlign: "center" },
  msg: { color: "var(--text-muted)", textAlign: "center", marginTop: 40 },
};
