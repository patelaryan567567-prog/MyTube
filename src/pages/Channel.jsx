import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getChannelDetails, getChannelVideos, getChannelLive, getChannelPlaylists } from "../api/youtube";
import VideoCard from "../components/VideoCard";
import { useAuth } from "../context/AuthContext";

const TABS = ["Home", "Videos", "Live", "Playlists"];

function HorizontalSection({ title, items }) {
  if (!items?.length) return null;
  return (
    <div style={sec.wrap}>
      <h3 style={sec.title}>{title}</h3>
      <div style={sec.row}>
        {items.map((v, i) => v.snippet && (
          <div key={`${v.id?.videoId || i}`} style={sec.card}>
            <VideoCard video={v} />
          </div>
        ))}
      </div>
    </div>
  );
}

const sec = {
  wrap: { padding: "16px 24px 0" },
  title: { fontSize: 17, fontWeight: 600, marginBottom: 12, color: "var(--text)" },
  row: { display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16, scrollbarWidth: "thin" },
  card: { flexShrink: 0, width: 280 },
};

// Remount the page whenever the channel changes so all tab state starts fresh.
export default function ChannelPage() {
  const { id } = useParams();
  return <Channel key={id} id={id} />;
}

function Channel({ id }) {
  const navigate = useNavigate();
  const { user, toggleSubscription, isSubscribed } = useAuth();
  const [channel, setChannel] = useState(null);
  const [activeTab, setActiveTab] = useState("Home");
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const [homeVideos, setHomeVideos] = useState([]);
  const [homeLive, setHomeLive] = useState([]);
  const [homePlaylists, setHomePlaylists] = useState([]);
  const [videos, setVideos] = useState([]);
  const [liveVideos, setLiveVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef(null);
  const bottomRef = useRef(null);
  const nextPageTokenRef = useRef("");
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const cRes = await getChannelDetails(id);
        setChannel(cRes.data.items?.[0] || null);
        const [vRes, lRes, pRes] = await Promise.allSettled([
          getChannelVideos(id, ""),
          getChannelLive(id, ""),
          getChannelPlaylists(id),
        ]);
        if (vRes.status === "fulfilled") setHomeVideos(vRes.value.data.items.slice(0, 8));
        if (lRes.status === "fulfilled") setHomeLive(lRes.value.data.items.slice(0, 8));
        if (pRes.status === "fulfilled") setHomePlaylists(pRes.value.data.items.slice(0, 8));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    init();
  }, [id]);

  const fetchTabData = useCallback(async (pageToken = "", reset = false) => {
    if (reset) setTabLoading(true); else setLoadingMore(true);
    try {
      let token = "";

      if (activeTab === "Videos") {
        const res = await getChannelVideos(id, pageToken);
        const items = res.data.items.filter((v) => v.snippet);
        token = res.data.nextPageToken || "";
        if (reset) setVideos(items); else setVideos((p) => [...p, ...items]);

      } else if (activeTab === "Live") {
        const res = await getChannelLive(id, pageToken);
        const items = res.data.items.filter((v) => v.snippet);
        token = res.data.nextPageToken || "";
        if (reset) setLiveVideos(items); else setLiveVideos((p) => [...p, ...items]);

      } else if (activeTab === "Playlists") {
        const res = await getChannelPlaylists(id);
        setPlaylists(res.data.items.filter((v) => v.snippet));
      }

      nextPageTokenRef.current = token;
    } catch (err) { console.error(err); }
    if (reset) setTabLoading(false);
    else { setLoadingMore(false); loadingMoreRef.current = false; }
  }, [id, activeTab]);

  useEffect(() => {
    nextPageTokenRef.current = "";
    loadingMoreRef.current = false;
    if (activeTab !== "Home") fetchTabData("", true);
  }, [activeTab, fetchTabData]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (
        entries[0].isIntersecting &&
        nextPageTokenRef.current &&
        !loadingMoreRef.current &&
        activeTab !== "Home" &&
        activeTab !== "Playlists"
      ) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
        fetchTabData(nextPageTokenRef.current);
      }
    });
    if (bottomRef.current) observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [fetchTabData, activeTab]);

  if (loading) return <div className="page-content"><p style={styles.msg}>Loading…</p></div>;
  if (!channel) return <div className="page-content"><p style={styles.msg}>Channel not found.</p></div>;

  const { snippet, statistics } = channel;
  const bannerUrl = channel.brandingSettings?.image?.bannerExternalUrl;

  const PlaylistCard = ({ p }) => (
    <div style={styles.playlistCard} onClick={() => navigate(`/playlist/${p.id}`)}>
      <img src={p.snippet.thumbnails?.medium?.url} alt="" style={styles.playlistThumb} />
      <p style={styles.playlistTitle}>{p.snippet.title}</p>
      <p style={styles.playlistCount}>{p.contentDetails?.itemCount} videos</p>
    </div>
  );

  const renderContent = () => {
    if (tabLoading) return <p style={styles.msg}>Loading…</p>;

    if (activeTab === "Home") return (
      <div>
        {homeLive.length > 0 && <HorizontalSection title="Live" items={homeLive} />}
        <HorizontalSection title="Latest videos" items={homeVideos} />
        {homePlaylists.length > 0 && (
          <div style={sec.wrap}>
            <h3 style={sec.title}>Playlists</h3>
            <div style={sec.row}>
              {homePlaylists.map((p) => <PlaylistCard key={p.id} p={p} />)}
            </div>
          </div>
        )}
      </div>
    );

    if (activeTab === "Playlists") return (
      <div style={styles.playlistGrid}>
        {playlists.length === 0
          ? <p style={styles.msg}>This channel has no playlists.</p>
          : playlists.map((p) => <PlaylistCard key={p.id} p={p} />)}
      </div>
    );

    const data = activeTab === "Videos" ? videos : liveVideos;
    return (
      <div className="video-grid">
        {data.length === 0
          ? <p style={styles.msg}>Nothing to show in {activeTab} yet.</p>
          : data.map((v, i) => <VideoCard key={`${v.id?.videoId}-${i}`} video={v} />)
        }
      </div>
    );
  };

  const subscribed = isSubscribed(id);

  return (
    <div className="page-content">
      <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>

      <div style={styles.bannerWrap}>
        {bannerUrl ? <img src={bannerUrl} style={styles.bannerImg} alt="" /> : <div style={styles.bannerPlaceholder} />}
      </div>

      <div className="channel-info">
        <img src={snippet.thumbnails?.medium?.url} alt={snippet.title} style={styles.avatar} />
        <div style={styles.meta}>
          <h1 style={styles.name}>{snippet.title}</h1>
          <p style={styles.stats}>
            {snippet.customUrl && <span>{snippet.customUrl} &nbsp;•&nbsp;</span>}
            {Number(statistics?.subscriberCount).toLocaleString()} subscribers &nbsp;•&nbsp;
            {Number(statistics?.videoCount).toLocaleString()} videos
          </p>
          <p style={styles.desc}>
            {showFullDesc ? snippet.description : snippet.description?.slice(0, 120)}
            {snippet.description?.length > 120 && (
              <span style={styles.more} onClick={() => setShowFullDesc(!showFullDesc)}>
                {showFullDesc ? " Show less" : " …more"}
              </span>
            )}
          </p>
          <button
            onClick={() => {
              if (!user) return alert("Please sign in to subscribe.");
              toggleSubscription({
                id,
                name: snippet.title,
                avatar: snippet.thumbnails?.medium?.url,
                subs: `${Number(statistics?.subscriberCount).toLocaleString()} subscribers`,
              });
            }}
            style={{ ...styles.subBtn, background: subscribed ? "#555" : "var(--text)", color: subscribed ? "#fff" : "var(--bg)" }}
          >
            {subscribed ? "✓ Subscribed" : "Subscribe"}
          </button>
        </div>
      </div>

      <div style={styles.tabs}>
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.activeTab : {}) }}>
            {tab}
          </button>
        ))}
      </div>

      {renderContent()}

      <div ref={bottomRef} style={{ padding: 20, textAlign: "center" }}>
        {loadingMore && <p style={styles.msg}>Loading more…</p>}
      </div>
    </div>
  );
}

