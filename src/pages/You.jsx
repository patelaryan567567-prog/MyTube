import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AiOutlineClockCircle } from "react-icons/ai";
import { MdThumbUp, MdClose, MdSubscriptions } from "react-icons/md";
import VideoList from "../components/VideoList";
import SignInNotice from "../components/SignInNotice";

const TABS = ["Watch Later", "Liked videos"];

export default function You() {
  const { user, watchLater, likedVideos, subscriptions, toggleWatchLater, toggleLiked } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(TABS[0]);

  if (!user) {
    return (
      <SignInNotice
        title="Sign in to see your library"
        subtitle="Your liked videos, Watch Later list and subscriptions will appear here."
      />
    );
  }

  return (
    <div className="page-content" style={s.wrap}>
      <div style={s.header}>
        <img src={user.picture} alt={user.name} style={s.avatar} />
        <div>
          <p style={s.name}>{user.name}</p>
          <p style={s.email}>{user.email}</p>
        </div>
      </div>

      <div style={s.stats}>
        <button style={s.statCard} onClick={() => setTab(TABS[0])}>
          <AiOutlineClockCircle size={22} color="#3ea6ff" />
          <p style={s.statNum}>{watchLater.length}</p>
          <p style={s.statLabel}>Watch Later</p>
        </button>
        <button style={s.statCard} onClick={() => setTab(TABS[1])}>
          <MdThumbUp size={22} color="#ff6b6b" />
          <p style={s.statNum}>{likedVideos.length}</p>
          <p style={s.statLabel}>Liked</p>
        </button>
        <button style={s.statCard} onClick={() => navigate("/subscriptions")}>
          <MdSubscriptions size={22} color="#8e7cff" />
          <p style={s.statNum}>{subscriptions.length}</p>
          <p style={s.statLabel}>Subscriptions</p>
        </button>
      </div>

      <div style={s.tabs}>
        {TABS.map((t) => (
          <button key={t} style={{ ...s.tabBtn, ...(tab === t ? s.activeTab : {}) }} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === TABS[0] ? (
        <VideoList
          items={watchLater}
          onRemove={toggleWatchLater}
          removeIcon={<MdClose size={20} />}
          removeTitle="Remove from Watch Later"
          emptyTitle="Your Watch Later list is empty"
          emptyText="Save videos to watch them whenever you're ready."
        />
      ) : (
        <VideoList
          items={likedVideos}
          onRemove={toggleLiked}
          removeIcon={<MdThumbUp size={20} color="#3ea6ff" />}
          removeTitle="Remove from liked videos"
          emptyTitle="No liked videos yet"
          emptyText="Tap the like button on a video and it will show up here."
        />
      )}
    </div>
  );
}

const s = {
  wrap:      { padding: "20px 16px", maxWidth: 800, margin: "0 auto" },
  header:    { display: "flex", alignItems: "center", gap: 16, marginBottom: 24, padding: 16, background: "var(--card-bg)", borderRadius: 16, border: "1px solid var(--border)" },
  avatar:    { width: 64, height: 64, borderRadius: "50%", objectFit: "cover" },
  name:      { fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 2 },
  email:     { fontSize: 13, color: "var(--text-muted)" },
  stats:     { display: "flex", gap: 12, marginBottom: 20 },
  statCard:  { flex: 1, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--text)" },
  statNum:   { fontSize: 22, fontWeight: 700, color: "var(--text)" },
  statLabel: { fontSize: 12, color: "var(--text-muted)", textAlign: "center" },
  tabs:      { display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 16 },
  tabBtn:    { background: "none", border: "none", borderBottom: "2px solid transparent", color: "var(--text-muted)", padding: "10px 18px", cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" },
  activeTab: { color: "var(--text)", borderBottom: "2px solid var(--text)", fontWeight: 600 },
};
