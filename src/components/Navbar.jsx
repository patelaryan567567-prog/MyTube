import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineSearch, AiOutlineClose } from "react-icons/ai";
import { MdHistory } from "react-icons/md";
import { RiYoutubeLine, RiUserLine } from "react-icons/ri";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";
import { getSearchSuggestions } from "../api/youtube";

const HISTORY_KEY = "mytube_search_history";

export default function Navbar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"));
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getSearchSuggestions(query);
        setSuggestions(res.data.items.map((i) => ({
          title: i.snippet.title,
          type: i.id?.kind === "youtube#channel" ? "channel" : "video",
          id: i.id?.channelId || i.id?.videoId,
          thumb: i.snippet.thumbnails?.default?.url,
        })));
      } catch { setSuggestions([]); }
    }, 400);
  }, [query]);

  const saveHistory = (q) => {
    const updated = [q, ...history.filter((h) => h !== q)].slice(0, 10);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const removeHistory = (e, item) => {
    e.stopPropagation();
    const updated = history.filter((h) => h !== item);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const handleSearch = (sugg) => {
    if (sugg?.type === "channel") {
      setShowDropdown(false);
      setQuery(sugg.title);
      saveHistory(sugg.title);
      navigate(`/search?q=${sugg.title}`);
      return;
    }
    const searchQuery = sugg?.title || query;
    if (!searchQuery.trim()) return;
    setShowDropdown(false);
    setQuery(searchQuery);
    saveHistory(searchQuery);
    navigate(`/search?q=${searchQuery}`);
  };

  const dropdownItems = query.trim() ? suggestions : history.map((h) => ({ title: h, type: "history" }));

  return (
    <nav style={styles.nav}>
      <div style={styles.logo} onClick={() => navigate("/")}>
        <RiYoutubeLine size={32} color="#ff0000" />
        <span style={styles.logoText}>MyTube</span>
      </div>

      <div style={styles.searchWrap}>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={styles.searchForm}>
          <div style={styles.inputWrap}>
            <input
              style={styles.input}
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />
            {query && (
              <button type="button" style={styles.clearBtn} onClick={() => { setQuery(""); setSuggestions([]); }}>
                <AiOutlineClose size={14} />
              </button>
            )}
          </div>
          <button type="submit" style={styles.searchBtn}>
            <AiOutlineSearch size={20} />
          </button>
        </form>

        {showDropdown && dropdownItems.length > 0 && (
          <div style={styles.dropdown}>
            {!query.trim() && <p style={styles.dropLabel}>Recent searches</p>}
            {dropdownItems.map((s, i) => (
              <div key={i} style={styles.suggItem} onMouseDown={() => handleSearch(s)}>
                {s.type === "history"
                  ? <MdHistory size={15} color="#aaa" />
                  : s.type === "channel"
                  ? <img src={s.thumb} alt="" style={styles.suggThumb} />
                  : <AiOutlineSearch size={14} color="#aaa" />
                }
                <span style={styles.suggText}>{s.title?.slice(0, 60)}</span>
                {s.type === "channel" && <span style={styles.channelBadge}>Channel</span>}
                {s.type === "history" && (
                  <button
                    style={styles.removeBtn}
                    onMouseDown={(e) => removeHistory(e, s.title)}
                  >
                    <AiOutlineClose size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.authSection}>
        {user ? (
          <div style={styles.userInfo}>
            <img src={user.picture} alt={user.name} style={styles.avatar} />
            <span style={styles.userName}>{user.name}</span>
            <button style={styles.logoutBtn} onClick={() => setUser(null)}>Logout</button>
          </div>
        ) : (
          <GoogleLogin
            onSuccess={(res) => setUser(jwtDecode(res.credential))}
            onError={() => console.log("Login Failed")}
            useOneTap
          />
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 20px", background: "#0f0f0f", borderBottom: "1px solid #222",
    position: "sticky", top: 0, zIndex: 100,
  },
  logo: { display: "flex", alignItems: "center", gap: 6, cursor: "pointer" },
  logoText: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  searchWrap: { position: "relative" },
  searchForm: { display: "flex", alignItems: "center" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  input: {
    width: 320, padding: "8px 32px 8px 14px",
    borderRadius: "20px 0 0 20px", border: "1px solid #333",
    background: "#121212", color: "#fff", outline: "none", fontSize: 14,
  },
  clearBtn: {
    position: "absolute", right: 8, background: "none", border: "none",
    color: "#aaa", cursor: "pointer", display: "flex", alignItems: "center",
  },
  searchBtn: {
    padding: "8px 14px", borderRadius: "0 20px 20px 0",
    border: "1px solid #333", borderLeft: "none",
    background: "#222", color: "#fff", cursor: "pointer",
  },
  dropdown: {
    position: "absolute", top: "100%", left: 0, width: "100%",
    background: "#212121", borderRadius: "0 0 12px 12px",
    border: "1px solid #333", borderTop: "none", zIndex: 200, overflow: "hidden",
  },
  dropLabel: { fontSize: 11, color: "#888", padding: "8px 16px 4px", margin: 0 },
  suggItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 16px", cursor: "pointer",
  },
  suggThumb: { width: 24, height: 24, borderRadius: "50%", objectFit: "cover" },
  suggText: { fontSize: 13, color: "#fff", flex: 1 },
  channelBadge: { fontSize: 10, color: "#3ea6ff", border: "1px solid #3ea6ff", borderRadius: 4, padding: "1px 5px" },
  removeBtn: { background: "none", border: "none", color: "#aaa", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 },
  authSection: { display: "flex", alignItems: "center" },
  userInfo: { display: "flex", alignItems: "center", gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: "50%" },
  userName: { fontSize: 13, color: "#fff" },
  logoutBtn: { padding: "5px 12px", background: "#333", color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 12 },
};
