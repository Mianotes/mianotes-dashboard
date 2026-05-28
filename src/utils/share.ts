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
  if (workspaceUrl) return workspaceUrl.replace(/\/$/, "");
  const origin = new URL(currentOrigin);
  if (isLocalOrPrivateHost(origin.hostname)) return null;
  return origin.origin;
}

export function shareTokenFromApiUrl(shareUrl: string) {
  const url = new URL(shareUrl, window.location.origin);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
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
  const token = encodeURIComponent(shareTokenFromApiUrl(shareUrl));
  const slug = title ? noteShareSlug(title) : null;
  const path = slug ? `/shared/${encodeURIComponent(slug)}/${token}` : `/shared/${token}`;
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}
