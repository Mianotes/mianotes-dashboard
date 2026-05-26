export const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

export function apiPath(path: string) {
  return `${apiBase}${path}`;
}

function sameOriginMediaPath(path: string) {
  if (!/^https?:\/\//.test(path) || apiBase) {
    return path;
  }
  if (typeof window === "undefined") {
    return path;
  }
  const url = new URL(path);
  if (url.origin !== window.location.origin) {
    return path;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function localMianotesApiMediaPath(path: string) {
  if (typeof window === "undefined") {
    return path;
  }
  const url = new URL(path);
  const isLocalApiHost = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (!apiBase && isLocalApiHost && url.port === "8200") {
    return `${url.pathname}${url.search}${url.hash}`;
  }
  return path;
}

export function mediaPath(path: string) {
  if (/^https?:\/\//.test(path)) {
    return sameOriginMediaPath(localMianotesApiMediaPath(path));
  }
  return apiPath(path);
}

export function normalizeMarkdownMediaPaths(markdown: string) {
  return markdown.replace(
    /https?:\/\/(?:127\.0\.0\.1|localhost):8200\/(?:markdown|data|\.profiles)\/[^\s)"'<]+/g,
    (match) => mediaPath(match)
  );
}

export function versionedMediaPath(path: string, version = Date.now()) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${version}`;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(apiPath(path), {
    ...options,
    headers,
    credentials: "include"
  });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = await response.json();
      message = payload.detail ?? payload.error?.message ?? message;
    } catch {
      // Keep the status text when the response body is not JSON.
    }
    throw new Error(Array.isArray(message) ? message.map((item) => item.msg).join(", ") : message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
