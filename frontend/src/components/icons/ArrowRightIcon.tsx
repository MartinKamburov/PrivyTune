import * as React from "react";

export type ArrowRightIconProps = React.SVGProps<SVGSVGElement>;

const ArrowRightIcon = React.forwardRef<SVGSVGElement, ArrowRightIconProps>((props, ref) => {
  return (
    <svg
      ref={ref}
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
});

ArrowRightIcon.displayName = "ArrowRightIcon";

export default React.memo(ArrowRightIcon);