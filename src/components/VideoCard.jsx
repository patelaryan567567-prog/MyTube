import { useNavigate } from "react-router-dom";

const parseDuration = (iso) => {
  if (!iso) return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = parseInt(m[1] || 0), min = parseInt(m[2] || 0), sec = parseInt(m[3] || 0);
  if (h > 0) return `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${min}:${String(sec).padStart(2, "0")}`;
};

export default function VideoCard({ video }) {
  const navigate = useNavigate();
  const isSearch = video?.id?.videoId;
  const id = isSearch ? video.id.videoId : video.id;
  const snippet = video.snippet;
  const duration = parseDuration(video.contentDetails?.duration);

  return (
    <div style={styles.card}>
      <div style={styles.thumbWrap} onClick={() => navigate(`/watch/${id}`)}>
        <img src={snippet.thumbnails?.medium?.url} alt={snippet.title} style={styles.thumbnail} />
        {duration && <span style={styles.duration}>{duration}</span>}
      </div>
      <div style={styles.info}>
        {video.isLive && <span style={styles.liveBadge}>🔴 LIVE</span>}
        <p style={styles.title} onClick={() => navigate(`/watch/${id}`)}>
          {snippet.title?.slice(0, 65)}{snippet.title?.length > 65 ? "..." : ""}
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
  thumbWrap: { borderRadius: 8, overflow: "hidden", position: "relative" },
  thumbnail: { width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" },
  duration: {
    position: "absolute", bottom: 6, right: 6,
    background: "rgba(0,0,0,0.8)", color: "#fff",
    fontSize: 11, fontWeight: "bold", padding: "2px 5px", borderRadius: 4,
  },
  info: { padding: "8px 4px" },
  title: { fontSize: 14, fontWeight: "600", marginBottom: 4, color: "var(--text)", lineHeight: 1.4 },
  channel: { fontSize: 13, color: "var(--text-muted)", marginBottom: 2, cursor: "pointer" },
  views: { fontSize: 12, color: "var(--text-muted)" },
  liveBadge: { display: "inline-block", background: "#ff0000", color: "#fff", fontSize: 11, fontWeight: "bold", padding: "2px 6px", borderRadius: 4, marginBottom: 4 },
};
