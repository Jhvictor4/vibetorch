import * as React from 'react'

export const InspectorIcon = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11 19a8 8 0 100-16 8 8 0 000 16z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 21l-4.35-4.35"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="11"
      cy="11"
      r="3"
      stroke={color}
      strokeWidth="2"
    />
  </svg>
)