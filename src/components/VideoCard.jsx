import { useNavigate } from "react-router-dom";

export default function VideoCard({ video }) {
  const navigate = useNavigate();
  const isSearch = video?.id?.videoId;
  const id = isSearch ? video.id.videoId : video.id;
  const snippet = video.snippet;

  return (
    <div style={styles.card}>
      <div style={styles.thumbWrap} onClick={() => navigate(`/watch/${id}`)}>
        <img
          src={snippet.thumbnails?.medium?.url}
          alt={snippet.title}
          style={styles.thumbnail}
        />
        </div>
      <div style={styles.info}>
        <p style={styles.title} onClick={() => navigate(`/watch/${id}`)}>
          {snippet.title?.slice(0, 65)}{snippet.title?.length > 65 ? "..." : ""}
        </p>
        {video.isLive && <span style={styles.liveBadge}>🔴 LIVE</span>}
          {snippet.title?.slice(0, 65)}{snippet.title?.length > 65 ? "..." : ""}
        </p>
        <p
          style={styles.channel}
          onClick={() => navigate(`/channel/${snippet.channelId}`)}
        >
          {snippet.channelTitle}
        </p>
        {video.statistics && (
          <p style={styles.views}>
            {Number(video.statistics.viewCount).toLocaleString()} views
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    cursor: "pointer",
    width: 280,
    background: "transparent",
  },
  thumbWrap: {
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: 158,
    objectFit: "cover",
    display: "block",
    transition: "transform 0.2s",
  },
  info: {
    padding: "8px 4px",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    color: "#fff",
    lineHeight: 1.4,
  },
  channel: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 2,
    cursor: "pointer",
    ":hover": { color: "#fff" },
  },
  views: {
    fontSize: 12,
    color: "#aaa",
  },
  liveBadge: {
    display: "inline-block",
    background: "#ff0000",
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    padding: "2px 6px",
    borderRadius: 4,
    marginBottom: 4,
  },
};
