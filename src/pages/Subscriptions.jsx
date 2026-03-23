import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Subscriptions() {
  const { user, subscriptions } = useAuth();
  const navigate = useNavigate();

  if (!user) return <div className="page-content"><p style={styles.msg}>Login karo pehle subscriptions dekhne ke liye.</p></div>;
  return (
    <div className="page-content" style={styles.wrap}>
      <h2 style={styles.heading}>Subscriptions</h2>
      {subscriptions.length === 0 ? (
        <p style={styles.msg}>Koi subscription nahi hai abhi.</p>
      ) : (
        <div style={styles.list}>
          {subscriptions.map((ch) => (
            <div key={ch.id} style={styles.card} onClick={() => navigate(`/channel/${ch.id}`)}>
              <img src={ch.avatar} alt={ch.name} style={styles.avatar} />
              <div>
                <p style={styles.name}>{ch.name}</p>
                {ch.subs && <p style={styles.subs}>{ch.subs} subscribers</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { padding: "24px 20px" },
  heading: { fontSize: 20, fontWeight: "bold", marginBottom: 20, color: "var(--text)" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    display: "flex", alignItems: "center", gap: 16,
    background: "var(--card-bg)", borderRadius: 12, padding: "12px 16px",
    cursor: "pointer", border: "1px solid var(--border)", transition: "background 0.2s",
  },
  avatar: { width: 52, height: 52, borderRadius: "50%", objectFit: "cover" },
  name: { fontSize: 15, fontWeight: "bold", color: "var(--text)" },
  subs: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  msg: { textAlign: "center", marginTop: 60, color: "var(--text-muted)", fontSize: 15 },
};
