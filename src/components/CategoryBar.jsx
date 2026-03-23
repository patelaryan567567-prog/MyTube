import { useState } from "react";

const categories = [
  { id: "0", name: "All" },
  { id: "10", name: "Music" },
  { id: "20", name: "Gaming" },
  { id: "17", name: "Sports" },
  { id: "28", name: "Technology" },
  { id: "24", name: "Entertainment" },
  { id: "25", name: "News" },
  { id: "22", name: "People & Blogs" },
];

export default function CategoryBar({ onSelect }) {
  const [active, setActive] = useState("0");

  const handleClick = (id) => {
    setActive(id);
    onSelect(id);
  };

  return (
    <div style={styles.bar}>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => handleClick(cat.id)}
          style={{ ...styles.btn, ...(active === cat.id ? styles.active : {}) }}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

const styles = {
  bar: {
    display: "flex",
    gap: 8,
    padding: "12px 20px",
    overflowX: "auto",
    background: "var(--nav-bg)",
    scrollbarWidth: "none",
  },
  btn: {
    padding: "6px 14px",
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "var(--hover-bg)",
    color: "var(--text)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: 13,
  },
  active: {
    background: "var(--text)",
    color: "var(--bg)",
    border: "1px solid var(--text)",
  },
};
