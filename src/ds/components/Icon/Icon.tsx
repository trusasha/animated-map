import type { CSSProperties, Ref } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Car, Check, ChevronDown, ChevronRight, Download, Ellipsis, Globe, GripVertical,
  House, Image, Loader, Lock, MapPin, Mic, Monitor, Moon, Pause, Pencil, Plane, Play, Plus, RotateCw, Search, Settings, Share,
  Ship, Square, Sun, Trash2, TriangleAlert, Upload, X,
  type LucideIcon,
} from 'lucide-react';
import { cx } from '../../lib/cx';
import styles from './Icon.module.css';

const registry = {
  settings: Settings,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'map-pin': MapPin,
  x: X,
  plus: Plus,
  mic: Mic,
  square: Square,
  play: Play,
  pause: Pause,
  download: Download,
  share: Share,
  'trash-2': Trash2,
  'more-horizontal': Ellipsis,
  'triangle-alert': TriangleAlert,
  loader: Loader,
  plane: Plane,
  car: Car,
  ship: Ship,
  'grip-vertical': GripVertical,
  check: Check,
  pencil: Pencil,
  'rotate-cw': RotateCw,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  upload: Upload,
  image: Image,
  lock: Lock,
  search: Search,
  home: House,
  globe: Globe,
  sun: Sun,
  moon: Moon,
  monitor: Monitor,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof registry;
export type IconSize = 16 | 18 | 20 | 24;

export const iconNames = Object.keys(registry) as IconName[];

export interface IconProps {
  name: IconName;
  size?: IconSize;
  /** Accessible name; without it the icon is decorative (aria-hidden). */
  label?: string;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<SVGSVGElement>;
}

export function Icon({ name, size = 18, label, className, style, ref }: IconProps) {
  const Glyph = registry[name];
  return (
    <Glyph
      ref={ref}
      className={cx(styles.icon, className)}
      style={style}
      size={size}
      strokeWidth={1.5}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    />
  );
}
