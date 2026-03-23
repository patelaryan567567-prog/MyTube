import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getChannelDetails, getChannelVideos, getChannelPlaylists } from "../api/youtube";
import VideoCard from "../components/VideoCard";
import { useAuth } from "../context/AuthContext";

const TABS = ["Videos", "Playlists", "Live"];

export default function Channel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activeTab, setActiveTab] = useState("Videos");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const observerRef = useRef(null);
  const bottomRef = useRef(null);

  const fetchVideos = useCallback(async (pageToken = "", reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const type = activeTab === "Live" ? "live" : "video";
      const res = await getChannelVideos(id, pageToken, type);
      const items = res.data.items.filter((v) => v.snippet);
      if (reset) setVideos(items); else setVideos((prev) => [...prev, ...items]);
      setNextPageToken(res.data.nextPageToken || "");
    } catch (err) { console.error(err); }
    if (reset) setLoading(false); else setLoadingMore(false);
  }, [id, activeTab]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const cRes = await getChannelDetails(id);
        setChannel(cRes.data.items[0]);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    init();
  }, [id]);

  useEffect(() => {
    if (activeTab === "Playlists") {
      getChannelPlaylists(id).then((res) => setPlaylists(res.data.items)).catch(console.error);
    } else {
      fetchVideos("", true);
    }
  }, [activeTab, id]);

  // Infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextPageToken && !loadingMore) fetchVideos(nextPageToken);
    });
    if (bottomRef.current) observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [nextPageToken, loadingMore, fetchVideos]);

  if (!channel && loading) return <p style={styles.msg}>Loading...</p>;
  if (!channel) return <p style={styles.msg}>Channel not found</p>;

  const { snippet, statistics } = channel;
  const banner = snippet?.thumbnails?.maxres?.url || snippet?.thumbnails?.high?.url;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>

      {/* Banner */}
      <div style={styles.bannerWrap}>
        {banner && <img src={banner} style={styles.bannerImg} alt="" />}
      </div>

      {/* Channel Info */}
      <div style={styles.channelInfo}>
        <img src={snippet.thumbnails?.medium?.url} alt={snippet.title} style={styles.avatar} />
        <div style={styles.meta}>
          <div style={styles.nameRow}>
            <h1 style={styles.name}>{snippet.title}</h1>
          </div>
          <p style={styles.stats}>
            {snippet.customUrl && <span>{snippet.customUrl} &nbsp;•&nbsp;</span>}
            {Number(statistics?.subscriberCount).toLocaleString()} subscribers &nbsp;•&nbsp;
            {Number(statistics?.videoCount).toLocaleString()} videos
          </p>
          <p style={styles.desc}>
            {showFullDesc ? snippet.description : snippet.description?.slice(0, 120)}
            {snippet.description?.length > 120 && (
              <span style={styles.more} onClick={() => setShowFullDesc(!showFullDesc)}>
                {showFullDesc ? " ...less" : " ...more"}
              </span>
            )}
          </p>
          <button
            onClick={() => { if (!user) return alert("Subscribe karne ke liye login karo!"); setSubscribed(!subscribed); }}
            style={{ ...styles.subBtn, background: subscribed ? "#555" : "#fff", color: subscribed ? "#fff" : "#000" }}
          >
            {subscribed ? "Subscribed" : "Subscribe"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.activeTab : {}) }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <p style={styles.msg}>Loading...</p>
      ) : activeTab === "Playlists" ? (
        <div style={styles.grid}>
          {playlists.map((p) => (
            <div key={p.id} style={styles.playlistCard}>
              <img src={p.snippet.thumbnails?.medium?.url} alt="" style={styles.playlistThumb} />
              <p style={styles.playlistTitle}>{p.snippet.title}</p>
              <p style={styles.playlistCount}>{p.contentDetails?.itemCount} videos</p>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.grid}>
          {videos.map((v, i) => <VideoCard key={`${v.id?.videoId}-${i}`} video={v} />)}
        </div>
      )}

      <div ref={bottomRef} style={{ textAlign: "center", padding: 20 }}>
        {loadingMore && <p style={styles.msg}>Loading more...</p>}
      </div>
    </div>
  );
}

const styles = {
  backBtn: { background: "none", border: "none", color: "#aaa", fontSize: 14, cursor: "pointer", padding: "12px 20px", display: "block" },
  bannerWrap: { width: "100%", height: 200, background: "#1a1a1a", overflow: "hidden" },
  bannerImg: { width: "100%", height: "100%", objectFit: "cover" },
  channelInfo: { display: "flex", alignItems: "flex-start", gap: 20, padding: "20px 24px" },
  avatar: { width: 90, height: 90, borderRadius: "50%", flexShrink: 0 },
  meta: { flex: 1 },
  nameRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  name: { fontSize: 22, fontWeight: "bold" },
  stats: { fontSize: 13, color: "#aaa", marginBottom: 6 },
  desc: { fontSize: 13, color: "#ccc", lineHeight: 1.5, marginBottom: 12 },
  more: { color: "#3ea6ff", cursor: "pointer" },
  subBtn: { padding: "8px 20px", borderRadius: 20, border: "none", fontWeight: "bold", fontSize: 13, cursor: "pointer" },
  tabs: { display: "flex", gap: 4, padding: "0 20px", borderBottom: "1px solid #333" },
  tab: { background: "none", border: "none", color: "#aaa", padding: "12px 16px", cursor: "pointer", fontSize: 14, borderBottom: "2px solid transparent" },
  activeTab: { color: "#fff", borderBottom: "2px solid #fff" },
  grid: { display: "flex", flexWrap: "wrap", gap: 16, padding: 24 },
  playlistCard: { width: 220, cursor: "pointer" },
  playlistThumb: { width: "100%", height: 124, objectFit: "cover", borderRadius: 8 },
  playlistTitle: { fontSize: 13, fontWeight: "bold", marginTop: 6, color: "#fff" },
  playlistCount: { fontSize: 12, color: "#aaa" },
  msg: { textAlign: "center", marginTop: 40, color: "#aaa" },
};
