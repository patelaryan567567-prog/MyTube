import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import OfflineIndicator from "./components/OfflineIndicator";
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
import appletConfig from "../firebase-applet-config.json";

const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  appletConfig.oAuthClientId ||
  "918764992192-2e73c5ldq981on6lr0dic1l8g8un9gad.apps.googleusercontent.com";

export default function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Navbar />
            <OfflineIndicator />
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
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
