import Image from 'next/image'

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
  if (variant === 'icon') {
    return (
      <Image
        src="/SalesPro S.png"
        alt="SalesPro"
        height={height}
        width={height}
        style={{ objectFit: 'contain' }}
        className={className}
      />
    )
  }

  // Full logo — approximately 4:1 ratio
  const width = height * 4

  return (
    <Image
      src="/SalesProLogo-Full.png"
      alt="SalesPro"
      height={height}
      width={width}
      style={{ objectFit: 'contain' }}
      className={className}
    />
  )
}
