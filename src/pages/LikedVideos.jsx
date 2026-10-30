import { MdThumbUp } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import VideoList from "../components/VideoList";
import SignInNotice from "../components/SignInNotice";

export default function LikedVideos() {
  const { user, likedVideos, toggleLiked, syncing } = useAuth();

  if (!user) {
    return (
      <SignInNotice
        title="Sign in to view liked videos"
        subtitle="Videos you like will be collected here."
      />
    );
  }

  return (
    <div className="page-content" style={s.wrap}>
      <h2 style={s.heading}>Liked videos <span style={s.count}>{likedVideos.length}</span></h2>
      {syncing && likedVideos.length === 0 ? (
        <p style={s.loading}>Loading your liked videos…</p>
      ) : (
        <VideoList
          items={likedVideos}
          onRemove={toggleLiked}
          removeIcon={<MdThumbUp size={20} color="#3ea6ff" />}
          removeTitle="Remove from liked videos"
          emptyTitle="No liked videos yet"
          emptyText="Videos you like on YouTube will show up here."
        />
      )}
    </div>
  );
}

const s = {
  wrap: { padding: "24px 20px", maxWidth: 900 },
  heading: { fontSize: 22, fontWeight: 600, marginBottom: 20, color: "var(--text)" },
  count: { fontSize: 14, fontWeight: 500, color: "var(--text-muted)", marginLeft: 6 },
  loading: { color: "var(--text-muted)", fontSize: 14, textAlign: "center", padding: "40px 0" },
};
