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
          width: 'auto',
          display: 'block',
        }}
        className={className}
      />
    )
  }

  return (
    <img
      src="/clozr-logo-clean.svg"
      alt="Clozr"
      style={{
        height: height,
        width: 'auto',
        maxWidth: 480,
        display: 'block',
      }}
      className={className}
    />
  )
}
