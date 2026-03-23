import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getChannelDetails, getChannelVideos } from "../api/youtube";
import VideoCard from "../components/VideoCard";

export default function Channel() {
  const { id } = useParams();
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [cRes, vRes] = await Promise.all([
          getChannelDetails(id),
          getChannelVideos(id),
        ]);
        setChannel(cRes.data.items[0]);
        setVideos(vRes.data.items);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <p style={styles.msg}>Loading...</p>;
  if (!channel) return <p style={styles.msg}>Channel not found</p>;

  const { snippet, statistics } = channel;

  return (
    <div>
      {/* Banner */}
      <div style={styles.banner}>
        {snippet.brandingSettings?.image?.bannerExternalUrl && (
          <img src={snippet.brandingSettings.image.bannerExternalUrl} style={styles.bannerImg} alt="" />
        )}
      </div>

      {/* Channel Info */}
      <div style={styles.channelInfo}>
        <img src={snippet.thumbnails?.medium?.url} alt={snippet.title} style={styles.avatar} />
        <div style={styles.meta}>
          <h1 style={styles.name}>{snippet.title}</h1>
          <p style={styles.stats}>
            {Number(statistics?.subscriberCount).toLocaleString()} subscribers
            &nbsp;•&nbsp;
            {Number(statistics?.videoCount).toLocaleString()} videos
          </p>
          <p style={styles.desc}>{snippet.description?.slice(0, 150)}...</p>
        </div>
      </div>

      <hr style={styles.divider} />

      {/* Videos Grid */}
      <div style={styles.grid}>
        {videos.map((v) => v.snippet && <VideoCard key={v.id?.videoId} video={v} />)}
      </div>
    </div>
  );
}

const styles = {
  banner: { width: "100%", background: "#1a1a1a", height: 180, overflow: "hidden" },
  bannerImg: { width: "100%", height: "100%", objectFit: "cover" },
  channelInfo: { display: "flex", alignItems: "center", gap: 20, padding: "20px 24px" },
  avatar: { width: 80, height: 80, borderRadius: "50%", flexShrink: 0 },
  meta: { flex: 1 },
  name: { fontSize: 22, fontWeight: "bold", marginBottom: 6 },
  stats: { fontSize: 13, color: "#aaa", marginBottom: 6 },
  desc: { fontSize: 13, color: "#ccc" },
  divider: { border: "none", borderTop: "1px solid #222", margin: "0 24px" },
  grid: { display: "flex", flexWrap: "wrap", gap: 16, padding: 24 },
  msg: { textAlign: "center", marginTop: 40, color: "#aaa" },
};
