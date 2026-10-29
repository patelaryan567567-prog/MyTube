import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVideoById, getRelatedVideos, getVideoComments } from "../api/youtube";
import { useAuth } from "../context/AuthContext";
import VideoCard from "../components/VideoCard";
import { formatDuration } from "../utils/duration";
import { AiOutlineLike, AiFillLike, AiOutlineClockCircle, AiFillClockCircle } from "react-icons/ai";
import { MdOutlineSubscriptions, MdShare } from "react-icons/md";

const commentsKey = (id) => `mytube_comments_${id}`;
const loadLocalComments = (id) => {
  try { return JSON.parse(localStorage.getItem(commentsKey(id))) || []; } catch { return []; }
};

// YouTube returns comment text as HTML; convert it to plain text safely.
const htmlToText = (html = "") => {
  const doc = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, "\n"), "text/html");
  return doc.body.textContent || "";
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
        {!expanded && text?.length > 200 && <span style={ds.more} onClick={() => setExpanded(true)}> …more</span>}
        {expanded && <span style={ds.more} onClick={() => setExpanded(false)}> Show less</span>}
      </p>
    </div>
  );
}
const ds = {
  wrap: { marginTop: 6 },
  text: { fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  ts:   { color: "#3ea6ff", textDecoration: "none", fontWeight: 600 },
  more: { color: "#3ea6ff", cursor: "pointer", fontWeight: 600 },
};

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, toggleSubscription, isSubscribed, toggleWatchLater, isWatchLater, toggleLiked, isLiked } = useAuth();

  const [video, setVideo]                       = useState(null);
  const [notFound, setNotFound]                 = useState(false);
  const [related, setRelated]                   = useState([]);
  const [comment, setComment]                   = useState("");
  const [localComments, setLocalComments]       = useState([]);
  const [ytComments, setYtComments]             = useState([]);
  const [commentsLoading, setCommentsLoading]   = useState(false);
  const [commentsNextPage, setCommentsNextPage] = useState("");
  const [loadingMore, setLoadingMore]           = useState(false);
  const [copied, setCopied]                     = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLocalComments(loadLocalComments(id));
    setYtComments([]); setCommentsNextPage(""); setVideo(null); setRelated([]); setNotFound(false);

    (async () => {
      try {
        const vRes = await getVideoById(id);
        const v = vRes.data.items?.[0];
        if (cancelled) return;
        if (!v) { setNotFound(true); return; }
        setVideo(v);
        const rRes = await getRelatedVideos(v.snippet.title);
        if (!cancelled) setRelated(rRes.data.items || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setNotFound(true);
      }
    })();

    (async () => {
      setCommentsLoading(true);
      try {
        const res = await getVideoComments(id);
        if (cancelled) return;
        setYtComments(res.data.items || []);
        setCommentsNextPage(res.data.nextPageToken || "");
      } catch { if (!cancelled) setYtComments([]); }
      if (!cancelled) setCommentsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [id]);

  const loadMoreComments = async () => {
    if (!commentsNextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getVideoComments(id, commentsNextPage);
      setYtComments((p) => [...p, ...(res.data.items || [])]);
      setCommentsNextPage(res.data.nextPageToken || "");
    } catch (e) { console.error(e); }
    setLoadingMore(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${id}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const savedVideo = () => ({
    id,
    title: video.snippet.title,
    thumb: video.snippet.thumbnails?.medium?.url,
    channel: video.snippet.channelTitle,
    duration: formatDuration(video.contentDetails?.duration),
  });

  const handleSubscribe = () => {
    if (!user) return alert("Please sign in to subscribe.");
    toggleSubscription({
      id: video.snippet.channelId,
      name: video.snippet.channelTitle,
      avatar: video.snippet.thumbnails?.default?.url,
    });
  };

  const handleWatchLater = () => {
    if (!user) return alert("Please sign in to save videos to Watch Later.");
    toggleWatchLater(savedVideo());
  };

  const handleLike = () => {
    if (!user) return alert("Please sign in to like videos.");
    toggleLiked(savedVideo());
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (!user || !comment.trim()) return;
    const entry = { text: comment.trim(), user: user.name, pic: user.picture, id: Date.now() };
    const updated = [entry, ...localComments];
    setLocalComments(updated);
    try { localStorage.setItem(commentsKey(id), JSON.stringify(updated)); } catch { /* storage unavailable */ }
    setComment("");
  };

  if (!video) {
    return (
      <div className="page-content">
        <p style={s.msg}>{notFound ? "This video isn't available." : "Loading…"}</p>
      </div>
    );
  }

  const { snippet, statistics } = video;
  const subscribed = isSubscribed(snippet.channelId);
  const wl = isWatchLater(id);
  const liked = isLiked(id);

  return (
    <div className="page-content">
      <div className="watch-container">
        <div className="watch-main">
          <div className="watch-left">
            <iframe
              className="watch-player"
              src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
              title={snippet.title}
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
            />

            <h2 style={s.title}>{snippet.title}</h2>

            <div style={s.actions}>
              <span style={s.views}>{Number(statistics?.viewCount || 0).toLocaleString()} views</span>
              <div style={s.btns}>
                <button onClick={handleLike} style={{ ...s.btn, color: liked ? "#3ea6ff" : "var(--text)" }}>
                  {liked ? <AiFillLike size={20}/> : <AiOutlineLike size={20}/>}
                  <span>{Number(statistics?.likeCount || 0).toLocaleString()}</span>
                </button>
                <button onClick={handleWatchLater} style={{ ...s.btn, color: wl ? "#ffcc00" : "var(--text)" }}>
                  {wl ? <AiFillClockCircle size={20}/> : <AiOutlineClockCircle size={20}/>}
                  <span>Save</span>
                </button>
                <button onClick={handleShare} style={s.btn}>
                  <MdShare size={20}/>
                  <span>{copied ? "Link copied" : "Share"}</span>
                </button>
                <button onClick={handleSubscribe} style={{ ...s.subBtn, background: subscribed ? "#555" : "#ff0000" }}>
                  <MdOutlineSubscriptions size={16}/>
                  <span>{subscribed ? "Subscribed" : "Subscribe"}</span>
                </button>
              </div>
            </div>

            <div style={s.channelBox}>
              <p style={s.channelName} onClick={() => navigate(`/channel/${snippet.channelId}`)}>
                {snippet.channelTitle}
              </p>
              <Description text={snippet.description} videoId={id} />
            </div>

            <div style={s.commentsWrap}>
              <h3 style={s.commentsTitle}>
                Comments {statistics?.commentCount ? `· ${Number(statistics.commentCount).toLocaleString()}` : ""}
              </h3>
              <form onSubmit={handleComment} style={s.commentForm}>
                {user && <img src={user.picture} alt="" style={s.cAvatar}/>}
                <input
                  style={s.cInput}
                  placeholder={user ? "Add a comment (saved on this device only)" : "Sign in to comment"}
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
                ? <p style={s.loadMsg}>Loading comments…</p>
                : ytComments.length === 0 && localComments.length === 0
                  ? <p style={s.loadMsg}>No comments to show.</p>
                  : ytComments.map((c) => {
                      const top = c.snippet?.topLevelComment?.snippet;
                      return (
                        <div key={c.id} style={s.cItem}>
                          <img src={top?.authorProfileImageUrl} alt="" style={s.cAvatar}/>
                          <div>
                            <p style={s.cUser}>
                              {top?.authorDisplayName}
                              <span style={s.likeCount}>{top?.likeCount || 0} likes</span>
                            </p>
                            <p style={s.cText}>{htmlToText(top?.textDisplay)}</p>
                            {c.snippet?.totalReplyCount > 0 && (
                              <p style={s.replyCount}>{c.snippet.totalReplyCount} {c.snippet.totalReplyCount === 1 ? "reply" : "replies"}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
              }
              {commentsNextPage && (
                <button onClick={loadMoreComments} style={s.loadMoreBtn} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Show more comments"}
                </button>
              )}
            </div>
          </div>

          <div className="watch-sidebar">
            <h3 style={s.relatedTitle}>Up next</h3>
            {related
              .filter((v) => v.snippet && v.id?.videoId !== id)
              .map((v) => <VideoCard key={v.id?.videoId} video={v}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  title:        { marginTop: 12, fontSize: 19, fontWeight: 600, lineHeight: 1.35, color: "var(--text)" },
  actions:      { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0", borderBottom: "1px solid var(--border)", paddingBottom: 12, flexWrap: "wrap", gap: 8 },
  views:        { color: "var(--text-muted)", fontSize: 13 },
  btns:         { display: "flex", gap: 8, flexWrap: "wrap" },
  btn:          { display: "flex", alignItems: "center", gap: 6, background: "var(--hover-bg)", border: "none", color: "var(--text)", padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 500 },
  subBtn:       { display: "flex", alignItems: "center", gap: 6, border: "none", color: "#fff", padding: "7px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  channelBox:   { background: "var(--card-bg)", borderRadius: 10, padding: "12px 14px", margin: "12px 0", border: "1px solid var(--border)" },
  channelName:  { fontWeight: 600, fontSize: 15, cursor: "pointer", marginBottom: 6, color: "var(--text)" },
  commentsWrap: { marginTop: 20 },
  commentsTitle:{ fontSize: 17, fontWeight: 600, marginBottom: 14, color: "var(--text)" },
  commentForm:  { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  cAvatar:      { width: 32, height: 32, borderRadius: "50%", flexShrink: 0, objectFit: "cover" },
  cInput:       { flex: 1, background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text)", fontSize: 13, padding: "6px 0", outline: "none" },
  cBtn:         { background: "#3ea6ff", border: "none", color: "#000", padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontWeight: 600, fontSize: 12 },
  cItem:        { display: "flex", gap: 10, marginBottom: 16 },
  cUser:        { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 },
  cText:        { fontSize: 13, color: "var(--text)", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  youBadge:     { fontSize: 10, background: "#3ea6ff", color: "#000", borderRadius: 4, padding: "1px 5px" },
  likeCount:    { fontSize: 11, color: "var(--text-muted)", fontWeight: 400 },
  replyCount:   { fontSize: 12, color: "#3ea6ff", marginTop: 4 },
  loadMsg:      { color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" },
  loadMoreBtn:  { display: "block", margin: "16px auto", background: "var(--hover-bg)", border: "none", color: "#3ea6ff", padding: "8px 20px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 500 },
  relatedTitle: { color: "var(--text-muted)", fontSize: 15, fontWeight: 600, marginBottom: 12 },
  msg:          { textAlign: "center", marginTop: 60, color: "var(--text-muted)" },
};
