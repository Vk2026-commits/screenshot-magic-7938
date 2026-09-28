import logoMark from "@/assets/logo-mark.png.asset.json";

export function SiteHeader({
  label = "AI Income Path Finder",
  action,
}: {
  label?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-navy-deep/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2.5 px-5">
        <img src={logoMark.url} alt="Logo" className="size-7 shrink-0" />
        <span className="font-display text-[15px] font-semibold tracking-tight">{label}</span>
        {action && <div className="ml-auto">{action}</div>}
      </div>
    </header>
  );
}
