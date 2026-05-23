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
  const appHost = window.location.hostname;
  const serviceHost = url.hostname;
  const isLocalService = (
    url.port === "8200"
    && ["127.0.0.1", "localhost", appHost].includes(serviceHost)
    && ["127.0.0.1", "localhost", serviceHost].includes(appHost)
  );
  if (!isLocalService) {
    return path;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function mediaPath(path: string) {
  if (/^https?:\/\//.test(path)) {
    return sameOriginMediaPath(path);
  }
  return apiPath(path);
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
