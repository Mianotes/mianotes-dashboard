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

function parseApiDate(value: string) {
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

export function relativeTime(value: string) {
  const then = parseApiDate(value).getTime();
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parseApiDate(value));
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
