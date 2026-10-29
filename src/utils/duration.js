const ISO_DURATION = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;

/** Converts an ISO 8601 duration (e.g. "PT1H2M3S") to seconds. Returns Infinity when unknown. */
export const toSeconds = (iso) => {
  if (!iso) return Infinity;
  const m = iso.match(ISO_DURATION);
  if (!m) return Infinity;
  return parseInt(m[1] || 0, 10) * 3600 + parseInt(m[2] || 0, 10) * 60 + parseInt(m[3] || 0, 10);
};

/** Converts an ISO 8601 duration to "H:MM:SS" or "M:SS". Returns null when unknown. */
export const formatDuration = (iso) => {
  if (!iso) return null;
  const m = iso.match(ISO_DURATION);
  if (!m) return null;
  const h = parseInt(m[1] || 0, 10);
  const min = parseInt(m[2] || 0, 10);
  const sec = parseInt(m[3] || 0, 10);
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(min)}:${pad(sec)}` : `${min}:${pad(sec)}`;
};
