import { useNavigate } from "react-router-dom";
import { formatDuration } from "../utils/duration";
import ImageWithSkeleton from "./ImageWithSkeleton";

export default function VideoCard({ video }) {
  const navigate = useNavigate();
  const isSearch = video?.id?.videoId;
  const id = isSearch ? video.id.videoId : video.id;
  const snippet = video.snippet;
  const duration = formatDuration(video.contentDetails?.duration);

  return (
    <div className="video-card-item" style={styles.card}>
      <div style={styles.thumbWrap} onClick={() => navigate(`/watch/${id}`)}>
        <ImageWithSkeleton
          src={snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url}
          alt={snippet.title}
          style={styles.thumbnail}
        />
        {duration && <span style={styles.duration}>{duration}</span>}
      </div>
      <div style={styles.info}>
        {video.isLive && <span style={styles.liveBadge}>● LIVE</span>}
        <p style={styles.title} onClick={() => navigate(`/watch/${id}`)}>
          {snippet.title?.slice(0, 72)}{snippet.title?.length > 72 ? "…" : ""}
        </p>
        <p style={styles.channel} onClick={() => navigate(`/channel/${snippet.channelId}`)}>
          {snippet.channelTitle}
        </p>
        {video.statistics && (
          <p style={styles.views}>{Number(video.statistics.viewCount).toLocaleString()} views</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: { cursor: "pointer", width: "100%", minWidth: 0, flexShrink: 0, background: "transparent" },
  thumbWrap: { borderRadius: 12, overflow: "hidden", position: "relative" },
  thumbnail: { width: "100%", aspectRatio: "16/9", borderRadius: 12 },
  duration: {
    position: "absolute", bottom: 8, right: 8,
    background: "rgba(0,0,0,0.82)", color: "#fff",
    fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 5,
  },
  info: { padding: "10px 4px" },
  title: { fontSize: 14.5, fontWeight: 600, marginBottom: 4, color: "var(--text)", lineHeight: 1.4 },
  channel: { fontSize: 13, color: "var(--text-muted)", marginBottom: 2, cursor: "pointer" },
  views: { fontSize: 12, color: "var(--text-muted)" },
  liveBadge: { display: "inline-block", background: "#ff0000", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, marginBottom: 4 },
};
