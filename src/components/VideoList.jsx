import { useNavigate } from "react-router-dom";

/**
 * Vertical list of saved videos (Watch Later, Liked Videos).
 * items: [{ id, title, thumb, channel, duration }]
 */
export default function VideoList({ items, onRemove, removeIcon, removeTitle, emptyTitle, emptyText }) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div style={s.empty}>
        <p style={s.emptyTitle}>{emptyTitle}</p>
        <p style={s.emptyText}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div style={s.list}>
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
          <button style={s.removeBtn} onClick={() => onRemove(v)} title={removeTitle} aria-label={removeTitle}>
            {removeIcon}
          </button>
        </div>
      ))}
    </div>
  );
}

const s = {
  list:       { display: "flex", flexDirection: "column", gap: 12 },
  item:       { display: "flex", gap: 12, alignItems: "center", background: "var(--card-bg)", borderRadius: 10, padding: 10, border: "1px solid var(--border)" },
  thumbWrap:  { position: "relative", flexShrink: 0, cursor: "pointer" },
  thumb:      { width: 160, maxWidth: "38vw", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8, display: "block" },
  dur:        { position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 5px", borderRadius: 4 },
  info:       { flex: 1, minWidth: 0 },
  title:      { fontSize: 14, fontWeight: 600, color: "var(--text)", cursor: "pointer", marginBottom: 4, lineHeight: 1.4 },
  channel:    { fontSize: 12, color: "var(--text-muted)" },
  removeBtn:  { background: "none", border: "none", cursor: "pointer", padding: 8, flexShrink: 0, color: "var(--text-muted)", display: "flex", alignItems: "center", borderRadius: "50%" },
  empty:      { textAlign: "center", padding: "56px 16px" },
  emptyTitle: { fontSize: 17, fontWeight: 600, color: "var(--text)", marginBottom: 6 },
  emptyText:  { fontSize: 14, color: "var(--text-muted)" },
};
