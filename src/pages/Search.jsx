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
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState("");
  const observerRef = useRef(null);
  const bottomRef = useRef(null);
  const nextTokenRef = useRef("");
  const loadingRef = useRef(false);

  const fetchVideos = useCallback(async (pageToken = "", reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await searchVideos(query, pageToken);
      const items = res.data.items;
      if (reset) {
        setChannels(items.filter((i) => i.id?.kind === "youtube#channel"));
        setVideos(items.filter((i) => i.id?.kind === "youtube#video"));
      } else {
        setVideos((prev) => [...prev, ...items.filter((i) => i.id?.kind === "youtube#video")]);
      }
      const token = res.data.nextPageToken || "";
      setNextPageToken(token);
      nextTokenRef.current = token;
    } catch (err) { console.error(err); }
    if (reset) setLoading(false);
    else { setLoadingMore(false); loadingRef.current = false; }
  }, [query]);

  useEffect(() => {
    nextTokenRef.current = "";
    loadingRef.current = false;
    if (query) fetchVideos("", true);
  }, [query]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextTokenRef.current && !loadingRef.current) {
        loadingRef.current = true;
        fetchVideos(nextTokenRef.current);
      }
    });
    if (bottomRef.current) observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [fetchVideos]);

  if (loading) return <p style={styles.msg}>Searching...</p>;

  return (
    <div style={styles.container}>
      <p style={styles.heading}>
        Results for: <span style={{ color: "#fff" }}>{query}</span>
      </p>
      {channels.length > 0 && (
        <div style={styles.section}>
          {channels.map((c) => <ChannelCard key={c.id?.channelId} channel={c} />)}
        </div>
      )}
      <div className="video-grid">
        {videos.map((v, i) => <VideoCard key={`${v.id?.videoId}-${i}`} video={v} />)}
      </div>
      <div ref={bottomRef} style={styles.bottom}>
        {loadingMore && <p style={styles.msg}>Loading more...</p>}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 16 },
  heading: { color: "#aaa", marginBottom: 16, fontSize: 15 },
  section: { marginBottom: 20 },
  bottom: { marginTop: 20, textAlign: "center" },
  msg: { color: "#aaa", textAlign: "center", marginTop: 40 },
};
