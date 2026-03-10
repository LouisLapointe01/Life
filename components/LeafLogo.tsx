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
      <rect width="192" height="192" rx="44" fill="url(#lifeTile)" />
      <circle cx="44" cy="44" r="26" fill="white" opacity="0.16" />
      <circle cx="154" cy="34" r="30" fill="white" opacity="0.16" />
      <circle cx="26" cy="166" r="28" fill="white" opacity="0.12" />

      <path
        d="M96 34C124 38 146 60 146 89C146 122 123 147 96 154C69 147 46 122 46 89C46 60 68 38 96 34Z"
        fill="rgba(255,255,255,0.97)"
      />
      <path d="M96 45V143" stroke="#2B9390" strokeWidth="8" strokeLinecap="round" opacity="0.45" />
      <path d="M95 77C76 84 63 94 54 108" stroke="#2B9390" strokeWidth="6" strokeLinecap="round" opacity="0.34" />
      <path d="M97 77C116 84 129 94 138 108" stroke="#2B9390" strokeWidth="6" strokeLinecap="round" opacity="0.34" />
      <path d="M95 103C79 111 67 123 61 133" stroke="#2B9390" strokeWidth="6" strokeLinecap="round" opacity="0.28" />
      <path d="M97 103C113 111 125 123 131 133" stroke="#2B9390" strokeWidth="6" strokeLinecap="round" opacity="0.28" />

      <defs>
        <linearGradient id="lifeTile" x1="28" y1="22" x2="166" y2="176" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#44B6A9" />
          <stop offset="0.5" stopColor="#2F958F" />
          <stop offset="1" stopColor="#226F8B" />
        </linearGradient>
      </defs>
    </svg>
  );
}
