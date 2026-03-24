import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getShorts, getShortsByIds } from "../api/youtube";
import { useAuth } from "../context/AuthContext";
import { AiOutlineLike, AiFillLike, AiOutlineClose } from "react-icons/ai";
import { MdShare, MdOutlineSubscriptions, MdPlayArrow, MdPause } from "react-icons/md";

const toSecs = (iso) => {
  if (!iso) return 999;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 999;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
};

export default function Shorts() {
  const { id: startId } = useParams();
  const navigate = useNavigate();
  const { user, toggleSubscription, isSubscribed, toggleLiked, isLiked } = useAuth();

  const [shorts, setShorts]       = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState(false);
  const [paused, setPaused]       = useState(false);

  const nextPageRef  = useRef("");
  const fetchingRef  = useRef(false);
  const containerRef = useRef(null);
  const scrolledRef  = useRef(false);
  const shortsLenRef = useRef(0);
  const iframeRefs   = useRef({});

  const fetchMore = useCallback(async (reset = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await getShorts(reset ? "" : nextPageRef.current);
      nextPageRef.current = res.data.nextPageToken || "";
      const ids = (res.data.items || []).map((v) => v.id?.videoId).filter(Boolean);
      if (ids.length) {
        const details = await getShortsByIds(ids);
        const filtered = (details.data.items || []).filter((v) => toSecs(v.contentDetails?.duration) <= 180);
        if (reset && startId) {
          const idx = filtered.findIndex((v) => v.id === startId);
          if (idx > 0) { filtered.unshift(...filtered.splice(idx, 1)); }
          else if (idx < 0) {
            const { getVideoById } = await import("../api/youtube");
            const vRes = await getVideoById(startId);
            const startVideo = vRes.data.items?.[0];
            if (startVideo) filtered.unshift(startVideo);
          }
        }
        setShorts((prev) => reset ? filtered : [...prev, ...filtered]);
      }
    } catch (err) { console.error(err); }
    finally { fetchingRef.current = false; if (reset) setLoading(false); }
  }, [startId]);

  useEffect(() => { setLoading(true); fetchMore(true); }, []);

  useEffect(() => {
    if (!startId || scrolledRef.current || shorts.length === 0) return;
    const idx = shorts.findIndex((v) => v.id === startId);
    if (idx >= 0) {
      scrolledRef.current = true;
      setActiveIdx(idx);
      if (idx > 0) {
        setTimeout(() => {
          containerRef.current?.scrollTo({ top: idx * containerRef.current.clientHeight, behavior: "instant" });
        }, 0);
      }
    }
  }, [shorts, startId]);

  useEffect(() => { shortsLenRef.current = shorts.length; }, [shorts]);

  // Reset paused state when active short changes
  useEffect(() => { setPaused(false); }, [activeIdx]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActiveIdx(idx);
      if (idx >= shortsLenRef.current - 4) fetchMore();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [fetchMore]);

  const handleTap = (videoId) => {
    const iframe = iframeRefs.current[videoId];
    if (!iframe) return;
    const cmd = paused ? "playVideo" : "pauseVideo";
    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: cmd, args: [] }), "*");
    setPaused((p) => !p);
  };

  const handleLike = (v) => {
    if (!user) return alert("Login karo!");
    toggleLiked({ id: v.id, title: v.snippet.title, thumb: v.snippet.thumbnails?.medium?.url, channel: v.snippet.channelTitle });
  };

  const handleSubscribe = (v) => {
    if (!user) return alert("Login karo!");
    toggleSubscription({ id: v.snippet.channelId, name: v.snippet.channelTitle, avatar: v.snippet.thumbnails?.default?.url });
  };

  const handleShare = (v) => {
    navigator.clipboard.writeText(`https://www.youtube.com/shorts/${v.id}`);
    setCopied(v.id);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div style={s.loadWrap}><p style={s.loadMsg}>Loading Shorts...</p></div>
  );

  return (
    <div style={s.page}>
      <button style={s.closeBtn} onClick={() => navigate(-1)}>
        <AiOutlineClose size={22} color="#fff" />
      </button>

      <div ref={containerRef} style={s.container}>
        {shorts.map((v, idx) => {
          const liked = isLiked(v.id);
          const subbed = isSubscribed(v.snippet.channelId);
          const isActive = activeIdx === idx;
          return (
            <div key={v.id} style={s.slide}>
              <div style={s.playerWrap}>
                {isActive ? (
                  <>
                    <iframe
                      ref={(el) => { if (el) iframeRefs.current[v.id] = el; }}
                      src={`https://www.youtube.com/embed/${v.id}?autoplay=1&loop=1&playlist=${v.id}&controls=0&modestbranding=1&rel=0&enablejsapi=1`}
                      style={s.iframe}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      title={v.snippet.title}
                    />
                    {/* Tap overlay for pause/play */}
                    <div style={s.tapOverlay} onClick={() => handleTap(v.id)}>
                      {paused && (
                        <div style={s.pauseIcon}>
                          <MdPlayArrow size={52} color="#fff" />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <img
                    src={v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url}
                    alt={v.snippet.title}
                    style={{ ...s.iframe, objectFit: "cover" }}
                  />
                )}

                <div style={s.overlay}>
                  <div style={s.info}>
                    <p style={s.channelName} onClick={() => navigate(`/channel/${v.snippet.channelId}`)}>
                      @{v.snippet.channelTitle}
                    </p>
                    <p style={s.title}>{v.snippet.title?.slice(0, 80)}</p>
                    <p style={s.views}>{Number(v.statistics?.viewCount || 0).toLocaleString()} views</p>
                  </div>
                </div>

                <div style={s.actions}>
                  <button style={s.actionBtn} onClick={() => handleLike(v)}>
                    {liked ? <AiFillLike size={28} color="#3ea6ff" /> : <AiOutlineLike size={28} color="#fff" />}
                    <span style={s.actionLabel}>{Number(v.statistics?.likeCount || 0).toLocaleString()}</span>
                  </button>
                  <button style={s.actionBtn} onClick={() => handleShare(v)}>
                    <MdShare size={26} color="#fff" />
                    <span style={s.actionLabel}>{copied === v.id ? "Copied!" : "Share"}</span>
                  </button>
                  <button style={s.actionBtn} onClick={() => handleSubscribe(v)}>
                    <MdOutlineSubscriptions size={26} color={subbed ? "#ff0000" : "#fff"} />
                    <span style={s.actionLabel}>{subbed ? "Subbed" : "Sub"}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PLAYER_H = "min(90vh, calc(100vw * 16 / 9))";
const PLAYER_W = "min(420px, calc(100vh * 9 / 16), 100vw)";

const s = {
  page: { position: "fixed", inset: 0, background: "#000", zIndex: 500, display: "flex", justifyContent: "center" },
  closeBtn: {
    position: "fixed", top: 14, left: 14, zIndex: 600,
    background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%",
    width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },
  container: {
    width: PLAYER_W, height: "100dvh", overflowY: "scroll",
    scrollSnapType: "y mandatory", scrollBehavior: "smooth", scrollbarWidth: "none",
  },
  slide: {
    height: "100dvh", scrollSnapAlign: "start", scrollSnapStop: "always",
    display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
  },
  playerWrap: { position: "relative", width: "100%", height: PLAYER_H, maxHeight: "100dvh", background: "#111", overflow: "hidden" },
  iframe: { width: "100%", height: "100%", border: "none", display: "block" },
  tapOverlay: {
    position: "absolute", inset: 0, zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  pauseIcon: {
    background: "rgba(0,0,0,0.5)", borderRadius: "50%",
    width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center",
  },
  overlay: {
    position: "absolute", bottom: 0, left: 0, right: 60, zIndex: 11,
    padding: "60px 14px 20px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
    pointerEvents: "none",
  },
  info: { pointerEvents: "all" },
  channelName: { fontSize: 14, fontWeight: "bold", color: "#fff", marginBottom: 4, cursor: "pointer" },
  title: { fontSize: 13, color: "#eee", lineHeight: 1.4, marginBottom: 4 },
  views: { fontSize: 12, color: "#bbb" },
  actions: {
    position: "absolute", right: 8, bottom: 80, zIndex: 11,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
  },
  actionBtn: { background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  actionLabel: { fontSize: 11, color: "#fff" },
  loadWrap: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#000" },
  loadMsg: { color: "#aaa", fontSize: 15 },
};
