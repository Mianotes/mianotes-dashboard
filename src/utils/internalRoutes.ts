import type { DashboardUiState, FolderRecord, WorkspaceView } from "../api/types";

export type InternalRoute =
  | { kind: "dashboard" }
  | { kind: "note"; noteId: string; edit: boolean }
  | { kind: "folder"; folderName: string }
  | { kind: "users" }
  | { kind: "user"; userId: string }
  | { kind: "publish" }
  | { kind: "jobs" }
  | { kind: "settings" };

type RouteState = {
  workspaceView: WorkspaceView;
  selectedView: "recent" | "starred";
  selectedUserId: string | "all";
  selectedFolderId: string | "all";
  selectedTag: string | "all";
  openedNoteId: string | null;
  searchQuery: string;
  currentPage: number;
  profileUserId: string | "all";
  noteIdToEditOnOpen: string | null;
};

export function readInternalRoute(pathname = window.location.pathname): InternalRoute {
  const segments = pathname.split("/").filter(Boolean).map(decodeRouteSegment);
  const [section, id, mode] = segments;

  if (section === "note" && id) {
    return { kind: "note", noteId: id, edit: mode === "edit" };
  }
  if (section === "folder" && id) {
    return { kind: "folder", folderName: id };
  }
  if (section === "users" && !id) {
    return { kind: "users" };
  }
  if (section === "user" && id && (!mode || mode === "profile")) {
    return { kind: "user", userId: id };
  }
  if (section === "publish" && !id) {
    return { kind: "publish" };
  }
  if (section === "jobs" && !id) {
    return { kind: "jobs" };
  }
  if (section === "settings" && !id) {
    return { kind: "settings" };
  }
  return { kind: "dashboard" };
}

export function applyRouteToDashboardState(
  state: DashboardUiState,
  route: InternalRoute
): DashboardUiState {
  if (route.kind === "note") {
    return {
      ...state,
      selectedFolderId: "all",
      selectedTag: "all",
      openedNoteId: route.noteId,
      searchQuery: "",
      currentPage: 1
    };
  }
  if (route.kind === "folder") {
    return {
      ...state,
      selectedFolderId: "all",
      selectedTag: "all",
      openedNoteId: null,
      searchQuery: "",
      currentPage: 1
    };
  }
  if (["users", "user", "publish", "jobs", "settings"].includes(route.kind)) {
    return {
      ...state,
      openedNoteId: null,
      searchQuery: "",
      currentPage: 1
    };
  }
  return state;
}

export function workspaceViewForRoute(route: InternalRoute): WorkspaceView {
  if (route.kind === "users" || route.kind === "user") return "profile";
  if (route.kind === "publish") return "publish";
  if (route.kind === "jobs") return "jobs";
  if (route.kind === "settings") return "settings";
  return "notes";
}

export function profileUserIdForRoute(route: InternalRoute): string | "all" {
  if (route.kind === "user") return route.userId;
  return "all";
}

export function noteEditIdForRoute(route: InternalRoute): string | null {
  return route.kind === "note" && route.edit ? route.noteId : null;
}

export function pendingFolderNameForRoute(route: InternalRoute): string | null {
  return route.kind === "folder" ? route.folderName : null;
}

export function findFolderForRoute(folders: FolderRecord[], folderName: string) {
  const normalised = normaliseRouteValue(folderName);
  return folders.find((folder) => (
    normaliseRouteValue(folder.slug) === normalised
    || normaliseRouteValue(folder.name) === normalised
  )) ?? null;
}

export function routePathForState(state: RouteState, folders: FolderRecord[]) {
  if (state.openedNoteId) {
    return noteRoutePath(
      state.openedNoteId,
      state.noteIdToEditOnOpen === state.openedNoteId
    );
  }
  if (state.workspaceView === "profile") {
    return state.profileUserId === "all"
      ? "/users"
      : `/user/${encodeRouteSegment(state.profileUserId)}/profile`;
  }
  if (state.workspaceView === "publish") return "/publish";
  if (state.workspaceView === "jobs") return "/jobs";
  if (state.workspaceView === "settings") return "/settings";
  if (state.selectedFolderId !== "all") {
    const folder = folders.find((item) => item.id === state.selectedFolderId);
    return folder ? `/folder/${encodeRouteSegment(folder.slug || folder.name)}` : "/";
  }
  return "/";
}

export function noteRoutePath(noteId: string, edit = false) {
  return `/note/${encodeRouteSegment(noteId)}${edit ? "/edit" : ""}`;
}

export function appUrlForPath(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

function decodeRouteSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function encodeRouteSegment(value: string) {
  return encodeURIComponent(value);
}

function normaliseRouteValue(value: string) {
  return value.trim().toLowerCase();
}
