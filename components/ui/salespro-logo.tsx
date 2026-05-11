interface SalesProLogoProps {
  variant?: 'full' | 'icon'
  height?: number
  className?: string
}

export default function SalesProLogo({
  variant = 'full',
  height = 32,
  className = '',
}: SalesProLogoProps) {
  const iconSize = height
  const fontSize = height * 0.55

  if (variant === 'icon') {
    return (
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: iconSize * 0.22,
          background: 'linear-gradient(135deg, #1D4ED8 0%, #06B6D4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        className={className}
      >
        <span style={{
          color: 'white',
          fontSize: fontSize,
          fontWeight: 900,
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1,
          letterSpacing: '-0.05em',
        }}>S</span>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: height * 0.3,
        flexShrink: 0,
      }}
      className={className}
    >
      <div style={{
        width: iconSize,
        height: iconSize,
        borderRadius: iconSize * 0.22,
        background: 'linear-gradient(135deg, #1D4ED8 0%, #06B6D4 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          color: 'white',
          fontSize: fontSize,
          fontWeight: 900,
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1,
          letterSpacing: '-0.05em',
        }}>S</span>
      </div>
      <span style={{
        fontSize: height * 0.65,
        fontWeight: 800,
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1,
        letterSpacing: '-0.02em',
        background: 'linear-gradient(90deg, #ffffff 0%, #06B6D4 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        flexShrink: 0,
      }}>SalesPro</span>
    </div>
  )
}
