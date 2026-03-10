export function Avatar({
  url,
  name,
  size = 40,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  const initial = name.charAt(0).toUpperCase();
  const style = { width: size, height: size };
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={style}
        className="rounded-full object-cover shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      style={style}
      className="rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold shrink-0"
    >
      <span style={{ fontSize: size * 0.38 }}>{initial}</span>
    </div>
  );
}
