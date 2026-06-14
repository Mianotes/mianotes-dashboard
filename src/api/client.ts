export const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
export const NETWORK_ERROR_MESSAGE = "Unable to fetch content. Please check that you are online and try again.";

type ApiFetchOptions = RequestInit & {
  workspaceId?: string | null;
};

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

export function normalizeNetworkError(error: unknown) {
  if (error instanceof TypeError) {
    return new Error(NETWORK_ERROR_MESSAGE);
  }
  return error;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { workspaceId, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  const requestWorkspaceId = workspaceId ?? null;
  if (requestWorkspaceId && path.startsWith("/api/") && !headers.has("X-Mianotes-Workspace")) {
    headers.set("X-Mianotes-Workspace", requestWorkspaceId);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(apiPath(path), {
      ...requestOptions,
      headers,
      credentials: "include"
    });
  } catch (error) {
    throw normalizeNetworkError(error);
  }
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
