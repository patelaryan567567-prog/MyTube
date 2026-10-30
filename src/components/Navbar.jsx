import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AiOutlineSearch, AiOutlineClose, AiOutlineClockCircle } from "react-icons/ai";
import {
  MdHistory, MdHome, MdHomeFilled, MdSubscriptions, MdOutlineSubscriptions, MdThumbUpOffAlt,
  MdSlowMotionVideo, MdOutlineSlowMotionVideo, MdWhatshot, MdOutlineWhatshot,
} from "react-icons/md";
import MyTubeLogo from "./MyTubeLogo";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getSearchSuggestions } from "../api/youtube";

const HISTORY_KEY = "mytube_search_history";

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
};

function SuggestionDropdown({ items, showRecentLabel, width, onPick, onRemove }) {
  return (
    <div style={{ ...st.dropdown, width }}>
      {showRecentLabel && <p style={st.dropLabel}>Recent searches</p>}
      {items.map((s, i) => (
        <div key={i} style={st.suggItem} onMouseDown={() => onPick(s)}>
          {s.type === "history" ? <MdHistory size={15} color="var(--text-muted)" />
            : s.type === "channel" ? <img src={s.thumb} alt="" style={st.suggThumb} />
            : <AiOutlineSearch size={14} color="var(--text-muted)" />}
          <span style={st.suggText}>{s.title?.slice(0, 60)}</span>
          {s.type === "channel" && <span style={st.channelBadge}>Channel</span>}
          {s.type === "history" && (
            <button style={st.removeBtn} onMouseDown={(e) => onRemove(e, s.title)} aria-label="Remove from history">
              <AiOutlineClose size={11} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Navbar() {
  const [query, setQuery]               = useState("");
  const [suggestions, setSuggestions]   = useState([]);
  const [history, setHistory]           = useState(loadHistory);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile]         = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);
  const navigate    = useNavigate();
  const location    = useLocation();
  const { user, signIn, signOut, syncing, sessionExpired } = useAuth();
  const { dark, toggleTheme } = useTheme();
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
        setSuggestions((res.data.items || []).map((i) => ({
          title: i.snippet.title,
          type: i.id?.kind === "youtube#channel" ? "channel" : "video",
          id: i.id?.channelId || i.id?.videoId,
          thumb: i.snippet.thumbnails?.default?.url,
        })));
      } catch { setSuggestions([]); }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const persistHistory = (list) => {
    setHistory(list);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
  };

  const saveHistory = (q) => persistHistory([q, ...history.filter((h) => h !== q)].slice(0, 10));

  const removeHistory = (e, item) => {
    e.stopPropagation();
    persistHistory(history.filter((h) => h !== item));
  };

  const handleSearch = (sugg) => {
    const q = (sugg?.title || query).trim();
    if (!q) return;
    setShowDropdown(false); setMobileSearch(false);
    setQuery(q); saveHistory(q);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const goTo = (path) => { setShowUserMenu(false); navigate(path); };
  const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
  const dropdownItems = query.trim() ? suggestions : history.map((h) => ({ title: h, type: "history" }));

  // ── Mobile search overlay ──
  if (isMobile && mobileSearch) {
    return (
      <nav style={st.nav}>
        <div style={{ position: "relative", flex: 1 }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={st.searchForm}>
            <div style={st.inputWrap}>
              <input
                ref={inputRef}
                style={{ ...st.input, width: "calc(100vw - 100px)" }}
                type="text" placeholder="Search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              />
              {query && (
                <button type="button" style={st.clearBtn} onMouseDown={(e) => { e.preventDefault(); setQuery(""); setSuggestions([]); }} aria-label="Clear search">
                  <AiOutlineClose size={14} />
                </button>
              )}
            </div>
            <button type="submit" style={st.searchBtn} aria-label="Search"><AiOutlineSearch size={20} /></button>
            <button type="button" style={st.iconBtn} aria-label="Close search" onMouseDown={(e) => { e.preventDefault(); setMobileSearch(false); setQuery(""); setSuggestions([]); }}>
              <AiOutlineClose size={20} color="var(--text)" />
            </button>
          </form>
          {showDropdown && dropdownItems.length > 0 && (
            <SuggestionDropdown
              items={dropdownItems} showRecentLabel={!query.trim()}
              width="calc(100vw - 16px)" onPick={handleSearch} onRemove={removeHistory}
            />
          )}
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* ════════════════ TOP NAVBAR ════════════════ */}
      <nav style={st.nav}>
        <div style={st.navLeft}>
          <div style={st.logo} onClick={() => navigate("/")}>
            <MyTubeLogo size={32} />
            <span style={st.logoText}>MyTube</span>
          </div>
        </div>

        {!isMobile && (
          <div style={{ position: "relative" }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} style={st.searchForm}>
              <div style={st.inputWrap}>
                <input
                  ref={inputRef}
                  style={st.input}
                  type="text" placeholder="Search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                />
                {query && (
                  <button type="button" style={st.clearBtn} onMouseDown={(e) => { e.preventDefault(); setQuery(""); setSuggestions([]); }} aria-label="Clear search">
                    <AiOutlineClose size={14} />
                  </button>
                )}
              </div>
              <button type="submit" style={st.searchBtn} aria-label="Search"><AiOutlineSearch size={20} /></button>
            </form>
            {showDropdown && dropdownItems.length > 0 && (
              <SuggestionDropdown
                items={dropdownItems} showRecentLabel={!query.trim()}
                width={480} onPick={handleSearch} onRemove={removeHistory}
              />
            )}
          </div>
        )}

        <div style={st.navRight}>
          {isMobile && (
            <button style={st.iconBtn} onClick={() => setMobileSearch(true)} aria-label="Search">
              <AiOutlineSearch size={22} color="var(--text)" />
            </button>
          )}
          <button className={`theme-toggle ${dark ? "dark" : "light"}`} onClick={toggleTheme} title={dark ? "Switch to light theme" : "Switch to dark theme"} aria-label="Toggle theme">
            <div className="knob">{dark ? "🌙" : "☀️"}</div>
          </button>
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
                  <button style={st.menuItem} onClick={() => goTo("/liked")}><MdThumbUpOffAlt size={16} /> Liked videos</button>
                  <button style={st.menuItem} onClick={() => goTo("/subscriptions")}><MdSubscriptions size={16} /> Subscriptions</button>
                  <button style={st.menuItem} onClick={() => goTo("/trending")}><MdWhatshot size={16} /> Trending</button>
                  {syncing && <p style={st.syncingNote}>Syncing your subscriptions…</p>}
                  <hr style={st.menuDivider} />
                  <button style={{ ...st.menuItem, color: "#ff4444" }} onClick={() => { signOut(); setShowUserMenu(false); }}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <div style={st.signInWrap}>
              {sessionExpired && <span style={st.expiredNote}>Session expired</span>}
              <button style={st.signInBtn} onClick={() => signIn()}>Sign in</button>
            </div>
          )}
        </div>
      </nav>

      {/* ════════════════ PC LEFT SIDEBAR ════════════════ */}
      {!isMobile && (
        <aside style={st.sidebar}>
          <SideBtn
            icon={isActive("/") ? <MdHomeFilled size={24}/> : <MdHome size={24}/>}
            label="Home" active={isActive("/")} onClick={() => navigate("/")}
          />
          <SideBtn
            icon={isActive("/shorts") ? <MdSlowMotionVideo size={24}/> : <MdOutlineSlowMotionVideo size={24}/>}
            label="Shorts" active={isActive("/shorts")} onClick={() => navigate("/shorts")}
          />
          <SideBtn
            icon={isActive("/trending") ? <MdWhatshot size={24}/> : <MdOutlineWhatshot size={24}/>}
            label="Trending" active={isActive("/trending")} onClick={() => navigate("/trending")}
          />
          <SideBtn
            icon={isActive("/subscriptions") ? <MdSubscriptions size={24}/> : <MdOutlineSubscriptions size={24}/>}
            label="Subscriptions" active={isActive("/subscriptions")} onClick={() => navigate("/subscriptions")}
          />
          <SideBtn
            icon={user
              ? <img src={user.picture} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }}/>
              : <div style={st.youCircle}><span style={{ fontSize: 11, color: "var(--text-muted)" }}>You</span></div>
            }
            label="You" active={isActive("/you")} onClick={() => navigate("/you")}
          />
        </aside>
      )}

      {/* ════════════════ MOBILE BOTTOM NAV ════════════════ */}
      {isMobile && (
        <div className="mobile-nav">
          <MobBtn
            icon={isActive("/") ? <MdHomeFilled size={24}/> : <MdHome size={24}/>}
            label="Home" active={isActive("/")} onClick={() => navigate("/")}
          />
          <MobBtn
            icon={isActive("/shorts") ? <MdSlowMotionVideo size={24}/> : <MdOutlineSlowMotionVideo size={24}/>}
            label="Shorts" active={isActive("/shorts")} onClick={() => navigate("/shorts")}
          />
          <MobBtn
            icon={isActive("/trending") ? <MdWhatshot size={24}/> : <MdOutlineWhatshot size={24}/>}
            label="Trending" active={isActive("/trending")} onClick={() => navigate("/trending")}
          />
          <MobBtn
            icon={isActive("/subscriptions") ? <MdSubscriptions size={24}/> : <MdOutlineSubscriptions size={24}/>}
            label="Subscriptions" active={isActive("/subscriptions")} onClick={() => navigate("/subscriptions")}
          />
          <MobBtn
            icon={user
              ? <img src={user.picture} alt="" style={{ width: 24, height: 24, borderRadius: "50%", border: isActive("/you") ? "2px solid var(--text)" : "none" }}/>
              : <div style={st.youCircle}><span style={{ fontSize: 9, color: "var(--text-muted)" }}>You</span></div>
            }
            label="You" active={isActive("/you")}
            onClick={() => navigate("/you")}
          />
        </div>
      )}
    </>
  );
}

function SideBtn({ icon, label, active, onClick }) {
  return (
    <button
      style={{ ...sb.btn, background: active ? "var(--hover-bg)" : "transparent" }}
      onClick={onClick}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--hover-bg)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ color: active ? "var(--text)" : "var(--text-muted)", display: "flex" }}>{icon}</span>
      <span style={{ ...sb.label, color: active ? "var(--text)" : "var(--text-muted)", fontWeight: active ? 600 : 400 }}>{label}</span>
    </button>
  );
}

