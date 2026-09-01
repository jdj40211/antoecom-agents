export function Logo({ size = 32, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-foreground"
        aria-hidden="true"
      >
        <polygon points="50,8 82,72 66,72" fill="currentColor" opacity="0.55" />
        <polygon points="50,8 34,72 18,72" fill="currentColor" />
        <polygon points="18,72 82,72 62,55 38,55" fill="currentColor" opacity="0.75" />
      </svg>
      {showText && (
        <span className="text-base font-semibold text-foreground tracking-tight">
          AntoEcom <span className="text-muted-foreground font-normal">Agents</span>
        </span>
      )}
    </div>
  )
}
