import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AiOutlineSearch, AiOutlineClose, AiOutlineClockCircle } from "react-icons/ai";
import { MdHistory, MdHome, MdHomeFilled, MdSearch, MdSubscriptions, MdWhatshotOutlined, MdThumbUpOffAlt, MdSlowMotionVideo, MdOutlineWatchLater } from "react-icons/md";
import { RiYoutubeLine } from "react-icons/ri";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";
import { getSearchSuggestions } from "../api/youtube";

const HISTORY_KEY = "mytube_search_history";

// ── PC Sidebar items ──────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { icon: (a) => a ? <MdHomeFilled size={22}/> : <MdHome size={22}/>, label: "Home",          path: "/" },
  { icon: ()  => <MdSlowMotionVideo size={22}/>,                       label: "Shorts",        path: "/shorts" },
  { icon: ()  => <MdWhatshotOutlined size={22}/>,                      label: "Trending",      path: "/trending" },
  { icon: ()  => <MdSubscriptions size={22}/>,                         label: "Subscriptions", path: "/subscriptions" },
  { icon: ()  => <AiOutlineClockCircle size={22}/>,                    label: "Watch Later",   path: "/watch-later" },
  { icon: ()  => <MdThumbUpOffAlt size={22}/>,                         label: "Liked Videos",  path: "/liked" },
];

