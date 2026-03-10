import { cn } from "@/lib/utils";

export function Avatar({
  url,
  name,
  size = 40,
  isOnline = false,
  showPresence = false,
}: {
  url: string | null;
  name: string;
  size?: number;
  isOnline?: boolean;
  showPresence?: boolean;
}) {
  const initial = name.charAt(0).toUpperCase();
  const style = { width: size, height: size };
  const presenceStyle = {
    width: Math.max(10, Math.round(size * 0.3)),
    height: Math.max(10, Math.round(size * 0.3)),
  };

  return (
    <div className="relative shrink-0">
      {url ? (
        <img
          src={url}
          alt={name}
          style={style}
          className="rounded-full object-cover shrink-0"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          style={style}
          className="rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold shrink-0"
        >
          <span style={{ fontSize: size * 0.38 }}>{initial}</span>
        </div>
      )}

      {showPresence && isOnline && (
        <span
          style={presenceStyle}
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-white bg-emerald-500 shadow-[0_6px_16px_rgba(34,197,94,0.32)] dark:border-slate-950"
          )}
        />
      )}
    </div>
  );
}
