import { useNavigate } from "react-router-dom";

export default function VideoCard({ video }) {
  const navigate = useNavigate();
  const isSearch = video?.id?.videoId;
  const id = isSearch ? video.id.videoId : video.id;
  const snippet = video.snippet;

  return (
    <div style={styles.card} onClick={() => navigate(`/watch/${id}`)}>
      <img
        src={snippet.thumbnails?.medium?.url}
        alt={snippet.title}
        style={styles.thumbnail}
      />
      <div style={styles.info}>
        <p style={styles.title}>{snippet.title?.slice(0, 60)}...</p>
        <p style={styles.channel}>{snippet.channelTitle}</p>
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
    background: "#181818",
    borderRadius: 8,
    overflow: "hidden",
    transition: "transform 0.2s",
  },
  thumbnail: {
    width: "100%",
    height: 158,
    objectFit: "cover",
  },
  info: {
    padding: "8px 10px",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    color: "#fff",
  },
  channel: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 2,
  },
  views: {
    fontSize: 11,
    color: "#888",
  },
};
