export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-10 text-sm text-slate-500">
      <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Ample Cleaners. All rights reserved.</p>
        <p>0333 000 0000 · hello@amplecleaners.com</p>
      </div>
    </footer>
  );
}
