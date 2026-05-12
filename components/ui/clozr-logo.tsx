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
        src="/clozr-icon.svg"
        alt="Clozr"
        style={{
          height: height,
          width: 'auto',
          display: 'block',
          filter: 'brightness(0) invert(1)',
        }}
        className={className}
      />
    )
  }

  return (
    <img
      src="/clozr-logo.svg"
      alt="Clozr"
      style={{
        height: height,
        width: 'auto',
        maxWidth: 280,
        display: 'block',
        margin: '0 auto',
        filter: 'brightness(0) invert(1)',
      }}
      className={className}
    />
  )
}
