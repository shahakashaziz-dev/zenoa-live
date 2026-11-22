import React from 'react';
import {
  Cat,
  Compass,
  Heart,
  Leaf,
  Music,
  Rocket,
  Sparkles,
  Sun,
} from 'lucide-react';
import { AvatarId } from '../types/zenoa';

export interface AvatarMeta {
  id: AvatarId;
  label: string;
  bgClass: string;
  textClass: string;
  Icon: React.FC<{ className?: string }>;
}

export const AVATAR_OPTIONS: AvatarMeta[] = [
  {
    id: 'cat',
    label: 'Friendly Cat',
    bgClass: 'bg-violet-100 dark:bg-violet-900/60',
    textClass: 'text-violet-700 dark:text-violet-300',
    Icon: Cat,
  },
  {
    id: 'rocket',
    label: 'Explorer',
    bgClass: 'bg-sky-100 dark:bg-sky-900/60',
    textClass: 'text-sky-700 dark:text-sky-300',
    Icon: Rocket,
  },
  {
    id: 'sparkles',
    label: 'Stargazer',
    bgClass: 'bg-amber-100 dark:bg-amber-900/60',
    textClass: 'text-amber-700 dark:text-amber-300',
    Icon: Sparkles,
  },
  {
    id: 'sun',
    label: 'Sunrise',
    bgClass: 'bg-orange-100 dark:bg-orange-900/60',
    textClass: 'text-orange-700 dark:text-orange-300',
    Icon: Sun,
  },
  {
    id: 'compass',
    label: 'Voyager',
    bgClass: 'bg-cyan-100 dark:bg-cyan-900/60',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    Icon: Compass,
  },
  {
    id: 'music',
    label: 'Melody',
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/60',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    Icon: Music,
  },
  {
    id: 'leaf',
    label: 'Calm Breeze',
    bgClass: 'bg-blue-100 dark:bg-blue-900/60',
    textClass: 'text-blue-700 dark:text-blue-300',
    Icon: Leaf,
  },
  {
    id: 'heart',
    label: 'Warm Heart',
    bgClass: 'bg-rose-100 dark:bg-rose-900/60',
    textClass: 'text-rose-700 dark:text-rose-300',
    Icon: Heart,
  },
];

export function getAvatarMeta(id: AvatarId): AvatarMeta {
  return AVATAR_OPTIONS.find((item) => item.id === id) ?? AVATAR_OPTIONS[0];
}

export const UserAvatar: React.FC<{ avatar: AvatarId; size?: 'sm' | 'md' | 'lg' }> = ({
  avatar,
  size = 'md',
}) => {
  const meta = getAvatarMeta(avatar);
  const { Icon } = meta;
  const boxSize =
    size === 'sm' ? 'w-7 h-7 rounded-lg' : size === 'lg' ? 'w-12 h-12 rounded-2xl' : 'w-9 h-9 rounded-xl';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';

  return (
    <span
      className={`${boxSize} ${meta.bgClass} ${meta.textClass} inline-flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      <Icon className={iconSize} />
    </span>
  );
};
