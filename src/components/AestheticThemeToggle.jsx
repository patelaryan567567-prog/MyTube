import { useState } from "react";
import { MdDarkMode, MdLightMode, MdAutoAwesome } from "react-icons/md";
import { useTheme } from "../context/ThemeContext";

export default function AestheticThemeToggle() {
  const { dark, toggleTheme } = useTheme();
  const [animating, setAnimating] = useState(false);

  const handleClick = (e) => {
    if (animating) return;
    setAnimating(true);

    const x = e.clientX;
    const y = e.clientY;

    // Create a circular ripple overlay for the theme transition animation
    const ripple = document.createElement("div");
    ripple.className = "theme-ripple-overlay";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.background = dark
      ? "radial-gradient(circle, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)"
      : "radial-gradient(circle, #0f0f0f 0%, #1a1a2e 60%, #09090b 100%)";
    document.body.appendChild(ripple);

    // Force reflow
    ripple.getBoundingClientRect();
    ripple.classList.add("theme-ripple-active");

    setTimeout(() => {
      toggleTheme();
    }, 280);

    setTimeout(() => {
      ripple.remove();
      setAnimating(false);
    }, 650);
  };

  return (
    <button
      className={`aesthetic-theme-btn ${dark ? "is-dark" : "is-light"}`}
      onClick={handleClick}
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      <div className="aesthetic-btn-track">
        <span className="aesthetic-icon-sun">
          <MdLightMode size={16} />
        </span>
        <span className="aesthetic-icon-moon">
          <MdDarkMode size={16} />
        </span>
        <div className="aesthetic-btn-thumb">
          {dark ? <MdDarkMode size={13} color="#0f0f0f" /> : <MdLightMode size={13} color="#f59e0b" />}
        </div>
      </div>
      <div className="aesthetic-glow-fx" />
    </button>
  );
}
