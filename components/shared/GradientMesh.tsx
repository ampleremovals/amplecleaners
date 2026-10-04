/**
 * Soft, low-opacity colour accents pushed to the EDGES/CORNERS only — never
 * directly behind a body-text column. This is the 60-30-10 rule in practice:
 * the page is ~60% white/neutral, green is the ~30% primary, sky+violet are
 * ~10% accent touches. A saturated colour field behind paragraph text fails
 * basic contrast — see tasks/lessons.md.
 */
export function GradientMesh({ variant = "default", spread = "normal" }: { variant?: "default" | "hero"; spread?: "normal" | "tall" }) {
  const big = variant === "hero";
  const tall = spread === "tall";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={`animate-float-a absolute rounded-full bg-brand-green-300 blur-[90px] ${
          big ? "-left-40 -top-32 h-[28rem] w-[28rem] opacity-25 sm:opacity-30" : "-left-28 -top-16 h-72 w-72 opacity-20"
        }`}
      />
      <div
        className={`animate-float-b absolute rounded-full bg-brand-sky-300 blur-[90px] ${
          big ? "-right-32 -top-10 h-96 w-96 opacity-25 sm:opacity-30" : "-right-24 top-0 h-64 w-64 opacity-20"
        }`}
      />
      <div
        className={`animate-float-c absolute rounded-full bg-brand-violet-300 blur-[90px] ${
          big ? "bottom-[-12rem] left-1/3 h-96 w-96 opacity-20 sm:opacity-25" : "bottom-[-6rem] left-1/4 h-64 w-64 opacity-15"
        }`}
      />
      {tall && (
        <>
          <div className="animate-float-b absolute left-[-7rem] top-[60%] h-72 w-72 rounded-full bg-brand-sky-200 opacity-20 blur-[90px]" />
          <div className="animate-float-a absolute right-[-7rem] top-[80%] h-80 w-80 rounded-full bg-brand-green-200 opacity-20 blur-[90px]" />
        </>
      )}
    </div>
  );
}
