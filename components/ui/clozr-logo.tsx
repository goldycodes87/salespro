'use client'

export default function ClozrLogo({
  variant = 'full',
  height = 32,
  className = '',
}: {
  variant?: 'full' | 'icon'
  height?: number
  className?: string
}) {
  if (variant === 'icon') {
    return (
      <img
        src="/clozr-icon.png"
        alt="Clozr"
        style={{
          height: height,
          width: Math.round(height * 1.5),
          objectFit: 'contain',
          display: 'block',
        }}
        className={className}
      />
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}
      className={className}
    >
      <img
        src="/clozr-icon.png"
        alt=""
        style={{
          height: height,
          width: Math.round(height * 1.5),
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />
      <span style={{
        fontSize: Math.round(height * 0.75),
        fontWeight: 800,
        color: 'white',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        flexShrink: 0,
      }}>Clozr</span>
    </div>
  )
}
