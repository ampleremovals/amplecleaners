/**
 * Colourful, slowly-drifting blurred blobs — the backdrop every glass panel
 * on the homepage floats over. Deliberately saturated and large enough that
 * there's rarely a plain-white gap between them; `spread` controls how tall
 * a section this instance needs to cover (use "tall" for a container that
 * wraps several sections at once).
 */
export function GradientMesh({ variant = "default", spread = "normal" }: { variant?: "default" | "hero"; spread?: "normal" | "tall" }) {
  const big = variant === "hero";
  const tall = spread === "tall";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={`animate-float-a absolute rounded-full bg-brand-green-400 blur-2xl ${
          big ? "-left-32 -top-40 h-[36rem] w-[36rem] opacity-80" : "-left-24 -top-20 h-96 w-96 opacity-70"
        }`}
      />
      <div
        className={`animate-float-b absolute rounded-full bg-brand-sky-400 blur-2xl ${
          big ? "-right-28 top-0 h-[32rem] w-[32rem] opacity-75" : "-right-20 top-4 h-80 w-80 opacity-65"
        }`}
      />
      <div
        className={`animate-float-c absolute rounded-full bg-brand-violet-400 blur-2xl ${
          big ? "bottom-[-14rem] left-1/3 h-[34rem] w-[34rem] opacity-70" : "bottom-[-8rem] left-1/4 h-96 w-96 opacity-60"
        }`}
      />
      {tall && (
        <>
          <div className="animate-float-b absolute left-[-6rem] top-[55%] h-96 w-96 rounded-full bg-brand-sky-300 opacity-55 blur-2xl" />
          <div className="animate-float-a absolute right-[-8rem] top-[75%] h-[28rem] w-[28rem] rounded-full bg-brand-green-300 opacity-55 blur-2xl" />
          <div className="animate-float-c absolute left-1/2 top-[95%] h-80 w-80 -translate-x-1/2 rounded-full bg-brand-violet-300 opacity-50 blur-2xl" />
        </>
      )}
    </div>
  );
}
