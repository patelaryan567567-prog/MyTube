import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { MiniPlayerProvider } from "./components/MiniPlayer";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Watch from "./pages/Watch";
import Search from "./pages/Search";
import Channel from "./pages/Channel";
import Subscriptions from "./pages/Subscriptions";
import WatchLater from "./pages/WatchLater";
import LikedVideos from "./pages/LikedVideos";
import Trending from "./pages/Trending";
import Shorts from "./pages/Shorts";
import You from "./pages/You";
import Playlist from "./pages/Playlist";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <MiniPlayerProvider>
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/watch/:id" element={<Watch />} />
                <Route path="/search" element={<Search />} />
                <Route path="/channel/:id" element={<Channel />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/watch-later" element={<WatchLater />} />
                <Route path="/liked" element={<LikedVideos />} />
                <Route path="/trending" element={<Trending />} />
                <Route path="/shorts" element={<Shorts />} />
                <Route path="/shorts/:id" element={<Shorts />} />
                <Route path="/you" element={<You />} />
                <Route path="/playlist/:id" element={<Playlist />} />
              </Routes>
            </MiniPlayerProvider>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
