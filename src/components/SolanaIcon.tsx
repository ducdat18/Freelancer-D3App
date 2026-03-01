import { SvgIcon, SvgIconProps } from '@mui/material';

export default function SolanaIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 646 96">
      <defs>
        <linearGradient
          id="solana-gradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#00FFA3" />
          <stop offset="100%" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      {/* Solana logo SVG path */}
      <path
        fill="url(#solana-gradient)"
        d="M142.5 51.3c-.3-.3-.6-.4-1-.4h-24.1c-.6 0-.9.7-.5 1.1l9.4 9.4c.3.3.6.4 1 .4h24.1c.6 0 .9-.7.5-1.1l-9.4-9.4zm0-25.8c.3-.3.6-.4 1-.4h24.1c.6 0 .9.7.5 1.1l-9.4 9.4c-.3.3-.6.4-1 .4h-24.1c-.6 0-.9-.7-.5-1.1l9.4-9.4zm-25.6 12.9c-.3-.3-.6-.4-1-.4H91.8c-.6 0-.9.7-.5 1.1l9.4 9.4c.3.3.6.4 1 .4h24.1c.6 0 .9-.7.5-1.1l-9.4-9.4z"
        transform="scale(0.7) translate(-80, 10)"
      />
    </SvgIcon>
  );
}

// Simplified version - just the Solana circle logo
export function SolanaIconSimple(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 397.7 311.7">
      <linearGradient
        id="solana-gradient-simple"
        gradientUnits="userSpaceOnUse"
        x1="360.8791"
        y1="351.4553"
        x2="141.213"
        y2="-69.2936"
        gradientTransform="matrix(1 0 0 -1 0 314)"
      >
        <stop offset="0" stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
      <path
        fill="url(#solana-gradient-simple)"
        d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z"
      />
      <path
        fill="url(#solana-gradient-simple)"
        d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z"
      />
      <path
        fill="url(#solana-gradient-simple)"
        d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z"
      />
    </SvgIcon>
  );
}
