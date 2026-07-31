import type { SVGProps, ReactNode } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export type IconType = (props: IconProps) => ReactNode;

function Base({ className, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconSparkle = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.5l1.55 4.35a3 3 0 0 0 1.8 1.8L19.7 11.2l-4.35 1.55a3 3 0 0 0-1.8 1.8L12 18.9l-1.55-4.35a3 3 0 0 0-1.8-1.8L4.3 11.2l4.35-1.55a3 3 0 0 0 1.8-1.8L12 3.5Z" />
    <path d="M18.7 4.2l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z" />
  </Base>
);

export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 12.2a3.85 3.85 0 1 0 0-7.7 3.85 3.85 0 0 0 0 7.7Z" />
    <path d="M4.5 19.5c0-3.2 3.36-5.5 7.5-5.5s7.5 2.3 7.5 5.5" />
  </Base>
);

export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.2 5 5.9v5.2c0 4.4 2.98 7.5 7 8.7 4.02-1.2 7-4.3 7-8.7V5.9l-7-2.7Z" />
  </Base>
);

export const IconShieldCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.2 5 5.9v5.2c0 4.4 2.98 7.5 7 8.7 4.02-1.2 7-4.3 7-8.7V5.9l-7-2.7Z" />
    <path d="m9.2 11.8 1.9 1.9 3.7-3.9" />
  </Base>
);

export const IconCard = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.6" />
    <path d="M3 9.5h18M6.5 15h4" />
  </Base>
);

export const IconAccess = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2.6" />
    <path d="m8.4 12 2.4 2.4 4.4-5" />
  </Base>
);

export const IconReceipt = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 3.5h12v17l-2-1.25-2 1.25-2-1.25L10 20.5l-2-1.25L6 20.5v-17Z" />
    <path d="M9 8.5h6M9 12h6" />
  </Base>
);

export const IconGrid = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="6.2" height="6.2" rx="1.6" />
    <rect x="13.8" y="4" width="6.2" height="6.2" rx="1.6" />
    <rect x="4" y="13.8" width="6.2" height="6.2" rx="1.6" />
    <rect x="13.8" y="13.8" width="6.2" height="6.2" rx="1.6" />
  </Base>
);

export const IconBell = (p: IconProps) => (
  <Base {...p}>
    <path d="M6.2 9a5.8 5.8 0 0 1 11.6 0c0 4.9 2 6.2 2 6.2H4.2s2-1.3 2-6.2Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Base>
);

export const IconChevron = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 6 6 6-6 6" />
  </Base>
);

export const IconArrow = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 16 16 8M9 8h7v7" />
  </Base>
);

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Base>
);

export const IconInfo = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11.5v4.5" />
    <path d="M12 8h.01" />
  </Base>
);

export const IconWarn = (p: IconProps) => (
  <Base {...p}>
    <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4" />
    <path d="M12 17h.01" />
  </Base>
);

export const IconMail = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.4" />
    <path d="m4.5 7 7.5 5.2L19.5 7" />
  </Base>
);

export const IconPhone = (p: IconProps) => (
  <Base {...p}>
    <path d="M6.4 4h3l1.4 3.8-1.9 1.4a11 11 0 0 0 4.9 4.9l1.4-1.9L19 15.6v3a1.9 1.9 0 0 1-2 1.9A15 15 0 0 1 4.5 6a1.9 1.9 0 0 1 1.9-2Z" />
  </Base>
);

export const IconGlobe = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M3.6 12h16.8M12 3.6c2.6 2.5 2.6 14.3 0 16.8M12 3.6c-2.6 2.5-2.6 14.3 0 16.8" />
  </Base>
);

export const IconClock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.6V12l3 1.8" />
  </Base>
);

export const IconCalendar = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2.4" />
    <path d="M4 9.5h16M8.5 3.5v3M15.5 3.5v3" />
  </Base>
);

export const IconLogout = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 12H6m3-3-3 3 3 3" />
    <path d="M13.5 4H17a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5" />
  </Base>
);

export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6 18 18M18 6 6 18" />
  </Base>
);

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconLock = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Base>
);

export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4v10m-4-3.5L12 14l4-3.5M5 19.5h14" />
  </Base>
);

export const IconMonitor = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="4.5" width="17" height="11.5" rx="2.2" />
    <path d="M9 20h6M12 16v4" />
  </Base>
);

export const IconSearch = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.6" />
    <path d="m20 20-3.6-3.6" />
  </Base>
);

export const IconBadge = (p: IconProps) => (
  <Base {...p}>
    <path d="m12 3.4 2.1 1.5 2.5-.2.9 2.4 2.1 1.4-.6 2.5.6 2.5-2.1 1.4-.9 2.4-2.5-.2L12 20.6l-2.1-1.5-2.5.2-.9-2.4-2.1-1.4.6-2.5-.6-2.5 2.1-1.4.9-2.4 2.5.2L12 3.4Z" />
    <path d="m9.4 12 1.8 1.8 3.4-3.6" />
  </Base>
);

export const IconSpark = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" />
  </Base>
);

export const IconDatabase = (p: IconProps) => (
  <Base {...p}>
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
    <path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
  </Base>
);

export const IconHelp = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M9.7 9.4a2.4 2.4 0 1 1 3.4 2.2c-.9.5-1.5 1-1.5 1.9v.3" />
    <path d="M12 16.6h.01" />
  </Base>
);

export const IconChat = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 6.5A2 2 0 0 1 6.5 4.5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3.5 3v-3H6.5a2 2 0 0 1-2-2Z" />
    <path d="M9 9h6M9 11.5h4" />
  </Base>
);

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 7h14M10 7V5.5A1.5 1.5 0 0 1 11.5 4h1A1.5 1.5 0 0 1 14 5.5V7M6.5 7l.7 11a2 2 0 0 0 2 1.9h5.6a2 2 0 0 0 2-1.9l.7-11" />
  </Base>
);
