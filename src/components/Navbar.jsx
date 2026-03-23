import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineSearch } from "react-icons/ai";
import { RiYoutubeLine } from "react-icons/ri";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${query}`);
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.logo} onClick={() => navigate("/")}>
        <RiYoutubeLine size={32} color="#ff0000" />
        <span style={styles.logoText}>MyTube</span>
      </div>

      <form onSubmit={handleSearch} style={styles.searchForm}>
        <input
          style={styles.input}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" style={styles.searchBtn}>
          <AiOutlineSearch size={20} />
        </button>
      </form>

      <div style={styles.authSection}>
        {user ? (
          <div style={styles.userInfo}>
            <img src={user.picture} alt={user.name} style={styles.avatar} />
            <span style={styles.userName}>{user.name}</span>
            <button style={styles.logoutBtn} onClick={() => setUser(null)}>
              Logout
            </button>
          </div>
        ) : (
          <GoogleLogin
            onSuccess={(res) => setUser(jwtDecode(res.credential))}
            onError={() => console.log("Login Failed")}
            useOneTap
          />
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 20px",
    background: "#0f0f0f",
    borderBottom: "1px solid #222",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  logoText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  searchForm: {
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: 300,
    padding: "8px 14px",
    borderRadius: "20px 0 0 20px",
    border: "1px solid #333",
    background: "#121212",
    color: "#fff",
    outline: "none",
    fontSize: 14,
  },
  searchBtn: {
    padding: "8px 14px",
    borderRadius: "0 20px 20px 0",
    border: "1px solid #333",
    borderLeft: "none",
    background: "#222",
    color: "#fff",
    cursor: "pointer",
  },
  authSection: {
    display: "flex",
    alignItems: "center",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
  },
  userName: {
    fontSize: 13,
    color: "#fff",
  },
  logoutBtn: {
    padding: "5px 12px",
    background: "#333",
    color: "#fff",
    border: "none",
    borderRadius: 20,
    cursor: "pointer",
    fontSize: 12,
  },
};
