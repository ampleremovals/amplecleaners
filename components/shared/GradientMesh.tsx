/**
 * Colourful, slowly-drifting blurred blobs — the backdrop every glass panel
 * on the homepage floats over. Pass `variant="hero"` for the larger, more
 * saturated hero version.
 */
export function GradientMesh({ variant = "default" }: { variant?: "default" | "hero" }) {
  const big = variant === "hero";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={`animate-float-a absolute rounded-full bg-brand-green-400 blur-3xl ${
          big ? "-left-32 -top-40 h-[32rem] w-[32rem] opacity-50" : "-left-20 -top-24 h-72 w-72 opacity-30"
        }`}
      />
      <div
        className={`animate-float-b absolute rounded-full bg-brand-sky-400 blur-3xl ${
          big ? "-right-24 top-10 h-[28rem] w-[28rem] opacity-45" : "-right-16 top-0 h-64 w-64 opacity-30"
        }`}
      />
      <div
        className={`animate-float-c absolute rounded-full bg-brand-violet-400 blur-3xl ${
          big ? "bottom-[-10rem] left-1/3 h-[30rem] w-[30rem] opacity-40" : "bottom-[-6rem] left-1/4 h-72 w-72 opacity-25"
        }`}
      />
    </div>
  );
}
