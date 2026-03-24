import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlaylistVideos } from "../api/youtube";
import VideoCard from "../components/VideoCard";

export default function Playlist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPlaylistVideos(id)
      .then((res) => {
        const items = (res.data.items || [])
          .filter((i) => i.snippet?.resourceId?.videoId)
          .map((item) => ({
            id: { videoId: item.snippet.resourceId.videoId },
            snippet: item.snippet,
          }));
        setVideos(items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="page-content">
      <button onClick={() => navigate(-1)} style={s.back}>← Back</button>
      {loading
        ? <p style={s.msg}>Loading...</p>
        : videos.length === 0
          ? <p style={s.msg}>No videos found</p>
          : <div className="video-grid">{videos.map((v, i) => <VideoCard key={`${v.id.videoId}-${i}`} video={v} />)}</div>
      }
    </div>
  );
}

const s = {
  back: { background: "none", border: "none", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", padding: "12px 20px", display: "block" },
  msg: { textAlign: "center", marginTop: 40, color: "var(--text-muted)" },
};
