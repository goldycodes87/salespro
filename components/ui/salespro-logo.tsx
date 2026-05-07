interface SalesProLogoProps {
  variant?: 'full' | 'icon'
  height?: number
  className?: string
}

// Gradient IDs are static — all instances use the same colors so conflicts are harmless.
const GRAD = 'sp-gradient'
const BG_GRAD = 'sp-bg-gradient'

function Defs() {
  return (
    <defs>
      <linearGradient id={GRAD} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1D4ED8" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
      <linearGradient id={BG_GRAD} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#071436" />
        <stop offset="100%" stopColor="#033D50" />
      </linearGradient>
    </defs>
  )
}

// Pointy-top regular hexagon (R=21, center 24,24) + two interlocking S chevrons.
// Upper chevron: right-pointing bracket (upper S curve).
// Lower chevron: left-pointing bracket (lower S curve), 180° rotation of upper.
function IconPaths() {
  return (
    <>
      {/* Hex background */}
      <path d="M24 3L42 13L42 35L24 45L6 35L6 13Z" fill={`url(#${BG_GRAD})`} />
      {/* Upper S chevron — right-pointing */}
      <path d="M10 12L28 12L40 22L28 28L12 28L10 22Z" fill={`url(#${GRAD})`} />
      {/* Lower S chevron — left-pointing (180° rotation of upper) */}
      <path d="M38 36L20 36L8 26L20 20L36 20L38 26Z" fill={`url(#${GRAD})`} />
    </>
  )
}

export default function SalesProLogo({
  variant = 'full',
  height = 40,
  className,
}: SalesProLogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        height={height}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="SalesPro"
        style={{ display: 'inline-block', flexShrink: 0 }}
      >
        <Defs />
        <IconPaths />
      </svg>
    )
  }

  return (
    <svg
      height={height}
      viewBox="0 0 208 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SalesPro"
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      <Defs />
      <IconPaths />
      {/* Wordmark: "Sales" white + "Pro" cyan */}
      <text
        x="56"
        y="34"
        fontFamily="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontWeight="700"
        fontSize="27"
        letterSpacing="-0.3"
      >
        <tspan fill="#F9FAFB">Sales</tspan>
        <tspan fill="#06B6D4">Pro</tspan>
      </text>
    </svg>
  )
}
