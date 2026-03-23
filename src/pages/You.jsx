import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AiOutlineClockCircle } from "react-icons/ai";
import { MdThumbUp } from "react-icons/md";

const TABS = ["Watch Later", "Liked Videos"];

export default function You() {
  const { user, watchLater, likedVideos, toggleWatchLater, toggleLiked } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Watch Later");

  if (!user) return (
    <div className="page-content" style={s.center}>
      <div style={s.loginBox}>
        <p style={s.loginTitle}>Sign in to see your content</p>
        <p style={s.loginSub}>Liked videos and watch later will appear here.</p>
      </div>
    </div>
  );

  const renderVideoList = (items, onRemove, removeLabel) => (
    items.length === 0
      ? <p style={s.empty}>Nothing here yet.</p>
      : <div style={s.list}>
          {items.map((v) => (
            <div key={v.id} style={s.item}>
              <div style={s.thumbWrap} onClick={() => navigate(`/watch/${v.id}`)}>
                <img src={v.thumb} alt={v.title} style={s.thumb} />
                {v.duration && <span style={s.dur}>{v.duration}</span>}
              </div>
              <div style={s.info}>
                <p style={s.title} onClick={() => navigate(`/watch/${v.id}`)}>{v.title}</p>
                <p style={s.channel}>{v.channel}</p>
              </div>
              <button style={s.removeBtn} onClick={() => onRemove(v)}>{removeLabel}</button>
            </div>
          ))}
        </div>
  );

  return (
    <div className="page-content" style={s.wrap}>
      {/* User header */}
      <div style={s.header}>
        <img src={user.picture} alt={user.name} style={s.avatar} />
        <div>
          <p style={s.name}>{user.name}</p>
          <p style={s.email}>{user.email}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div style={s.stats}>
        <div style={s.statCard} onClick={() => setTab("Watch Later")}>
          <AiOutlineClockCircle size={22} color="#3ea6ff" />
          <p style={s.statNum}>{watchLater.length}</p>
          <p style={s.statLabel}>Watch Later</p>
        </div>
        <div style={s.statCard} onClick={() => setTab("Liked Videos")}>
          <MdThumbUp size={22} color="#ff6b6b" />
          <p style={s.statNum}>{likedVideos.length}</p>
          <p style={s.statLabel}>Liked</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map((t) => (
          <button key={t} style={{ ...s.tabBtn, ...(tab === t ? s.activeTab : {}) }} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={s.content}>
        {tab === "Watch Later" && renderVideoList(watchLater, toggleWatchLater, "✕")}
        {tab === "Liked Videos" && renderVideoList(likedVideos, toggleLiked, "👍")}
      </div>
    </div>
  );
}

const s = {
  wrap:       { padding: "20px 16px", maxWidth: 800, margin: "0 auto" },
  center:     { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" },
  loginBox:   { textAlign: "center", padding: 32 },
  loginTitle: { fontSize: 20, fontWeight: "bold", color: "var(--text)", marginBottom: 8 },
  loginSub:   { fontSize: 14, color: "var(--text-muted)" },
  header:     { display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: "16px", background: "var(--card-bg)", borderRadius: 16 },
  avatar:     { width: 64, height: 64, borderRadius: "50%", objectFit: "cover" },
  name:       { fontSize: 18, fontWeight: "bold", color: "var(--text)", marginBottom: 2 },
  email:      { fontSize: 13, color: "var(--text-muted)" },
  stats:      { display: "flex", gap: 12, marginBottom: 20 },
  statCard:   { flex: 1, background: "var(--card-bg)", borderRadius: 14, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" },
  statNum:    { fontSize: 22, fontWeight: "bold", color: "var(--text)" },
  statLabel:  { fontSize: 11, color: "var(--text-muted)", textAlign: "center" },
  tabs:       { display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 16 },
  tabBtn:     { background: "none", border: "none", borderBottom: "2px solid transparent", color: "var(--text-muted)", padding: "10px 18px", cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" },
  activeTab:  { color: "var(--text)", borderBottom: "2px solid var(--text)", fontWeight: "600" },
  content:    {},
  empty:      { textAlign: "center", color: "var(--text-muted)", padding: "40px 0", fontSize: 14 },
  list:       { display: "flex", flexDirection: "column", gap: 10 },
  item:       { display: "flex", gap: 12, alignItems: "center", background: "var(--card-bg)", borderRadius: 10, padding: 10 },
  thumbWrap:  { position: "relative", flexShrink: 0, cursor: "pointer" },
  thumb:      { width: 140, height: 80, objectFit: "cover", borderRadius: 8, display: "block" },
  dur:        { position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.85)", color: "#fff", fontSize: 11, fontWeight: "bold", padding: "2px 5px", borderRadius: 4 },
  info:       { flex: 1, minWidth: 0 },
  title:      { fontSize: 14, fontWeight: "600", color: "var(--text)", cursor: "pointer", marginBottom: 4, lineHeight: 1.4 },
  channel:    { fontSize: 12, color: "var(--text-muted)" },
  removeBtn:  { background: "none", border: "none", fontSize: 16, cursor: "pointer", padding: "4px 8px", flexShrink: 0, color: "var(--text-muted)" },
};
