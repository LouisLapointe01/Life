export function LeafLogo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="leafBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3AAFA9" />
          <stop offset="50%" stopColor="#2B9390" />
          <stop offset="100%" stopColor="#1F7A8C" />
        </linearGradient>
        <linearGradient id="leafShape" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0f2f1" />
        </linearGradient>
      </defs>
      {/* Background */}
      <rect width="192" height="192" rx="42" fill="url(#leafBg)" />
      {/* Leaf */}
      <g transform="translate(96, 96)">
        {/* Leaf body */}
        <path
          d="M0,-52 C28,-48 52,-24 52,8 C52,38 28,56 0,60 C-28,56 -52,38 -52,8 C-52,-24 -28,-48 0,-52Z"
          fill="url(#leafShape)"
          opacity="0.95"
        />
        {/* Central vein */}
        <line
          x1="0"
          y1="-46"
          x2="0"
          y2="54"
          stroke="#2B9390"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* Left veins */}
        <path d="M0,-20 C-16,-14 -30,-4 -38,6" stroke="#2B9390" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.4" />
        <path d="M0,4 C-18,10 -32,22 -38,32" stroke="#2B9390" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.4" />
        <path d="M0,26 C-14,32 -24,40 -28,48" stroke="#2B9390" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.35" />
        {/* Right veins */}
        <path d="M0,-20 C16,-14 30,-4 38,6" stroke="#2B9390" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.4" />
        <path d="M0,4 C18,10 32,22 38,32" stroke="#2B9390" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.4" />
        <path d="M0,26 C14,32 24,40 28,48" stroke="#2B9390" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.35" />
      </g>
    </svg>
  );
}
