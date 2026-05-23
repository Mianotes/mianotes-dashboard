type PinIconProps = {
  size?: number;
};

export function PinIcon({ size = 18 }: PinIconProps) {
  return (
    <svg
      aria-hidden="true"
      className="pin-icon"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 3L14 10H9L6 13L11 18L4 25V28H7L14 21L19 26L22 23V18L29 12L20 3Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
