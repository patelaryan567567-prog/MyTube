export default function SignInNotice({ title, subtitle }) {
  return (
    <div className="page-content" style={s.center}>
      <div style={s.box}>
        <p style={s.title}>{title}</p>
        <p style={s.sub}>{subtitle}</p>
      </div>
    </div>
  );
}

const s = {
  center: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" },
  box:    { textAlign: "center", padding: 32, maxWidth: 420 },
  title:  { fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 8 },
  sub:    { fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 },
};
