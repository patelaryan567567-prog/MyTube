export default function MyTubeLogo({ size = 28 }) {
  const id = "mtg";
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="40" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4B0FD4"/>
          <stop offset="40%" stopColor="#C0148C"/>
          <stop offset="100%" stopColor="#FF4500"/>
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="30" x2="30" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0"/>
        </linearGradient>
        <filter id={`${id}s`} x="-10%" y="-10%" width="120%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#7C3AED" floodOpacity="0.5"/>
        </filter>
      </defs>
      {/* Main rounded rect */}
      <rect x="1" y="1" width="38" height="28" rx="7" ry="7" fill={`url(#${id}a)`} filter={`url(#${id}s)`}/>
      {/* Swirl highlight */}
      <path d="M2 22 Q10 8 22 14 Q30 18 38 6" stroke={`url(#${id}b)`} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M1 18 Q8 28 18 24" stroke="#60A5FA" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
      {/* White play triangle */}
      <polygon points="15,9 15,21 28,15" fill="white" opacity="0.95"/>
    </svg>
  );
}
