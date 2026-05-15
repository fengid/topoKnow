interface NoiseOverlayProps {
  filterId?: string
}

/**
 * 全屏噪点叠加层组件
 * 用于增加视觉质感的 SVG 滤镜效果
 */
export function NoiseOverlay({ filterId = 'noise' }: NoiseOverlayProps) {
  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-[1]"
      style={{ opacity: 0.035 }}
      aria-hidden
    >
      <filter id={filterId}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  )
}
