import type { ReactNode, SVGProps } from 'react';
import { cx } from './cx';

/**
 * A small hand-rolled, stroke-based icon set. Keeping it in-tree avoids adding
 * an icon package (and its bundle weight) to a library whose only runtime
 * dependency should be React itself.
 */
export type IconName =
  | 'arrow-down'
  | 'arrow-right'
  | 'arrow-up'
  | 'bell'
  | 'calendar'
  | 'check'
  | 'check-circle'
  | 'clock'
  | 'command'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'close'
  | 'copy'
  | 'edit'
  | 'external'
  | 'filter'
  | 'folder'
  | 'home'
  | 'info'
  | 'inbox'
  | 'menu'
  | 'minus'
  | 'more'
  | 'moon'
  | 'plus'
  | 'search'
  | 'sliders'
  | 'sort'
  | 'star'
  | 'sun'
  | 'trash'
  | 'upload'
  | 'user'
  | 'warning';

const PATHS: Record<IconName, ReactNode> = {
  'arrow-down': <path d="M12 5v14m0 0l-6-6m6 6l6-6" />,
  'arrow-right': <path d="M5 12h14m0 0l-6-6m6 6l-6 6" />,
  'arrow-up': <path d="M12 19V5m0 0l6 6m-6-6l-6 6" />,
  bell: <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.5 20a2 2 0 0 0 3 0" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
      <path d="M3.5 10h17M8.5 3.5v3m7-3v3" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5 10-11" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.5 2" />
    </>
  ),
  command: (
    <>
      <path d="M9 9H6.5A2.5 2.5 0 1 1 9 6.5V9zm0 0h6m0 0V6.5A2.5 2.5 0 1 1 17.5 9H15m0 0v6m0 0h2.5A2.5 2.5 0 1 1 15 17.5V15m0 0H9m0 0v2.5A2.5 2.5 0 1 1 6.5 15H9m0 0V9" />
    </>
  ),
  'chevron-down': <path d="M6 9.5l6 6 6-6" />,
  'chevron-left': <path d="M14.5 6l-6 6 6 6" />,
  'chevron-right': <path d="M9.5 6l6 6-6 6" />,
  'chevron-up': <path d="M6 14.5l6-6 6 6" />,
  close: <path d="M6.5 6.5l11 11m0-11l-11 11" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h8.5" />
      <path d="M16.4 3.9a1.9 1.9 0 0 1 2.7 2.7L8.2 17.5 4 18.5l1-4.2z" />
    </>
  ),
  external: <path d="M14 4.5h5.5V10M19 5l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />,
  filter: <path d="M4 6.5h16M7 12h10m-7 5.5h4" />,
  folder: <path d="M3.5 8A2 2 0 0 1 5.5 6h3.2l1.6 2H18.5A2 2 0 0 1 20.5 10v7A2 2 0 0 1 18.5 19h-13A2 2 0 0 1 3.5 17z" />,
  home: (
    <>
      <path d="M4.5 11.5L12 4.5l7.5 7.5" />
      <path d="M6.5 10.5V19.5h4v-5h3v5h4V10.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.5v5m0-8h.01" />
    </>
  ),
  inbox: <path d="M4 6.5h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm0 7h4l1.5 2h5l1.5-2h4" />,
  menu: <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />,
  minus: <path d="M5 12h14" />,
  more: (
    <>
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18" cy="12" r="1.2" />
    </>
  ),
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5 8 8 0 1 0 19 14.5z" />,
  plus: <path d="M12 5v14m-7-7h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  sliders: <path d="M4 8h8m4 0h4M4 16h4m4 0h8M12 6v4m-4 4v4" />,
  sort: <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />,
  star: (
    <path d="M12 4.5l2.4 5 5.5.8-4 3.9 1 5.5-4.9-2.6-4.9 2.6 1-5.5-4-3.9 5.5-.8z" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3v2.5m0 13V21m9-9h-2.5m-13 0H3m14.8-6.3l-1.8 1.8M8 16l-1.8 1.8m0-11.6L8 8m9.8 9.8l-1.8-1.8" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14m-3.5 0v11a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V7M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M10 11v5m4-5v5" />
    </>
  ),
  upload: <path d="M12 15V5m0 0l-4 4m4-4l4 4M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4.5l8 14H4z" />
      <path d="M12 10.5v3.5m0 2.5h.01" />
    </>
  ),
};

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number | string;
}

export function Icon({ name, size = '1em', className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('mors-icon', className)}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
