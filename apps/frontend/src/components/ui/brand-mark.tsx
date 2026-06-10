/**
 * BrandMark — logo YÊU đen trắng thống nhất: tim trắng trên ô đen bo góc
 * (đảo màu ở dark mode để nổi trên nền tối). Dùng làm fallback khi admin
 * chưa upload siteLogo, đồng bộ với favicon-heart.svg và bộ icon PWA/mobile.
 */
export function BrandMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="5.25" className="fill-black dark:fill-white transition-colors duration-300" />
      <g transform="translate(12,12) scale(0.62) translate(-12,-12.2)">
        <path
          className="fill-white dark:fill-black transition-colors duration-300"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </g>
    </svg>
  );
}
