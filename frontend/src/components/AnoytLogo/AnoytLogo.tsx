import "./AnoytLogo.css"




type AnoytLogoProps = {
  /** Show the "anoyt" wordmark next to the mark. */
  showName?: boolean;
  /** Rendered height in px; width follows the aspect ratio. */
  height?: number;
  className?: string;
};

export default function AnoytLogo({
  showName = true,
  height = 40,
  className,
}: AnoytLogoProps) {
  const viewBox = showName ? "0 0 200 80" : "0 0 64 80";
  const width = showName ? (height * 200) / 80 : (height * 64) / 80;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={width}
      height={height}
      role="img"
      aria-label="anoyt"
      className={className}
    >
      <circle
        cx="22"
        cy="41"
        r="11"
        fill="none"
        stroke="#e11d2e"
        strokeWidth="7"
      />
      <line
        x1="36"
        y1="25"
        x2="36"
        y2="57"
        stroke="#e11d2e"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {showName && (
        <text
          x="60"
          y="52"
          fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif"
          fontSize="34"
          fontWeight="600"
          letterSpacing="1.5"
          fill="#f4f1ee"
        >
          anoyt
        </text>
      )}
    </svg>
  );
}