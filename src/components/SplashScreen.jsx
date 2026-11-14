import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [hasBootSplash] = useState(() =>
    typeof document !== "undefined" && Boolean(document.getElementById("mytube-splash-root"))
  );
  const [phase, setPhase] = useState(() => (hasBootSplash ? "done" : "enter"));

  useEffect(() => {
    if (hasBootSplash) {
      const start = window.__mytubeSplashStart || Date.now();
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 1900 - elapsed);

      const timer = setTimeout(() => {
        if (typeof window.__dismissMyTubeSplash === "function") {
          window.__dismissMyTubeSplash();
        } else {
          const el = document.getElementById("mytube-splash-root");
          if (el) {
            el.classList.add("mytube-splash-exit");
            setTimeout(() => el.remove(), 560);
          }
        }
      }, remaining);

      return () => clearTimeout(timer);
    }

    const exitTimer = setTimeout(() => {
      setPhase("exit");
    }, 1850);

    const doneTimer = setTimeout(() => {
      setPhase("done");
    }, 2400);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [hasBootSplash]);

  if (phase === "done") return null;

  return (
    <div
      className={`mytube-splash ${phase === "exit" ? "mytube-splash-exit" : ""}`}
      onClick={() => setPhase("done")}
      role="presentation"
      aria-hidden="true"
    >
      {/* Ambient glowing aurora orbs */}
      <div className="mytube-splash-orb mytube-splash-orb-1" />
      <div className="mytube-splash-orb mytube-splash-orb-2" />

      <div className="mytube-splash-center">
        {/* Expanding sonic pulse rings behind the logo */}
        <div className="mytube-splash-logo-wrap">
          <div className="mytube-splash-logo-glow" />
          <span className="mytube-splash-ring mytube-splash-ring-1" />
          <span className="mytube-splash-ring mytube-splash-ring-2" />

          {/* Animated High-Res MyTube SVG Logo */}
          <svg
            className="mytube-splash-svg"
            width="112"
            height="84"
            viewBox="0 0 40 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="splashGradA" x1="0" y1="0" x2="40" y2="30" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4B0FD4" />
                <stop offset="45%" stopColor="#C0148C" />
                <stop offset="100%" stopColor="#FF4500" />
              </linearGradient>
              <linearGradient id="splashGradB" x1="0" y1="30" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* Main rounded body */}
            <rect
              className="mytube-splash-rect"
              x="1"
              y="1"
              width="38"
              height="28"
              rx="7.5"
              ry="7.5"
              fill="url(#splashGradA)"
            />

            {/* Animated swirl light trails */}
            <path
              className="mytube-splash-swirl-1"
              d="M2 22 Q10 8 22 14 Q30 18 38 6"
              stroke="url(#splashGradB)"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              className="mytube-splash-swirl-2"
              d="M1 18 Q8 28 18 24"
              stroke="#60A5FA"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              opacity="0.65"
            />

            {/* Crisp white play triangle */}
            <polygon
              className="mytube-splash-play"
              points="15,9 15,21 28,15"
              fill="#ffffff"
            />
          </svg>
        </div>

        {/* Brand wordmark & tagline */}
        <div className="mytube-splash-text-wrap">
          <div className="mytube-splash-brand" aria-label="MyTube">
            {"MyTube".split("").map((char, idx) => (
              <span
                key={idx}
                className="mytube-splash-letter"
                style={{ animationDelay: `${0.28 + idx * 0.055}s` }}
              >
                {char}
              </span>
            ))}
          </div>
          <p className="mytube-splash-tagline">WATCH · DISCOVER · SYNC</p>
        </div>

        {/* Sleek gradient loading bar */}
        <div className="mytube-splash-bar-track">
          <div className="mytube-splash-bar-fill" />
        </div>
      </div>
    </div>
  );
}
