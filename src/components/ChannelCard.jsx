import { useNavigate } from "react-router-dom";

export default function ChannelCard({ channel }) {
  const navigate = useNavigate();
  const snippet = channel.snippet;
  const id = channel.id?.channelId || channel.id;
  const description = snippet.description || "";

  return (
    <div style={styles.card} onClick={() => navigate(`/channel/${id}`)}>
      <img
        src={snippet.thumbnails?.medium?.url}
        alt={snippet.title}
        style={styles.avatar}
      />
      <div style={styles.info}>
        <p style={styles.name}>{snippet.title}</p>
        <p style={styles.desc}>
          {description ? `${description.slice(0, 80)}${description.length > 80 ? "…" : ""}` : "YouTube channel"}
        </p>
        <span style={styles.badge}>Channel</span>
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "16px 20px",
    cursor: "pointer",
    borderBottom: "1px solid var(--border)",
    width: "100%",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  },
  info: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text)",
  },
  desc: {
    fontSize: 13,
    color: "var(--text-muted)",
  },
  badge: {
    fontSize: 11,
    color: "#3ea6ff",
    border: "1px solid #3ea6ff",
    borderRadius: 4,
    padding: "2px 6px",
    width: "fit-content",
  },
};
