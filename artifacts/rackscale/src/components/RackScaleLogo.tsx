type LogoSize = "sm" | "md" | "lg";

const sizes: Record<LogoSize, { badge: number; text: string; gap: string }> = {
  sm: { badge: 28, text: "text-lg",  gap: "gap-2.5" },
  md: { badge: 36, text: "text-2xl", gap: "gap-3"   },
  lg: { badge: 48, text: "text-3xl", gap: "gap-4"   },
};

export function RackScaleLogo({ size = "md" }: { size?: LogoSize }) {
  const { badge, text, gap } = sizes[size];

  return (
    <div className={`flex items-center ${gap}`}>
      <RackIcon size={badge} />
      <span className={`font-extrabold tracking-tight leading-none ${text}`}>
        Rack<span className="text-primary">Scale</span>
      </span>
    </div>
  );
}

export function RackIcon({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="8" fill="#1e3a5f" />
      {/* Three server rack units */}
      <rect x="6" y="8"  width="24" height="5" rx="1.5" fill="white" />
      <rect x="6" y="15.5" width="24" height="5" rx="1.5" fill="white" />
      <rect x="6" y="23" width="24" height="5" rx="1.5" fill="white" />
      {/* Status dots on each unit */}
      <circle cx="27" cy="10.5" r="1.4" fill="#22c55e" />
      <circle cx="27" cy="18"   r="1.4" fill="#22c55e" />
      <circle cx="27" cy="25.5" r="1.4" fill="#3b82f6" />
    </svg>
  );
}
