import { useEffect, useState } from "react";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={s.toast}>
      <span style={s.dot} />
      <span>Offline Mode — Showing cached library</span>
    </div>
  );
}

const s = {
  toast: {
    position: "fixed",
    bottom: 68,
    left: 16,
    zIndex: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f59e0b",
    color: "#000",
    padding: "8px 14px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#000",
  },
};
