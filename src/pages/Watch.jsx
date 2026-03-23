import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVideoById, getRelatedVideos, getVideoComments } from "../api/youtube";
import { useAuth } from "../context/AuthContext";
import { useMiniPlayer } from "../components/MiniPlayer";
import VideoCard from "../components/VideoCard";
import { AiOutlineLike, AiFillLike, AiOutlineClockCircle, AiFillClockCircle } from "react-icons/ai";
import { MdOutlineSubscriptions, MdShare } from "react-icons/md";

const parseDuration = (iso) => {
  if (!iso) return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = parseInt(m[1] || 0), min = parseInt(m[2] || 0), sec = parseInt(m[3] || 0);
  if (h > 0) return `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${min}:${String(sec).padStart(2, "0")}`;
};

// Parse timestamps like "1:23" or "12:34" in description into clickable links
function DescriptionWithTimestamps({ text, videoId }) {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? text : text?.slice(0, 250);
  const parts = (display || "").split(/(\d{1,2}:\d{2}(?::\d{2})?)/g);
  return (
    <div style={ds.wrap}>
      <p style={ds.text}>
        {parts.map((part, i) =>
          /^\d{1,2}:\d{2}(?::\d{2})?$/.test(part) ? (
            <a key={i} href={`https://www.youtube.com/watch?v=${videoId}&t=${part}`}
              target="_blank" rel="noreferrer" style={ds.ts}>{part}</a>
          ) : part
        )}
        {!expanded && text?.length > 250 && (
          <span style={ds.more} onClick={() => setExpanded(true)}> ...more</span>
        )}
        {expanded && (
          <span style={ds.more} onClick={() => setExpanded(false)}> show less</span>
        )}
      </p>
    </div>
  );
}
const ds = {
  wrap: { marginTop: 8 },
  text: { fontSize: 13, color: "#ccc", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  ts: { color: "#3ea6ff", textDecoration: "none", fontWeight: "bold" },
  more: { color: "#3ea6ff", cursor: "pointer", fontWeight: "bold" },
};

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, toggleSubscription, isSubscribed, toggleWatchLater, isWatchLater, toggleLiked, isLiked } = useAuth();
  const { setMini } = useMiniPlayer();
  const [video, setVideo]               = useState(null);
  const [related, setRelated]           = useState([]);
  const [comment, setComment]           = useState("");
  const [localComments, setLocalComments] = useState([]);
  const [ytComments, setYtComments]     = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsNextPage, setCommentsNextPage] = useState("");
  const [loadingMore, setLoadingMore]   = useState(false);
  const [copied, setCopied]             = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    setLocalComments([]); setYtComments([]); setCommentsNextPage("");
    const fetchData = async () => {
      try {
        const vRes = await getVideoById(id);
        const videoData = vRes.data.items[0];
        setVideo(videoData);
        const rRes = await getRelatedVideos(videoData.snippet.title);
        setRelated(rRes.data.items);
      } catch (err) { console.error(err); }
    };
    const fetchComments = async () => {
      setCommentsLoading(true);
      try {
        const res = await getVideoComments(id);
        setYtComments(res.data.items || []);
        setCommentsNextPage(res.data.nextPageToken || "");
      } catch { setYtComments([]); }
      setCommentsLoading(false);
    };
    fetchData();
    fetchComments();
  }, [id]);

  // Mini player on scroll away
  useEffect(() => {
    if (!video) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && video) {
        setMini({ id, title: video.snippet.title });
      } else {
        setMini(null);
      }
    }, { threshold: 0.1 });
    if (playerRef.current) obs.observe(playerRef.current);
    return () => obs.disconnect();
  }, [video, id, setMini]);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubscribe = () => {
    if (!user) return alert("Login karo!");
    toggleSubscription({
      id: video.snippet.channelId,
      name: video.snippet.channelTitle,
      avatar: `https://i.ytimg.com/vi/${id}/default.jpg`,
    });
  };

  const handleWatchLater = () => {
    if (!user) return alert("Login karo!");
    toggleWatchLater({
      id, title: video.snippet.title,
      thumb: video.snippet.thumbnails?.medium?.url,
      channel: video.snippet.channelTitle,
      duration: parseDuration(video.contentDetails?.duration),
    });
  };

  const handleLike = () => {
    if (!user) return alert("Login karo!");
    toggleLiked({
      id, title: video.snippet.title,
      thumb: video.snippet.thumbnails?.medium?.url,
      channel: video.snippet.channelTitle,
      duration: parseDuration(video.contentDetails?.duration),
    });
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (!user) return alert("Login karo!");
    if (!comment.trim()) return;
    setLocalComments([{ text: comment, user: user.name, pic: user.picture, id: Date.now() }, ...localComments]);
    setComment("");
  };

  if (!video) return <p style={styles.msg}>Loading...</p>;
  const { snippet, statistics } = video;
  const subscribed = isSubscribed(snippet.channelId);
  const wl = isWatchLater(id);
  const liked = isLiked(id);

  return (
    <div className="watch-container">
      <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>
      <div className="watch-main">
        <div style={styles.left}>
          <div ref={playerRef}>
            <iframe
              style={styles.player}
              src={`https://www.youtube.com/embed/${id}?autoplay=1`}
              title={snippet.title}
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          </div>
          <h2 style={styles.title}>{snippet.title}</h2>

          <div style={styles.actions}>
            <span style={styles.views}>{Number(statistics?.viewCount).toLocaleString()} views</span>
            <div style={styles.btns}>
              {/* Like */}
              <button onClick={handleLike} style={{ ...styles.btn, color: liked ? "#3ea6ff" : "#fff" }}>
                {liked ? <AiFillLike size={20} /> : <AiOutlineLike size={20} />}
                &nbsp;{Number(statistics?.likeCount).toLocaleString()}
              </button>
              {/* Watch Later */}
              <button onClick={handleWatchLater} style={{ ...styles.btn, color: wl ? "#ffcc00" : "#fff" }} title={wl ? "Remove from Watch Later" : "Watch Later"}>
                {wl ? <AiFillClockCircle size={20} /> : <AiOutlineClockCircle size={20} />}
              </button>
              {/* Share */}
              <button onClick={handleShare} style={styles.btn} title="Share">
                <MdShare size={20} />
                &nbsp;{copied ? "Copied!" : "Share"}
              </button>
              {/* Subscribe */}
              <button onClick={handleSubscribe} style={{ ...styles.subBtn, background: subscribed ? "#555" : "#ff0000" }}>
                <MdOutlineSubscriptions size={16} />
                &nbsp;{subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </div>
          </div>

          <div style={styles.channelRow}>
            <p style={styles.channelName} onClick={() => navigate(`/channel/${snippet.channelId}`)}>
              {snippet.channelTitle}
            </p>
            <DescriptionWithTimestamps text={snippet.description} videoId={id} />
          </div>

          {/* Comments */}
          <div style={styles.commentsSection}>
            <p style={styles.commentsTitle}>
              Comments {statistics?.commentCount ? `(${Number(statistics.commentCount).toLocaleString()})` : ""}
            </p>
            <form onSubmit={handleComment} style={styles.commentForm}>
              {user && <img src={user.picture} alt="" style={styles.commentAvatar} />}
              <input style={styles.commentInput} placeholder={user ? "Add a comment..." : "Login to comment..."} value={comment} onChange={(e) => setComment(e.target.value)} disabled={!user} />
              <button type="submit" style={styles.commentBtn} disabled={!user}>Post</button>
            </form>
            {localComments.map((c) => (
              <div key={c.id} style={styles.commentItem}>
                <img src={c.pic} alt="" style={styles.commentAvatar} />
                <div>
                  <p style={styles.commentUser}>{c.user} <span style={styles.youBadge}>You</span></p>
                  <p style={styles.commentText}>{c.text}</p>
                </div>
              </div>
            ))}
            {commentsLoading ? (
              <p style={styles.loadingMsg}>Comments load ho rahe hain...</p>
            ) : (
              ytComments.map((c) => {
                const top = c.snippet?.topLevelComment?.snippet;
                return (
                  <div key={c.id} style={styles.commentItem}>
                    <img src={top?.authorProfileImageUrl} alt="" style={styles.commentAvatar} />
                    <div>
                      <p style={styles.commentUser}>
                        {top?.authorDisplayName}
                        <span style={styles.likeCount}>👍 {top?.likeCount || 0}</span>
                      </p>
                      <p style={styles.commentText}>{top?.textDisplay}</p>
                      {c.snippet?.totalReplyCount > 0 && (
                        <p style={styles.replyCount}>{c.snippet.totalReplyCount} replies</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {commentsNextPage && (
              <button onClick={loadMoreComments} style={styles.loadMoreBtn} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more comments"}
              </button>
            )}
          </div>
        </div>

        <div className="watch-sidebar">
          <p style={{ color: "#aaa", marginBottom: 10 }}>Related Videos</p>
          <div className="video-grid" style={{ padding: 0 }}>
            {related.map((v) => v.snippet && <VideoCard key={v.id?.videoId} video={v} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backBtn: { background: "none", border: "none", color: "#aaa", fontSize: 14, cursor: "pointer", marginBottom: 12, padding: 0 },
  left: { flex: 1, minWidth: 0 },
  player: { width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 8 },
  title: { marginTop: 12, fontSize: 18, fontWeight: "bold" },
  actions: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0", borderBottom: "1px solid #333", paddingBottom: 10, flexWrap: "wrap", gap: 8 },
  views: { color: "#aaa", fontSize: 13 },
  btns: { display: "flex", gap: 8, flexWrap: "wrap" },
  btn: { display: "flex", alignItems: "center", background: "#272727", border: "none", color: "#fff", padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13 },
  subBtn: { display: "flex", alignItems: "center", border: "none", color: "#fff", padding: "7px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: "bold" },
  channelRow: { margin: "10px 0", background: "#1a1a1a", borderRadius: 10, padding: 12 },
  channelName: { fontWeight: "bold", fontSize: 15, cursor: "pointer", marginBottom: 6, color: "#fff" },
  commentsSection: { marginTop: 20 },
  commentsTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  commentForm: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  commentAvatar: { width: 32, height: 32, borderRadius: "50%", flexShrink: 0, objectFit: "cover" },
  commentInput: { flex: 1, background: "transparent", border: "none", borderBottom: "1px solid #444", color: "#fff", fontSize: 13, padding: "6px 0", outline: "none" },
  commentBtn: { background: "#3ea6ff", border: "none", color: "#000", padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontWeight: "bold", fontSize: 12 },
  commentItem: { display: "flex", gap: 10, marginBottom: 16 },
  commentUser: { fontSize: 12, fontWeight: "bold", color: "#aaa", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 },
  commentText: { fontSize: 13, color: "#fff" },
  youBadge: { fontSize: 10, background: "#3ea6ff", color: "#000", borderRadius: 4, padding: "1px 5px" },
  likeCount: { fontSize: 11, color: "#aaa", fontWeight: "normal" },
  replyCount: { fontSize: 12, color: "#3ea6ff", marginTop: 4 },
  loadingMsg: { color: "#aaa", fontSize: 13, textAlign: "center", padding: "20px 0" },
  loadMoreBtn: { display: "block", margin: "16px auto", background: "#272727", border: "none", color: "#3ea6ff", padding: "8px 20px", borderRadius: 20, cursor: "pointer", fontSize: 13 },
  msg: { textAlign: "center", marginTop: 40, color: "#aaa" },
};
