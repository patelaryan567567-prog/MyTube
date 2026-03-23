import { useEffect, useState } from "react";
import { getTrending, getVideosByCategory } from "../api/youtube";
import VideoCard from "../components/VideoCard";
import CategoryBar from "../components/CategoryBar";

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = async (categoryId = "0") => {
    setLoading(true);
    try {
      const res = categoryId === "0"
        ? await getTrending()
        : await getVideosByCategory(categoryId);
      setVideos(res.data.items);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchVideos(); }, []);

  return (
    <div>
      <CategoryBar onSelect={fetchVideos} />
      {loading ? (
        <p style={styles.msg}>Loading...</p>
      ) : (
        <div style={styles.grid}>
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </div>
  );
}

const styles = {
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    padding: 20,
  },
  msg: {
    textAlign: "center",
    marginTop: 40,
    color: "#aaa",
  },
};