export default function Navbar() {
  const [query, setQuery]             = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory]         = useState(() => JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"));
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile]       = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, setUser } = useAuth();
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);
  const menuRef     = useRef(null);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
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

  useEffect(() => {
    const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
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
    const q = sugg?.title || query;
    if (!q.trim()) return;
    setShowDropdown(false); setMobileSearch(false);
    setQuery(q); saveHistory(q);
    navigate(`/search?q=${q}`);
  };

  const goTo = (path) => { setShowUserMenu(false); navigate(path); };
  const dropdownItems = query.trim() ? suggestions : history.map((h) => ({ title: h, type: "history" }));
  const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const searchJSX = (
    <div style={{ position: "relative" }}>
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={st.searchForm}>
        <div style={st.inputWrap}>
          <input
            ref={inputRef}
            style={{ ...st.input, width: isMobile ? "calc(100vw - 120px)" : 340 }}
            type="text" placeholder="Search..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />
          {query && (
            <button type="button" style={st.clearBtn} onMouseDown={(e) => { e.preventDefault(); setQuery(""); setSuggestions([]); }}>
              <AiOutlineClose size={14} />
            </button>
          )}
        </div>
        <button type="submit" style={st.searchBtn}><AiOutlineSearch size={20} /></button>
        {isMobile && (
          <button type="button" style={st.cancelBtn} onMouseDown={(e) => { e.preventDefault(); setMobileSearch(false); setQuery(""); setSuggestions([]); }}>
            <AiOutlineClose size={20} />
          </button>
        )}
      </form>
      {showDropdown && dropdownItems.length > 0 && (
        <div style={{ ...st.dropdown, width: isMobile ? "calc(100vw - 16px)" : "100%" }}>
          {!query.trim() && <p style={st.dropLabel}>Recent searches</p>}
          {dropdownItems.map((s, i) => (
            <div key={i} style={st.suggItem} onMouseDown={() => handleSearch(s)}>
              {s.type === "history" ? <MdHistory size={15} color="#aaa" />
                : s.type === "channel" ? <img src={s.thumb} alt="" style={st.suggThumb} />
                : <AiOutlineSearch size={14} color="#aaa" />}
              <span style={st.suggText}>{s.title?.slice(0, 60)}</span>
              {s.type === "channel" && <span style={st.channelBadge}>Channel</span>}
              {s.type === "history" && (
                <button style={st.removeBtn} onMouseDown={(e) => removeHistory(e, s.title)}>
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
    return <nav style={{ ...st.nav, padding: "8px 12px" }}>{searchJSX}</nav>;
  }

  return (
    <>
      {/* ── Top Navbar ── */}
      <nav style={st.nav}>
        <div style={st.logo} onClick={() => navigate("/")}>
          <RiYoutubeLine size={28} color="#ff0000" />
          <span style={{ ...st.logoText, fontSize: isMobile ? 16 : 20 }}>MyTube</span>
        </div>

        {searchJSX}

        <div style={st.authSection}>
          {isMobile && (
            <button style={st.iconBtn} onClick={() => setMobileSearch(true)}>
              <AiOutlineSearch size={22} color="#fff" />
            </button>
          )}
          {user ? (
            <div style={{ position: "relative" }} ref={menuRef}>
              <img
                src={user.picture} alt={user.name}
                style={{ ...st.avatar, cursor: "pointer" }}
                onClick={() => setShowUserMenu((p) => !p)}
              />
              {showUserMenu && (
                <div style={st.userMenu}>
                  <div style={st.menuHeader}>
                    <img src={user.picture} alt="" style={st.menuAvatar} />
                    <div>
                      <p style={st.menuName}>{user.name}</p>
                      <p style={st.menuEmail}>{user.email}</p>
                    </div>
                  </div>
                  <hr style={st.menuDivider} />
                  <button style={st.menuItem} onClick={() => goTo("/watch-later")}><AiOutlineClockCircle size={16} /> Watch Later</button>
                  <button style={st.menuItem} onClick={() => goTo("/liked")}><MdThumbUpOffAlt size={16} /> Liked Videos</button>
                  <button style={st.menuItem} onClick={() => goTo("/subscriptions")}><MdSubscriptions size={16} /> Subscriptions</button>
                  <hr style={st.menuDivider} />
                  <button style={{ ...st.menuItem, color: "#ff4444" }} onClick={() => { setUser(null); setShowUserMenu(false); }}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <GoogleLogin
              onSuccess={(res) => setUser(jwtDecode(res.credential))}
              onError={() => {}}
              useOneTap auto_select
              size={isMobile ? "small" : "medium"}
            />
          )}
        </div>
      </nav>

      {/* ── PC Left Sidebar ── */}
      {!isMobile && (
        <aside style={st.sidebar}>
          {SIDEBAR_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <button key={item.path} style={{ ...st.sideItem, background: active ? "#272727" : "none" }} onClick={() => navigate(item.path)}>
                <span style={{ color: active ? "#fff" : "#aaa" }}>{item.icon(active)}</span>
                <span style={{ ...st.sideLabel, color: active ? "#fff" : "#aaa", fontWeight: active ? "600" : "400" }}>{item.label}</span>
              </button>
            );
          })}
          <hr style={st.menuDivider} />
          {!user && (
            <p style={st.sideHint}>Sign in to access your subscriptions and liked videos</p>
          )}
        </aside>
      )}

      {/* ── Mobile Bottom Nav ── */}
      {isMobile && (
        <div className="mobile-nav">
          <MobBtn icon={<MdHomeFilled size={22}/>}        label="Home"     active={isActive("/")}              onClick={() => navigate("/")} />
          <MobBtn icon={<MdSlowMotionVideo size={22}/>}   label="Shorts"   active={isActive("/shorts")}        onClick={() => navigate("/shorts")} />
          <MobBtn icon={<MdWhatshotOutlined size={22}/>}  label="Trending" active={isActive("/trending")}      onClick={() => navigate("/trending")} />
          <MobBtn icon={<MdSearch size={22}/>}            label="Search"   active={mobileSearch}               onClick={() => setMobileSearch(true)} />
          <MobBtn icon={<MdSubscriptions size={22}/>}     label="Subs"     active={isActive("/subscriptions")} onClick={() => navigate("/subscriptions")} />
          {user
            ? <button style={nb.btn} onClick={() => setShowUserMenu((p) => !p)}>
                <img src={user.picture} alt="" style={nb.avatar} />
                <span style={{ ...nb.label, color: "#aaa" }}>You</span>
              </button>
            : <MobBtn icon={<MdThumbUpOffAlt size={22}/>} label="Liked" active={isActive("/liked")} onClick={() => navigate("/liked")} />
          }
        </div>
      )}
    </>
  );
}

function MobBtn({ icon, label, active, onClick }) {
  return (
    <button style={nb.btn} onClick={onClick}>
      <span style={{ color: active ? "#fff" : "#777" }}>{icon}</span>
      <span style={{ ...nb.label, color: active ? "#fff" : "#777", fontWeight: active ? "600" : "400" }}>{label}</span>
      {active && <span style={nb.dot} />}
    </button>
  );
}

const nb = {
  btn:    { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", padding: "5px 0 3px", position: "relative", gap: 3 },
  label:  { fontSize: 9, letterSpacing: 0.2 },
  avatar: { width: 22, height: 22, borderRadius: "50%", objectFit: "cover" },
  dot:    { position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "#fff" },
};

const st = {
  nav:         { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#0f0f0f", borderBottom: "1px solid #222", position: "fixed", top: 0, left: 0, right: 0, zIndex: 300, height: 56 },
  logo:        { display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 },
  logoText:    { fontWeight: "bold", color: "#fff" },
  searchForm:  { display: "flex", alignItems: "center" },
  inputWrap:   { position: "relative", display: "flex", alignItems: "center" },
  input:       { padding: "8px 32px 8px 14px", borderRadius: "20px 0 0 20px", border: "1px solid #333", background: "#121212", color: "#fff", outline: "none", fontSize: 14 },
  clearBtn:    { position: "absolute", right: 8, background: "none", border: "none", color: "#aaa", cursor: "pointer", display: "flex", alignItems: "center" },
  searchBtn:   { padding: "8px 14px", borderRadius: "0 20px 20px 0", border: "1px solid #333", borderLeft: "none", background: "#222", color: "#fff", cursor: "pointer" },
  cancelBtn:   { background: "none", border: "none", color: "#aaa", cursor: "pointer", marginLeft: 6, display: "flex", alignItems: "center", padding: 4 },
  dropdown:    { position: "absolute", top: "100%", left: 0, background: "#212121", borderRadius: "0 0 12px 12px", border: "1px solid #333", borderTop: "none", zIndex: 400, overflow: "hidden" },
  dropLabel:   { fontSize: 11, color: "#888", padding: "8px 16px 4px", margin: 0 },
  suggItem:    { display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer" },
  suggThumb:   { width: 24, height: 24, borderRadius: "50%", objectFit: "cover" },
  suggText:    { fontSize: 13, color: "#fff", flex: 1 },
  channelBadge:{ fontSize: 10, color: "#3ea6ff", border: "1px solid #3ea6ff", borderRadius: 4, padding: "1px 5px" },
  removeBtn:   { background: "none", border: "none", color: "#aaa", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 },
  authSection: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  iconBtn:     { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" },
  avatar:      { width: 34, height: 34, borderRadius: "50%" },
  userMenu:    { position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#212121", border: "1px solid #333", borderRadius: 12, minWidth: 220, zIndex: 500, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.7)" },
  menuHeader:  { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" },
  menuAvatar:  { width: 40, height: 40, borderRadius: "50%" },
  menuName:    { fontSize: 14, fontWeight: "bold", color: "#fff" },
  menuEmail:   { fontSize: 12, color: "#aaa" },
  menuDivider: { border: "none", borderTop: "1px solid #2a2a2a", margin: "4px 0" },
  menuItem:    { display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", color: "#fff", padding: "11px 16px", cursor: "pointer", fontSize: 13, textAlign: "left" },
  // PC Sidebar
  sidebar:     { position: "fixed", top: 56, left: 0, bottom: 0, width: 220, background: "#0f0f0f", borderRight: "1px solid #1e1e1e", overflowY: "auto", zIndex: 200, padding: "8px 0" },
  sideItem:    { display: "flex", alignItems: "center", gap: 14, width: "100%", border: "none", cursor: "pointer", padding: "10px 20px", borderRadius: 10, margin: "1px 8px", width: "calc(100% - 16px)", transition: "background 0.15s" },
  sideLabel:   { fontSize: 13 },
  sideHint:    { fontSize: 11, color: "#555", padding: "12px 16px", lineHeight: 1.5 },
};
