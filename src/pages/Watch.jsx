import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVideoById, getRelatedVideos, getVideoComments } from "../api/youtube";
import { useAuth } from "../context/AuthContext";
import VideoCard from "../components/VideoCard";
import { AiOutlineLike, AiFillLike, AiOutlineClockCircle, AiFillClockCircle } from "react-icons/ai";
import { MdOutlineSubscriptions, MdShare } from "react-icons/md";

const parseDuration = (iso) => {
  if (!iso) return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = parseInt(m[1] || 0), min = parseInt(m[2] || 0), sec = parseInt(m[3] || 0);
  return h > 0 ? `${h}:${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${min}:${String(sec).padStart(2,"0")}`;
};

function Description({ text, videoId }) {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? text : text?.slice(0, 200);
  const parts = (display || "").split(/(\d{1,2}:\d{2}(?::\d{2})?)/g);
  return (
    <div style={ds.wrap}>
      <p style={ds.text}>
        {parts.map((p, i) =>
          /^\d{1,2}:\d{2}(?::\d{2})?$/.test(p)
            ? <a key={i} href={`https://www.youtube.com/watch?v=${videoId}&t=${p}`} target="_blank" rel="noreferrer" style={ds.ts}>{p}</a>
            : p
        )}
        {!expanded && text?.length > 200 && <span style={ds.more} onClick={() => setExpanded(true)}> ...more</span>}
        {expanded && <span style={ds.more} onClick={() => setExpanded(false)}> show less</span>}
      </p>
    </div>
  );
}
const ds = {
  wrap: { marginTop: 6 },
  text: { fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  ts:   { color: "#3ea6ff", textDecoration: "none", fontWeight: "bold" },
  more: { color: "#3ea6ff", cursor: "pointer", fontWeight: "bold" },
};

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, toggleSubscription, isSubscribed, toggleWatchLater, isWatchLater, toggleLiked, isLiked } = useAuth();

  const [video, setVideo]                   = useState(null);
  const [related, setRelated]               = useState([]);
  const [comment, setComment]               = useState("");
  const [localComments, setLocalComments]   = useState([]);
  const [ytComments, setYtComments]         = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsNextPage, setCommentsNextPage] = useState("");
  const [loadingMore, setLoadingMore]       = useState(false);
  const [copied, setCopied]                 = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    setLocalComments([]); setYtComments([]); setCommentsNextPage(""); setVideo(null);
    (async () => {
      try {
        const vRes = await getVideoById(id);
        const v = vRes.data.items[0];
        setVideo(v);
        const rRes = await getRelatedVideos(v.snippet.title);
        setRelated(rRes.data.items);
      } catch (e) { console.error(e); }
    })();
    (async () => {
      setCommentsLoading(true);
      try {
        const res = await getVideoComments(id);
        setYtComments(res.data.items || []);
        setCommentsNextPage(res.data.nextPageToken || "");
      } catch { setYtComments([]); }
      setCommentsLoading(false);
    })();
  }, [id]);

  const loadMoreComments = async () => {
    if (!commentsNextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getVideoComments(id, commentsNextPage);
      setYtComments((p) => [...p, ...(res.data.items || [])]);
      setCommentsNextPage(res.data.nextPageToken || "");
    } catch {}
    setLoadingMore(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${id}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleSubscribe = () => {
    if (!user) return alert("Login karo!");
    toggleSubscription({ id: video.snippet.channelId, name: video.snippet.channelTitle, avatar: video.snippet.thumbnails?.default?.url });
  };

  const handleWatchLater = () => {
    if (!user) return alert("Login karo!");
    toggleWatchLater({ id, title: video.snippet.title, thumb: video.snippet.thumbnails?.medium?.url, channel: video.snippet.channelTitle, duration: parseDuration(video.contentDetails?.duration) });
  };

  const handleLike = () => {
    if (!user) return alert("Login karo!");
    toggleLiked({ id, title: video.snippet.title, thumb: video.snippet.thumbnails?.medium?.url, channel: video.snippet.channelTitle, duration: parseDuration(video.contentDetails?.duration) });
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (!user || !comment.trim()) return;
    setLocalComments([{ text: comment, user: user.name, pic: user.picture, id: Date.now() }, ...localComments]);
    setComment("");
  };

  if (!video) return <div className="page-content"><p style={s.msg}>Loading...</p></div>;
  const { snippet, statistics } = video;
  const subscribed = isSubscribed(snippet.channelId);
  const wl = isWatchLater(id);
  const liked = isLiked(id);

  return (
    <div className="page-content">
      <div className="watch-container">
        <div className="watch-main">
          {/* Left: Player + Info + Comments */}
          <div className="watch-left">
            {/* Player */}
            <div ref={playerRef}>
              <iframe
                className="watch-player"
                src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
                title={snippet.title}
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            </div>

            {/* Title */}
            <h2 style={s.title}>{snippet.title}</h2>

            {/* Actions row */}
            <div style={s.actions}>
              <span style={s.views}>{Number(statistics?.viewCount || 0).toLocaleString()} views</span>
              <div style={s.btns}>
                <button onClick={handleLike} style={{ ...s.btn, color: liked ? "#3ea6ff" : "var(--text)" }}>
                  {liked ? <AiFillLike size={20}/> : <AiOutlineLike size={20}/>}
                  <span>{Number(statistics?.likeCount || 0).toLocaleString()}</span>
                </button>
                <button onClick={handleWatchLater} style={{ ...s.btn, color: wl ? "#ffcc00" : "var(--text)" }}>
                  {wl ? <AiFillClockCircle size={20}/> : <AiOutlineClockCircle size={20}/>}
                  <span style={s.btnLabel}>Later</span>
                </button>
                <button onClick={handleShare} style={s.btn}>
                  <MdShare size={20}/>
                  <span style={s.btnLabel}>{copied ? "Copied!" : "Share"}</span>
                </button>
                <button onClick={handleSubscribe} style={{ ...s.subBtn, background: subscribed ? "#555" : "#ff0000" }}>
                  <MdOutlineSubscriptions size={16}/>
                  <span>{subscribed ? "Subscribed" : "Subscribe"}</span>
                </button>
              </div>
            </div>

            {/* Channel + Description */}
            <div style={s.channelBox}>
              <p style={s.channelName} onClick={() => navigate(`/channel/${snippet.channelId}`)}>
                {snippet.channelTitle}
              </p>
              <Description text={snippet.description} videoId={id} />
            </div>

            {/* Comments */}
            <div style={s.commentsWrap}>
              <p style={s.commentsTitle}>
                Comments {statistics?.commentCount ? `(${Number(statistics.commentCount).toLocaleString()})` : ""}
              </p>
              <form onSubmit={handleComment} style={s.commentForm}>
                {user && <img src={user.picture} alt="" style={s.cAvatar}/>}
                <input
                  style={s.cInput}
                  placeholder={user ? "Add a comment..." : "Login to comment..."}
                  value={comment} onChange={(e) => setComment(e.target.value)} disabled={!user}
                />
                <button type="submit" style={s.cBtn} disabled={!user}>Post</button>
              </form>

              {localComments.map((c) => (
                <div key={c.id} style={s.cItem}>
                  <img src={c.pic} alt="" style={s.cAvatar}/>
                  <div>
                    <p style={s.cUser}>{c.user} <span style={s.youBadge}>You</span></p>
                    <p style={s.cText}>{c.text}</p>
                  </div>
                </div>
              ))}

              {commentsLoading
                ? <p style={s.loadMsg}>Loading comments...</p>
                : ytComments.map((c) => {
                    const top = c.snippet?.topLevelComment?.snippet;
                    return (
                      <div key={c.id} style={s.cItem}>
                        <img src={top?.authorProfileImageUrl} alt="" style={s.cAvatar}/>
                        <div>
                          <p style={s.cUser}>
                            {top?.authorDisplayName}
                            <span style={s.likeCount}>👍 {top?.likeCount || 0}</span>
                          </p>
                          <p style={s.cText}>{top?.textDisplay}</p>
                          {c.snippet?.totalReplyCount > 0 && <p style={s.replyCount}>{c.snippet.totalReplyCount} replies</p>}
                        </div>
                      </div>
                    );
                  })
              }
              {commentsNextPage && (
                <button onClick={loadMoreComments} style={s.loadMoreBtn} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : "Load more comments"}
                </button>
              )}
            </div>
          </div>

          {/* Right: Related Videos */}
          <div className="watch-sidebar">
            <p style={s.relatedTitle}>Up next</p>
            {related.map((v) => v.snippet && <VideoCard key={v.id?.videoId} video={v}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  title:        { marginTop: 12, fontSize: 18, fontWeight: "bold", lineHeight: 1.4, color: "var(--text)" },
  actions:      { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0", borderBottom: "1px solid var(--border)", paddingBottom: 12, flexWrap: "wrap", gap: 8 },
  views:        { color: "var(--text-muted)", fontSize: 13 },
  btns:         { display: "flex", gap: 8, flexWrap: "wrap" },
  btn:          { display: "flex", alignItems: "center", gap: 6, background: "var(--hover-bg)", border: "none", color: "var(--text)", padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13 },
  btnLabel:     { fontSize: 13 },
  subBtn:       { display: "flex", alignItems: "center", gap: 6, border: "none", color: "#fff", padding: "7px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: "bold" },
  channelBox:   { background: "var(--card-bg)", borderRadius: 10, padding: "12px 14px", margin: "12px 0", border: "1px solid var(--border)" },
  channelName:  { fontWeight: "bold", fontSize: 15, cursor: "pointer", marginBottom: 6, color: "var(--text)" },
  commentsWrap: { marginTop: 20 },
  commentsTitle:{ fontSize: 16, fontWeight: "bold", marginBottom: 14, color: "var(--text)" },
  commentForm:  { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  cAvatar:      { width: 32, height: 32, borderRadius: "50%", flexShrink: 0, objectFit: "cover" },
  cInput:       { flex: 1, background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text)", fontSize: 13, padding: "6px 0", outline: "none" },
  cBtn:         { background: "#3ea6ff", border: "none", color: "#000", padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontWeight: "bold", fontSize: 12 },
  cItem:        { display: "flex", gap: 10, marginBottom: 16 },
  cUser:        { fontSize: 12, fontWeight: "bold", color: "var(--text-muted)", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 },
  cText:        { fontSize: 13, color: "var(--text)", lineHeight: 1.5 },
  youBadge:     { fontSize: 10, background: "#3ea6ff", color: "#000", borderRadius: 4, padding: "1px 5px" },
  likeCount:    { fontSize: 11, color: "var(--text-muted)", fontWeight: "normal" },
  replyCount:   { fontSize: 12, color: "#3ea6ff", marginTop: 4 },
  loadMsg:      { color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" },
  loadMoreBtn:  { display: "block", margin: "16px auto", background: "var(--hover-bg)", border: "none", color: "#3ea6ff", padding: "8px 20px", borderRadius: 20, cursor: "pointer", fontSize: 13 },
  relatedTitle: { color: "var(--text-muted)", fontSize: 14, fontWeight: "bold", marginBottom: 12 },
  msg:          { textAlign: "center", marginTop: 60, color: "var(--text-muted)" },
};
