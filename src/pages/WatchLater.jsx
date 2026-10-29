import { MdClose } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import VideoList from "../components/VideoList";
import SignInNotice from "../components/SignInNotice";

export default function WatchLater() {
  const { user, watchLater, toggleWatchLater } = useAuth();

  if (!user) {
    return (
      <SignInNotice
        title="Sign in to view Watch Later"
        subtitle="Save videos while you browse and find them here whenever you're ready."
      />
    );
  }

  return (
    <div className="page-content" style={s.wrap}>
      <h2 style={s.heading}>Watch Later <span style={s.count}>{watchLater.length}</span></h2>
      <VideoList
        items={watchLater}
        onRemove={toggleWatchLater}
        removeIcon={<MdClose size={20} />}
        removeTitle="Remove from Watch Later"
        emptyTitle="Your Watch Later list is empty"
        emptyText="Save videos to watch them whenever you're ready."
      />
    </div>
  );
}

const s = {
  wrap: { padding: "24px 20px", maxWidth: 900 },
  heading: { fontSize: 22, fontWeight: 600, marginBottom: 20, color: "var(--text)" },
  count: { fontSize: 14, fontWeight: 500, color: "var(--text-muted)", marginLeft: 6 },
};
