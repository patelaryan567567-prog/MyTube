import { useState } from "react";

/**
 * A drop-in <img> replacement that shows a shimmering placeholder until the
 * image has actually loaded, instead of leaving a blank gap mid-layout.
 *
 * `style` sizes the container (width, aspectRatio, height, borderRadius, …).
 * `round` is shorthand for a circular avatar.
 */
export default function ImageWithSkeleton({ src, alt = "", style, imgStyle, round, onClick }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--hover-bg)",
        borderRadius: round ? "50%" : style?.borderRadius,
        flexShrink: 0,
        ...style,
      }}
    >
      {!loaded && <div className="mytube-skeleton" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.25s ease",
          ...imgStyle,
        }}
      />
    </div>
  );
}
