export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#0F0F14]">
      <div className="flex flex-col items-center gap-10">

        {/* Logo avec lueur animée */}
        <div className="relative flex items-center justify-center">
          {/* Halo externe */}
          <div
            className="absolute h-36 w-36 rounded-[40px]"
            style={{
              background: "radial-gradient(circle, rgba(68,189,183,0.30) 0%, transparent 70%)",
              animation: "life-glow 2.4s ease-in-out infinite",
            }}
          />
          {/* Logo flottant */}
          <div
            className="relative h-24 w-24 overflow-hidden rounded-[26px] shadow-[0_24px_64px_rgba(44,160,155,0.38),0_8px_24px_rgba(44,160,155,0.20)]"
            style={{ animation: "life-float 3s ease-in-out infinite" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-512.svg"
              alt="Life"
              className="h-full w-full"
              draggable={false}
            />
          </div>
        </div>

        {/* Indicateur — trois points rebondissants */}
        <div className="flex items-center gap-2">
          {[0, 200, 400].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 rounded-full bg-[#2DA09B]"
              style={{ animation: `life-dot 1.3s ease-in-out ${delay}ms infinite` }}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
