import { mediaPath } from "../../api/client";
import type { UserRecord } from "../../api/types";

const avatarTones = [
  "pink-dominant",
  "magenta-dominant",
  "violet-dominant",
  "purple-dominant",
  "blue-dominant",
  "cyan-dominant",
  "brand-pink",
  "brand-purple",
  "brand-blue"
] as const;

export type AvatarTone = (typeof avatarTones)[number];

export function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0] ?? "?").slice(0, 2).toUpperCase();
}

export function avatarTone(seed: string) {
  const hash = [...seed.trim().toLowerCase()].reduce((total, character) => (
    total + character.charCodeAt(0)
  ), 0);
  return avatarTones[hash % avatarTones.length];
}

export function randomAvatarTone() {
  return avatarTones[Math.floor(Math.random() * avatarTones.length)];
}

type UserAvatarProps = {
  user?: Pick<UserRecord, "id" | "name" | "photo_url"> | null;
  name?: string;
  className?: string;
};

export function UserAvatar({ user, name, className = "" }: UserAvatarProps) {
  const displayName = user?.name ?? name ?? "User";
  if (user?.photo_url) {
    return <img className={`avatar avatar-photo ${className}`} src={mediaPath(user.photo_url)} alt={displayName} />;
  }
  return <span className={`avatar avatar-${avatarTone(user?.id ?? displayName)} ${className}`}>{userInitials(displayName)}</span>;
}
