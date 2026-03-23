import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineClose } from "react-icons/ai";

const MiniPlayerCtx = createContext();

export function MiniPlayerProvider({ children }) {
  const [mini, setMini] = useState(null); // { id, title }
  return (
    <MiniPlayerCtx.Provider value={{ mini, setMini }}>
      {children}
      {mini && <MiniPlayer mini={mini} onClose={() => setMini(null)} />}
    </MiniPlayerCtx.Provider>
  );
}

export const useMiniPlayer = () => useContext(MiniPlayerCtx);

function MiniPlayer({ mini, onClose }) {
  const navigate = useNavigate();
  return (
    <div style={s.wrap}>
      <iframe
        src={`https://www.youtube.com/embed/${mini.id}?autoplay=1`}
        style={s.iframe}
        allow="autoplay; encrypted-media"
        allowFullScreen
        title={mini.title}
      />
      <div style={s.bar}>
        <p style={s.title} onClick={() => { navigate(`/watch/${mini.id}`); onClose(); }}>
          {mini.title?.slice(0, 40)}...
        </p>
        <button style={s.closeBtn} onClick={onClose}><AiOutlineClose size={16} /></button>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    position: "fixed", bottom: 80, right: 16, zIndex: 999,
    background: "#1a1a1a", borderRadius: 10, overflow: "hidden",
    boxShadow: "0 4px 24px rgba(0,0,0,0.7)", width: 320,
  },
  iframe: { width: "100%", height: 180, border: "none", display: "block" },
  bar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", gap: 8 },
  title: { fontSize: 12, color: "#fff", cursor: "pointer", flex: 1 },
  closeBtn: { background: "none", border: "none", color: "#aaa", cursor: "pointer", display: "flex", alignItems: "center" },
};
