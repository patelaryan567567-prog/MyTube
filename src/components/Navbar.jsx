import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AiOutlineSearch, AiOutlineClose, AiOutlineClockCircle } from "react-icons/ai";
import { MdHistory, MdHome, MdSearch, MdSubscriptions, MdWhatshotOutlined, MdThumbUpOffAlt, MdSlowMotionVideo, MdHomeFilled } from "react-icons/md";
import { RiYoutubeLine } from "react-icons/ri";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";
import { getSearchSuggestions } from "../api/youtube";

const HISTORY_KEY = "mytube_search_history";

export default function Navbar() {
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory]       = useState(() => JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"));
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile]     = useState(() => typeof window !== "undefined" && window.innerWidth <= 600);
  const navigate    = useNavigate();
  const location    = useLocation();
  const { user, setUser } = useAuth();
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);
  const menuRef     = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (mobileSearch && inputRef.current) inputRef.current.focus();
  }, [mobileSearch]);

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

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    const searchQuery = sugg?.title || query;
    if (!searchQuery.trim()) return;
    setShowDropdown(false); setMobileSearch(false);
    setQuery(searchQuery); saveHistory(searchQuery);
    navigate(`/search?q=${searchQuery}`);
  };

  const goTo = (path) => { setShowUserMenu(false); navigate(path); };

  const dropdownItems = query.trim() ? suggestions : history.map((h) => ({ title: h, type: "history" }));

  const searchJSX = (
    <div style={{ position: "relative" }}>
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={styles.searchForm}>
        <div style={styles.inputWrap}>
          <input
            ref={inputRef}
            style={{ ...styles.input, width: isMobile ? "calc(100vw - 110px)" : 320 }}
            type="text" placeholder="Search..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />
          {query && (
            <button type="button" style={styles.clearBtn} onMouseDown={(e) => { e.preventDefault(); setQuery(""); setSuggestions([]); }}>
              <AiOutlineClose size={14} />
            </button>
          )}
        </div>
        <button type="submit" style={styles.searchBtn}><AiOutlineSearch size={20} /></button>
        {isMobile && (
          <button type="button" style={styles.cancelBtn} onMouseDown={(e) => { e.preventDefault(); setMobileSearch(false); setQuery(""); setSuggestions([]); }}>
            <AiOutlineClose size={20} />
          </button>
        )}
      </form>
      {showDropdown && dropdownItems.length > 0 && (
        <div style={{ ...styles.dropdown, width: isMobile ? "calc(100vw - 16px)" : "100%" }}>
          {!query.trim() && <p style={styles.dropLabel}>Recent searches</p>}
          {dropdownItems.map((s, i) => (
            <div key={i} style={styles.suggItem} onMouseDown={() => handleSearch(s)}>
              {s.type === "history" ? <MdHistory size={15} color="#aaa" />
                : s.type === "channel" ? <img src={s.thumb} alt="" style={styles.suggThumb} />
                : <AiOutlineSearch size={14} color="#aaa" />}
              <span style={styles.suggText}>{s.title?.slice(0, 60)}</span>
              {s.type === "channel" && <span style={styles.channelBadge}>Channel</span>}
              {s.type === "history" && (
                <button style={styles.removeBtn} onMouseDown={(e) => removeHistory(e, s.title)}>
                  <AiOutlineClose size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile && mobileSearch) {
    return <nav style={{ ...styles.nav, padding: "8px 12px" }}>{searchJSX}</nav>;
  }

  return (
    <>
      <nav style={styles.nav}>
        <div style={styles.logo} onClick={() => navigate("/")}>
          <RiYoutubeLine size={28} color="#ff0000" />
          <span style={{ ...styles.logoText, fontSize: isMobile ? 16 : 20 }}>MyTube</span>
        </div>

        {!isMobile && searchJSX}

        <div style={styles.authSection}>
          {isMobile && (
            <button style={styles.iconBtn} onClick={() => setMobileSearch(true)}>
              <AiOutlineSearch size={22} color="#fff" />
            </button>
          )}
          {!isMobile && (
            <button style={styles.iconBtn} onClick={() => navigate("/trending")} title="Trending">
              <MdWhatshotOutlined size={24} color="#ff6600" />
            </button>
          )}
          {!isMobile && (
            <button style={styles.iconBtn} onClick={() => navigate("/shorts")} title="Shorts">
              <MdSlowMotionVideo size={24} color="#ff0000" />
            </button>
          )}
          {!isMobile && user && (
            <button style={styles.iconBtn} onClick={() => navigate("/subscriptions")} title="Subscriptions">
              <MdSubscriptions size={24} color="#fff" />
            </button>
          )}
          {user ? (
            <div style={{ position: "relative" }} ref={menuRef}>
              <img
                src={user.picture} alt={user.name} style={{ ...styles.avatar, cursor: "pointer" }}
                onClick={() => setShowUserMenu((p) => !p)}
              />
              {showUserMenu && (
                <div style={styles.userMenu}>
                  <div style={styles.menuHeader}>
                    <img src={user.picture} alt="" style={styles.menuAvatar} />
                    <div>
                      <p style={styles.menuName}>{user.name}</p>
                      <p style={styles.menuEmail}>{user.email}</p>
                    </div>
                  </div>
                  <hr style={styles.menuDivider} />
                  <button style={styles.menuItem} onClick={() => goTo("/watch-later")}>
                    <AiOutlineClockCircle size={16} /> Watch Later
                  </button>
                  <button style={styles.menuItem} onClick={() => goTo("/liked")}>
                    <MdThumbUpOffAlt size={16} /> Liked Videos
                  </button>
                  <button style={styles.menuItem} onClick={() => goTo("/subscriptions")}>
                    <MdSubscriptions size={16} /> Subscriptions
                  </button>
                  <hr style={styles.menuDivider} />
                  <button style={{ ...styles.menuItem, color: "#ff4444" }} onClick={() => { setUser(null); setShowUserMenu(false); }}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <GoogleLogin
              onSuccess={(res) => setUser(jwtDecode(res.credential))}
              onError={() => console.log("Login Failed")}
              useOneTap auto_select
              size={isMobile ? "small" : "medium"}
            />
          )}
        </div>
      </nav>

      {isMobile && (
        <div className="mobile-nav">
          <NavBtn icon={<MdHomeFilled size={22}/>} label="Home" path="/" active={location.pathname==="/"} onClick={()=>navigate("/")} />
          <NavBtn icon={<MdSlowMotionVideo size={22} />} label="Shorts" path="/shorts" active={location.pathname.startsWith("/shorts")} onClick={()=>navigate("/shorts")} />
          <NavBtn icon={<MdWhatshotOutlined size={22}/>} label="Trending" path="/trending" active={location.pathname==="/trending"} onClick={()=>navigate("/trending")} />
          <NavBtn icon={<MdSearch size={22}/>} label="Search" active={mobileSearch} onClick={()=>setMobileSearch(true)} />
          <NavBtn icon={<MdSubscriptions size={22}/>} label="Subs" path="/subscriptions" active={location.pathname==="/subscriptions"} onClick={()=>navigate("/subscriptions")} />
          {user
            ? <button style={nb.btn} onClick={()=>setShowUserMenu(p=>!p)}>
                <img src={user.picture} alt="" style={nb.avatar}/>
                <span style={nb.label}>You</span>
              </button>
            : <NavBtn icon={<MdThumbUpOffAlt size={22}/>} label="Login" active={false} onClick={()=>{}} />
          }
        </div>
      )}
    </>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button style={nb.btn} onClick={onClick}>
      <span style={{ ...nb.icon, color: active ? "#fff" : "#888" }}>{icon}</span>
      <span style={{ ...nb.label, color: active ? "#fff" : "#888", fontWeight: active ? "600" : "400" }}>{label}</span>
      {active && <span style={nb.dot} />}
    </button>
  );
}

const nb = {
  btn: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    background: "none", border: "none", cursor: "pointer", padding: "6px 0 4px", position: "relative", gap: 3,
  },
  icon: { display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },
  label: { fontSize: 9, letterSpacing: 0.2 },
  avatar: { width: 22, height: 22, borderRadius: "50%", objectFit: "cover" },
  dot: {
    position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
    width: 4, height: 4, borderRadius: "50%", background: "#fff",
  },
};
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: "#0f0f0f", borderBottom: "1px solid #222", position: "sticky", top: 0, zIndex: 100 },
  logo: { display: "flex", alignItems: "center", gap: 6, cursor: "pointer" },
  logoText: { fontWeight: "bold", color: "#fff" },
  searchForm: { display: "flex", alignItems: "center" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  input: { padding: "8px 32px 8px 14px", borderRadius: "20px 0 0 20px", border: "1px solid #333", background: "#121212", color: "#fff", outline: "none", fontSize: 14 },
  clearBtn: { position: "absolute", right: 8, background: "none", border: "none", color: "#aaa", cursor: "pointer", display: "flex", alignItems: "center" },
  searchBtn: { padding: "8px 14px", borderRadius: "0 20px 20px 0", border: "1px solid #333", borderLeft: "none", background: "#222", color: "#fff", cursor: "pointer" },
  cancelBtn: { background: "none", border: "none", color: "#aaa", cursor: "pointer", marginLeft: 6, display: "flex", alignItems: "center", padding: 4 },
  dropdown: { position: "absolute", top: "100%", left: 0, background: "#212121", borderRadius: "0 0 12px 12px", border: "1px solid #333", borderTop: "none", zIndex: 200, overflow: "hidden" },
  dropLabel: { fontSize: 11, color: "#888", padding: "8px 16px 4px", margin: 0 },
  suggItem: { display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer" },
  suggThumb: { width: 24, height: 24, borderRadius: "50%", objectFit: "cover" },
  suggText: { fontSize: 13, color: "#fff", flex: 1 },
  channelBadge: { fontSize: 10, color: "#3ea6ff", border: "1px solid #3ea6ff", borderRadius: 4, padding: "1px 5px" },
  removeBtn: { background: "none", border: "none", color: "#aaa", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 },
  authSection: { display: "flex", alignItems: "center", gap: 8 },
  iconBtn: { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" },
  avatar: { width: 34, height: 34, borderRadius: "50%" },
  userMenu: { position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#212121", border: "1px solid #333", borderRadius: 12, minWidth: 220, zIndex: 300, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.6)" },
  menuHeader: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" },
  menuAvatar: { width: 40, height: 40, borderRadius: "50%" },
  menuName: { fontSize: 14, fontWeight: "bold", color: "#fff" },
  menuEmail: { fontSize: 12, color: "#aaa" },
  menuDivider: { border: "none", borderTop: "1px solid #333", margin: 0 },
  menuItem: { display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", color: "#fff", padding: "11px 16px", cursor: "pointer", fontSize: 13, textAlign: "left" },
  mobileNavBtn: { display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", color: "#fff", cursor: "pointer", gap: 2 },
  mobileNavLabel: { fontSize: 10, color: "#aaa" },
};
