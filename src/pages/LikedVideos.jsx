import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LikedVideos() {
  const { user, likedVideos, toggleLiked } = useAuth();
  const navigate = useNavigate();

  if (!user) return <p style={s.msg}>Login karo pehle liked videos dekhne ke liye.</p>;

  return (
    <div style={s.wrap}>
      <h2 style={s.heading}>Liked Videos ({likedVideos.length})</h2>
      {likedVideos.length === 0 ? (
        <p style={s.msg}>Koi video like nahi ki abhi.</p>
      ) : (
        <div style={s.list}>
          {likedVideos.map((v) => (
            <div key={v.id} style={s.item}>
              <div style={s.thumbWrap} onClick={() => navigate(`/watch/${v.id}`)}>
                <img src={v.thumb} alt={v.title} style={s.thumb} />
                {v.duration && <span style={s.dur}>{v.duration}</span>}
              </div>
              <div style={s.info}>
                <p style={s.title} onClick={() => navigate(`/watch/${v.id}`)}>{v.title}</p>
                <p style={s.channel}>{v.channel}</p>
              </div>
              <button style={s.removeBtn} onClick={() => toggleLiked(v)} title="Unlike">👍</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { padding: "24px 20px" },
  heading: { fontSize: 20, fontWeight: "bold", marginBottom: 20, color: "#fff" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  item: { display: "flex", gap: 12, alignItems: "center", background: "#1a1a1a", borderRadius: 10, padding: 10 },
  thumbWrap: { position: "relative", flexShrink: 0, cursor: "pointer" },
  thumb: { width: 160, height: 90, objectFit: "cover", borderRadius: 8, display: "block" },
  dur: { position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 11, fontWeight: "bold", padding: "2px 5px", borderRadius: 4 },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "600", color: "#fff", cursor: "pointer", marginBottom: 4, lineHeight: 1.4 },
  channel: { fontSize: 12, color: "#aaa" },
  removeBtn: { background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: "4px 8px", flexShrink: 0, opacity: 0.9 },
  msg: { textAlign: "center", marginTop: 60, color: "#aaa", fontSize: 15 },
};