function MobBtn({ icon, label, active, onClick }) {
  const color = active ? "var(--text)" : "var(--text-muted)";
  return (
    <button style={nb.btn} onClick={onClick}>
      <span style={{ color, display: "flex", alignItems: "center" }}>{icon}</span>
      <span style={{ ...nb.label, color, fontWeight: active ? 600 : 400 }}>{label}</span>
    </button>
  );
}

const sb = {
  btn:   { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, width: "100%", border: "none", cursor: "pointer", padding: "14px 8px", borderRadius: 10, transition: "background 0.15s" },
  label: { fontSize: 10, textAlign: "center", lineHeight: 1.2 },
};

const nb = {
  btn:   { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", padding: "4px 0", gap: 3 },
  label: { fontSize: 10 },
};

const st = {
  nav:         { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", background: "var(--nav-bg)", borderBottom: "1px solid var(--border)", position: "fixed", top: 0, left: 0, right: 0, zIndex: 300, height: 56 },
  navLeft:     { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  navRight:    { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  logo:        { display: "flex", alignItems: "center", gap: 6, cursor: "pointer" },
  logoText:    { fontFamily: "var(--font-heading)", fontWeight: 700, color: "var(--text)", fontSize: 20, letterSpacing: "-0.02em" },
  searchForm:  { display: "flex", alignItems: "center" },
  inputWrap:   { position: "relative", display: "flex", alignItems: "center" },
  input:       { width: 480, padding: "8px 36px 8px 16px", borderRadius: "40px 0 0 40px", border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", outline: "none", fontSize: 15 },
  clearBtn:    { position: "absolute", right: 10, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" },
  searchBtn:   { padding: "8px 18px", borderRadius: "0 40px 40px 0", border: "1px solid var(--input-border)", borderLeft: "none", background: "var(--hover-bg)", color: "var(--text)", cursor: "pointer" },
  dropdown:    { position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border)", zIndex: 400, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" },
  dropLabel:   { fontSize: 11, color: "var(--text-muted)", padding: "8px 16px 4px", margin: 0 },
  suggItem:    { display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer" },
  suggThumb:   { width: 24, height: 24, borderRadius: "50%", objectFit: "cover" },
  suggText:    { fontSize: 14, color: "var(--text)", flex: 1 },
  channelBadge:{ fontSize: 10, color: "#3ea6ff", border: "1px solid #3ea6ff", borderRadius: 4, padding: "1px 5px" },
  removeBtn:   { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 },
  iconBtn:     { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 6 },
  avatar:      { width: 32, height: 32, borderRadius: "50%" },
  userMenu:    { position: "absolute", top: "calc(100% + 8px)", right: 0, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, minWidth: 230, zIndex: 500, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" },
  menuHeader:  { display: "flex", alignItems: "center", gap: 12, padding: 16 },
  menuAvatar:  { width: 40, height: 40, borderRadius: "50%" },
  menuName:    { fontSize: 14, fontWeight: 600, color: "var(--text)" },
  menuEmail:   { fontSize: 12, color: "var(--text-muted)" },
  menuDivider: { border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" },
  menuItem:    { display: "flex", alignItems: "center", gap: 12, width: "100%", background: "none", border: "none", color: "var(--text)", padding: "12px 16px", cursor: "pointer", fontSize: 14, textAlign: "left" },
  syncingNote: { fontSize: 11, color: "var(--text-muted)", padding: "0 16px 8px" },
  signInWrap:  { display: "flex", alignItems: "center", gap: 8 },
  signInBtn:   { background: "#3ea6ff", border: "none", color: "#000", fontWeight: 600, fontSize: 13, padding: "7px 16px", borderRadius: 18, cursor: "pointer", whiteSpace: "nowrap" },
  expiredNote: { fontSize: 11, color: "#ff8a4c", whiteSpace: "nowrap" },
  sidebar:     { position: "fixed", top: 56, left: 0, bottom: 0, width: 90, background: "var(--sidebar-bg)", borderRight: "1px solid var(--border)", overflowY: "auto", zIndex: 200, padding: "8px 0", display: "flex", flexDirection: "column", alignItems: "center" },
  youCircle:   { width: 24, height: 24, borderRadius: "50%", background: "var(--hover-bg)", display: "flex", alignItems: "center", justifyContent: "center" },
};
