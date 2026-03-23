import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { searchVideos } from "../api/youtube";
import VideoCard from "../components/VideoCard";

export default function Search() {
  const [params] = useSearchParams();
  const query = params.get("q");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await searchVideos(query);
        setResults(res.data.items);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    if (query) fetch();
  }, [query]);

  return (
    <div style={styles.container}>
      <p style={styles.heading}>Results for: <span style={{ color: "#fff" }}>{query}</span></p>
      {loading ? (
        <p style={styles.msg}>Searching...</p>
      ) : (
        <div style={styles.grid}>
          {results.map((v) => <VideoCard key={v.id?.videoId} video={v} />)}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 20 },
  heading: { color: "#aaa", marginBottom: 16, fontSize: 15 },
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
  },
  msg: { color: "#aaa", textAlign: "center", marginTop: 40 },
};