const styles = {
  backBtn: { background: "none", border: "none", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", padding: "12px 20px", display: "block" },
  bannerWrap: { width: "100%", height: 200, overflow: "hidden" },
  bannerImg: { width: "100%", height: "100%", objectFit: "cover" },
  bannerPlaceholder: { width: "100%", height: "100%", background: "var(--card-bg)" },
  avatar: { width: 90, height: 90, borderRadius: "50%", flexShrink: 0 },
  meta: { flex: 1 },
  name: { fontSize: 24, fontWeight: 600, marginBottom: 6, color: "var(--text)" },
  stats: { fontSize: 13, color: "var(--text-muted)", marginBottom: 6 },
  desc: { fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 12 },
  more: { color: "#3ea6ff", cursor: "pointer", fontWeight: 600 },
  subBtn: { padding: "8px 20px", borderRadius: 20, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  tabs: { display: "flex", gap: 0, padding: "0 20px", borderBottom: "1px solid var(--border)", overflowX: "auto" },
  tab: { background: "none", border: "none", borderBottom: "2px solid transparent", color: "var(--text-muted)", padding: "12px 18px", cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" },
  activeTab: { color: "var(--text)", borderBottom: "2px solid var(--text)", fontWeight: 600 },
  playlistGrid: { display: "flex", flexWrap: "wrap", gap: 16, padding: 24 },
  playlistCard: { width: 200, cursor: "pointer", flexShrink: 0 },
  playlistThumb: { width: "100%", height: 112, objectFit: "cover", borderRadius: 8 },
  playlistTitle: { fontSize: 13, fontWeight: 600, marginTop: 6, color: "var(--text)" },
  playlistCount: { fontSize: 12, color: "var(--text-muted)" },
  msg: { textAlign: "center", marginTop: 40, color: "var(--text-muted)" },
};
