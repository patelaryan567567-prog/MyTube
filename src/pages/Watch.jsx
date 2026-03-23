import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVideoById, getRelatedVideos } from "../api/youtube";
import { useAuth } from "../context/AuthContext";
import VideoCard from "../components/VideoCard";
import { AiOutlineLike, AiFillLike } from "react-icons/ai";
import { MdOutlineSubscriptions } from "react-icons/md";

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [related, setRelated] = useState([]);
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);

  useEffect(() => {
    setLiked(false);
    setSubscribed(false);
    setComments([]);
    const fetch = async () => {
      try {
        const vRes = await getVideoById(id);
        const videoData = vRes.data.items[0];
        setVideo(videoData);
        const rRes = await getRelatedVideos(videoData.snippet.title);
        setRelated(rRes.data.items);
      } catch (err) {
        console.error(err);
      }
    };
    fetch();
  }, [id]);

  const handleLike = () => {
    if (!user) return alert("Like karne ke liye login karo!");
    setLiked(!liked);
  };

  const handleSubscribe = () => {
    if (!user) return alert("Subscribe karne ke liye login karo!");
    setSubscribed(!subscribed);
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (!user) return alert("Comment karne ke liye login karo!");
    if (!comment.trim()) return;
    setComments([{ text: comment, user: user.name, pic: user.picture, id: Date.now() }, ...comments]);
    setComment("");
  };

  if (!video) return <p style={styles.msg}>Loading...</p>;

  const { snippet, statistics } = video;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>
      <div style={styles.main}>
        <div style={styles.left}>
          <iframe
            style={styles.player}
            src={`https://www.youtube.com/embed/${id}?autoplay=1`}
            title={snippet.title}
            allowFullScreen
            allow="autoplay; encrypted-media"
          />
          <h2 style={styles.title}>{snippet.title}</h2>
          <div style={styles.actions}>
            <span style={styles.views}>{Number(statistics?.viewCount).toLocaleString()} views</span>
            <div style={styles.btns}>
              <button onClick={handleLike} style={{ ...styles.btn, color: liked ? "#3ea6ff" : "#fff" }}>
                {liked ? <AiFillLike size={20} /> : <AiOutlineLike size={20} />}
                &nbsp;{Number(statistics?.likeCount).toLocaleString()}
              </button>
              <button onClick={handleSubscribe} style={{ ...styles.subBtn, background: subscribed ? "#555" : "#ff0000" }}>
                <MdOutlineSubscriptions size={16} />
                &nbsp;{subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </div>
          </div>
          <div style={styles.channelRow}>
            <p style={styles.channelName}>{snippet.channelTitle}</p>
            <p style={styles.desc}>{snippet.description?.slice(0, 200)}...</p>
          </div>
          <div style={styles.commentsSection}>
            <p style={styles.commentsTitle}>Comments</p>
            <form onSubmit={handleComment} style={styles.commentForm}>
              {user && <img src={user.picture} alt="" style={styles.commentAvatar} />}
              <input
                style={styles.commentInput}
                placeholder={user ? "Add a comment..." : "Login to comment..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={!user}
              />
              <button type="submit" style={styles.commentBtn} disabled={!user}>Post</button>
            </form>
            {comments.map((c) => (
              <div key={c.id} style={styles.commentItem}>
                <img src={c.pic} alt="" style={styles.commentAvatar} />
                <div>
                  <p style={styles.commentUser}>{c.user}</p>
                  <p style={styles.commentText}>{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={styles.sidebar}>
          <p style={{ color: "#aaa", marginBottom: 10 }}>Related Videos</p>
          {related.map((v) => v.snippet && <VideoCard key={v.id?.videoId} video={v} />)}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20 },
  backBtn: { background: "none", border: "none", color: "#aaa", fontSize: 14, cursor: "pointer", marginBottom: 12, padding: 0 },
  main: { display: "flex", gap: 20 },
  left: { flex: 1 },
  player: { width: "100%", height: 480, border: "none", borderRadius: 8 },
  title: { marginTop: 12, fontSize: 18, fontWeight: "bold" },
  actions: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0", borderBottom: "1px solid #333", paddingBottom: 10 },
  views: { color: "#aaa", fontSize: 13 },
  btns: { display: "flex", gap: 10 },
  btn: { display: "flex", alignItems: "center", background: "#272727", border: "none", color: "#fff", padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13 },
  subBtn: { display: "flex", alignItems: "center", border: "none", color: "#fff", padding: "7px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: "bold" },
  channelRow: { margin: "10px 0" },
  channelName: { fontWeight: "bold", fontSize: 15 },
  desc: { color: "#ccc", fontSize: 13, lineHeight: 1.6, marginTop: 4 },
  commentsSection: { marginTop: 20 },
  commentsTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  commentForm: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  commentAvatar: { width: 32, height: 32, borderRadius: "50%" },
  commentInput: { flex: 1, background: "transparent", border: "none", borderBottom: "1px solid #444", color: "#fff", fontSize: 13, padding: "6px 0", outline: "none" },
  commentBtn: { background: "#3ea6ff", border: "none", color: "#000", padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontWeight: "bold", fontSize: 12 },
  commentItem: { display: "flex", gap: 10, marginBottom: 16 },
  commentUser: { fontSize: 12, fontWeight: "bold", color: "#aaa", marginBottom: 2 },
  commentText: { fontSize: 13, color: "#fff" },
  sidebar: { width: 300, display: "flex", flexDirection: "column", gap: 12 },
  msg: { textAlign: "center", marginTop: 40, color: "#aaa" },
};
