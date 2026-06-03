export function isLocalOrPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host.endsWith(".local")) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export function stableShareBase(workspaceUrl: string | null, currentOrigin: string) {
  if (workspaceUrl) {
    const value = workspaceUrl.trim().replace(/^([a-z][a-z0-9+.-]*)::\/\//i, "$1://").replace(/\/$/, "");
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
  }
  const origin = new URL(currentOrigin);
  if (isLocalOrPrivateHost(origin.hostname)) return null;
  return origin.origin;
}

export type ShareRouteParts = {
  workspaceId: string;
  token: string;
};

export function sharePartsFromApiUrl(shareUrl: string): ShareRouteParts {
  const url = new URL(shareUrl, window.location.origin);
  const parts = url.pathname.split("/").filter(Boolean);
  const workspaceIndex = parts.findIndex((part, index) => part === "workspaces" && index > 0);
  const workspaceId = workspaceIndex >= 0 ? parts[workspaceIndex + 1] : "default";
  const token = parts[parts.length - 1] ?? "";
  return { workspaceId, token };
}

export function noteShareSlug(title: string, maxLength = 35) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.slice(0, maxLength).replace(/-+$/g, "") || "note";
}

export function guestShareUrl(baseUrl: string, shareUrl: string, title?: string) {
  const { workspaceId, token } = sharePartsFromApiUrl(shareUrl);
  const workspaceSegment = encodeURIComponent(workspaceId);
  const slug = title ? noteShareSlug(title) : null;
  const tokenSegment = encodeURIComponent(token);
  const path = slug
    ? `/shared/workspaces/${workspaceSegment}/${encodeURIComponent(slug)}/${tokenSegment}`
    : `/shared/workspaces/${workspaceSegment}/${tokenSegment}`;
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}
