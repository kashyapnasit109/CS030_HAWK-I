import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

const baseSvg = (size: number, paths: React.ReactNode, props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    {...props}
  >
    {paths}
  </svg>
);

export const DashboardIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
    props
  );

export const UploadIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </>
    ),
    props
  );

export const SearchIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
    props
  );

export const ResultsIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
    props
  );

export const CameraIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    props
  );

export const LiveIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
        <polygon points="12 7 17 12 12 17 12 7" />
      </>
    ),
    props
  );

export const FolderIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </>
    ),
    props
  );

export const AlertIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    props
  );

export const SettingsIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
    props
  );

export const ShieldIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </>
    ),
    props
  );

export const UsersIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    props
  );

export const ExportIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </>
    ),
    props
  );

export const EyeIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    props
  );

export const BellIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    props
  );

export const WarningIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    props
  );

export const LockIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    props
  );

export const SignalIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
        <path d="M7.76 16.24a6 6 0 0 1 0-8.48" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path d="M16.24 7.76a6 6 0 0 1 0 8.48" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </>
    ),
    props
  );

export const TargetIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
    props
  );

export const TrashIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),
    props
  );

export const PlusIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    props
  );

export const CloseIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
    props
  );

export const VideoIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </>
    ),
    props
  );

export const ClockIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    props
  );

export const CheckIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <polyline points="20 6 9 17 4 12" />
      </>
    ),
    props
  );

export const DownloadIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    props
  );

export const ChevronRightIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <polyline points="9 18 15 12 9 6" />
      </>
    ),
    props
  );

export const HourglassIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M5 22h14" />
        <path d="M5 2h14" />
        <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
        <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
      </>
    ),
    props
  );

export const ActivityIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </>
    ),
    props
  );

export const KeyIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </>
    ),
    props
  );

export const FileTextIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </>
    ),
    props
  );

export const SparklesIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
      </>
    ),
    props
  );

export const UserIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    props
  );

export const FilterIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </>
    ),
    props
  );

export const TagIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </>
    ),
    props
  );

export const RocketIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </>
    ),
    props
  );

export const FilmIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="2" y1="7" x2="7" y2="7" />
        <line x1="2" y1="17" x2="7" y2="17" />
        <line x1="17" y1="17" x2="22" y2="17" />
        <line x1="17" y1="7" x2="22" y2="7" />
      </>
    ),
    props
  );

export const MapIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </>
    ),
    props
  );

export const BarChartIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </>
    ),
    props
  );

export const PackageIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </>
    ),
    props
  );

export const ImageIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </>
    ),
    props
  );

export const PlayIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <polygon points="5 3 19 12 5 21 5 3" />
      </>
    ),
    props
  );

export const GridIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </>
    ),
    props
  );

export const ListIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </>
    ),
    props
  );

export const ArrowRightIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </>
    ),
    props
  );

export const TrendingUpIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </>
    ),
    props
  );

export const CarIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </>
    ),
    props
  );

export const MessageIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </>
    ),
    props
  );

export const ShirtIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" />
      </>
    ),
    props
  );

export const BuildingIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4" />
        <path d="M10 10h4" />
        <path d="M10 14h4" />
        <path d="M10 18h4" />
      </>
    ),
    props
  );

export const GlobeIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </>
    ),
    props
  );

export const ScaleIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="M7 21h10" />
        <path d="M12 3v18" />
        <path d="M3 7h18" />
      </>
    ),
    props
  );

export const DollarIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
    props
  );

export const HandshakeIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="m11 17 2 2a1 1 0 0 0 1.4 0l4.3-4.3a2 2 0 0 0 0-2.8l-2.1-2.1a2 2 0 0 0-2.8 0L11 13" />
        <path d="m14 14-1.5-1.5" />
        <path d="M10 11 8.6 9.6a2 2 0 0 0-2.8 0l-2.1 2.1a2 2 0 0 0 0 2.8L8 18.8a1 1 0 0 0 1.4 0l2.1-2.1" />
        <path d="m6 10 3 3" />
      </>
    ),
    props
  );

export const ScienceIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <path d="M6 18h12" />
        <path d="M3 22h18" />
        <path d="M14 22a7 7 0 1 0-4 0" />
        <path d="M9 14h6" />
        <path d="M9 10h6" />
        <path d="M12 2v8" />
      </>
    ),
    props
  );

export const PaletteIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <circle cx="13.5" cy="6.5" r=".5" />
        <circle cx="17.5" cy="10.5" r=".5" />
        <circle cx="8.5" cy="7.5" r=".5" />
        <circle cx="6.5" cy="12.5" r=".5" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.63 1.9-1.53.16-.76.78-1.47 1.6-1.47H17c2.76 0 5-2.24 5-5 0-4.42-4.03-8-10-8z" />
      </>
    ),
    props
  );

export const MailIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </>
    ),
    props
  );

export const CreditCardIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </>
    ),
    props
  );

export const BriefcaseIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </>
    ),
    props
  );

export const CpuIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect width="12" height="12" x="6" y="6" rx="2" />
        <line x1="9" x2="9" y1="2" y2="6" />
        <line x1="15" x2="15" y1="2" y2="6" />
        <line x1="9" x2="9" y1="18" y2="22" />
        <line x1="15" x2="15" y1="18" y2="22" />
        <line x1="2" x2="6" y1="9" y2="9" />
        <line x1="2" x2="6" y1="15" y2="15" />
        <line x1="18" x2="22" y1="9" y2="9" />
        <line x1="18" x2="22" y1="15" y2="15" />
      </>
    ),
    props
  );

export const ClipboardIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect width="14" height="16" x="5" y="5" rx="2" />
        <path d="M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1z" />
      </>
    ),
    props
  );

export const PauseIcon = ({ size = 18, ...props }: IconProps) =>
  baseSvg(
    size,
    (
      <>
        <rect width="4" height="16" x="6" y="4" rx="1" />
        <rect width="4" height="16" x="14" y="4" rx="1" />
      </>
    ),
    props
  );


