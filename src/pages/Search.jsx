import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { searchVideos } from "../api/youtube";
import VideoCard from "../components/VideoCard";
import ChannelCard from "../components/ChannelCard";

export default function Search() {
  const [params] = useSearchParams();
  const query = params.get("q");
  const [videos, setVideos] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await searchVideos(query);
        const items = res.data.items;
        setChannels(items.filter((i) => i.id?.kind === "youtube#channel"));
        setVideos(items.filter((i) => i.id?.kind === "youtube#video"));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    if (query) fetch();
  }, [query]);

  if (loading) return <p style={styles.msg}>Searching...</p>;

  return (
    <div style={styles.container}>
      <p style={styles.heading}>
        Results for: <span style={{ color: "#fff" }}>{query}</span>
      </p>

      {channels.length > 0 && (
        <div style={styles.section}>
          {channels.map((c) => (
            <ChannelCard key={c.id?.channelId} channel={c} />
          ))}
        </div>
      )}

      <div style={styles.grid}>
        {videos.map((v) => (
          <VideoCard key={v.id?.videoId} video={v} />
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20 },
  heading: { color: "#aaa", marginBottom: 16, fontSize: 15 },
  section: { marginBottom: 20 },
  grid: { display: "flex", flexWrap: "wrap", gap: 16 },
  msg: { color: "#aaa", textAlign: "center", marginTop: 40 },
};
