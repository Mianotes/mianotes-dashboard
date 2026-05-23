import type { StorageCapacityRecord } from "../api/types";

export const formatSettingsDate = (value?: string | null) => {
  if (!value) {
    return "Unknown date";
  }
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export function relativeTime(value: string) {
  const then = new Date(value).getTime();
  const diff = Date.now() - then;
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export function formatGigabytes(bytes: number) {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function formatStorageSize(bytes: number) {
  if (bytes < 1024 ** 2) {
    return `${Math.max(bytes / 1024, 0.1).toFixed(1)} KB`;
  }
  if (bytes < 1024 ** 3) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }
  return formatGigabytes(bytes);
}

export function mianotesStoragePercent(storage: StorageCapacityRecord | null) {
  if (!storage || storage.total_bytes <= 0) return 0;
  return ((storage.data_size_bytes ?? 0) / storage.total_bytes) * 100;
}
