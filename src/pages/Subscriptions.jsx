import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SignInNotice from "../components/SignInNotice";

export default function Subscriptions() {
  const { user, subscriptions, syncing } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <SignInNotice
        title="Sign in to see your subscriptions"
        subtitle="Subscribe to channels and they'll appear here."
      />
    );
  }

  return (
    <div className="page-content" style={styles.wrap}>
      <h2 style={styles.heading}>Subscriptions</h2>
      {syncing && subscriptions.length === 0 ? (
        <p style={styles.emptyText}>Loading your subscriptions…</p>
      ) : subscriptions.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyTitle}>No subscriptions yet</p>
          <p style={styles.emptyText}>Channels you subscribe to on YouTube will appear here.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {subscriptions.map((ch) => (
            <div key={ch.id} style={styles.card} onClick={() => navigate(`/channel/${ch.id}`)}>
              <img src={ch.avatar} alt={ch.name} style={styles.avatar} />
              <div>
                <p style={styles.name}>{ch.name}</p>
                {ch.subs && <p style={styles.subs}>{ch.subs}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { padding: "24px 20px", maxWidth: 900 },
  heading: { fontSize: 22, fontWeight: 600, marginBottom: 20, color: "var(--text)" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    display: "flex", alignItems: "center", gap: 16,
    background: "var(--card-bg)", borderRadius: 12, padding: "12px 16px",
    cursor: "pointer", border: "1px solid var(--border)",
  },
  avatar: { width: 52, height: 52, borderRadius: "50%", objectFit: "cover" },
  name: { fontSize: 15, fontWeight: 600, color: "var(--text)" },
  subs: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  empty: { textAlign: "center", padding: "56px 16px" },
  emptyTitle: { fontSize: 17, fontWeight: 600, color: "var(--text)", marginBottom: 6 },
  emptyText: { fontSize: 14, color: "var(--text-muted)" },
};
