import {
  Bot,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  File,
  FileText,
  Folder,
  History,
  Image,
  Link,
  LogOut,
  Loader2,
  Menu,
  MessageCircle,
  MoreVertical,
  Pin,
  Plus,
  Search,
  Settings,
  Share2,
  Star,
  Tags,
  Trash2,
  Upload,
  User,
  Users,
  X
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode, SyntheticEvent } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import logoUrl from "./assets/logo_small.png";
import logoMarkUrl from "./assets/mianotes_mark.svg";

const MarkdownViewer = lazy(() => import("./MarkdownViewer"));
const MarkdownEditor = lazy(() => import("./MarkdownViewer").then((module) => ({ default: module.MarkdownEditor })));

type UserRecord = {
  id: string;
  email: string;
  name: string;
  username: string;
  phone?: string | null;
  role?: string | null;
  is_admin: boolean;
  photo_url?: string | null;
};

type FolderRecord = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  is_pinned: boolean;
  archived_at: string | null;
};

type TagRecord = {
  id: string;
  name: string;
  slug: string;
};

type SourceFileRecord = {
  id: string;
  original_filename: string;
  content_type: string | null;
  url: string;
};

type NoteRecord = {
  id: string;
  user?: UserRecord;
  user_id?: string;
  folder?: FolderRecord;
  folder_id?: string;
  title: string;
  status: string;
  source_type: string;
  revision_number: number;
  is_published: boolean;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
  summary?: string;
  text?: string;
  note_url?: string;
  comments_count?: number;
  comments_url?: string;
  source_files?: SourceFileRecord[];
  tags?: TagRecord[];
  job_id?: string | null;
  job_status?: string | null;
};

type MiaPromptRecord = {
  type: "prompt";
  text: string;
};

type StorageCapacityRecord = {
  data_dir: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  used_percent: number;
  cache_seconds: number;
  refreshed_at: string;
  cache_expires_at: string;
};

type EmailCheckResponse = {
  user_id: string | null;
  is_first_user?: boolean;
  master_password_owner_name?: string | null;
};

type DashboardUiState = {
  selectedView: "recent" | "starred";
  selectedUserId: string | "all";
  selectedFolderId: string | "all";
  selectedTag: string | "all";
  openedNoteId: string | null;
  searchQuery: string;
  currentPage: number;
};

type NavigationSnapshot = DashboardUiState & {
  workspaceView: "notes" | "profile";
  profileUserId: string | "all";
  noteIdToEditOnOpen: string | null;
};

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
const dashboardUiStateKey = "mianotes.dashboard.uiState";
const notesPerPage = 10;

const defaultDashboardUiState: DashboardUiState = {
  selectedView: "recent",
  selectedUserId: "all",
  selectedFolderId: "all",
  selectedTag: "all",
  openedNoteId: null,
  searchQuery: "",
  currentPage: 1
};

const miaQuickActions = [
  { label: "Summarise", prompt: "summarise text" },
  { label: "Extract key points", prompt: "extract key points" },
  { label: "Humanize", prompt: "humanize text" }
] as const;

function apiPath(path: string) {
  return `${apiBase}${path}`;
}

function mediaPath(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return apiPath(path);
}

function versionedMediaPath(path: string, version = Date.now()) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${version}`;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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

function readDashboardUiState(): DashboardUiState {
  if (typeof window === "undefined") return defaultDashboardUiState;
  try {
    const raw = window.localStorage.getItem(dashboardUiStateKey);
    if (!raw) return defaultDashboardUiState;
    const value = JSON.parse(raw) as Partial<DashboardUiState>;
    return {
      selectedView: value.selectedView === "starred" ? "starred" : "recent",
      selectedUserId: typeof value.selectedUserId === "string" ? value.selectedUserId : "all",
      selectedFolderId: typeof value.selectedFolderId === "string" ? value.selectedFolderId : "all",
      selectedTag: typeof value.selectedTag === "string" ? value.selectedTag : "all",
      openedNoteId: typeof value.openedNoteId === "string" ? value.openedNoteId : null,
      searchQuery: typeof value.searchQuery === "string" ? value.searchQuery : "",
      currentPage: typeof value.currentPage === "number" && value.currentPage > 0
        ? Math.floor(value.currentPage)
        : 1
    };
  } catch {
    return defaultDashboardUiState;
  }
}

function writeDashboardUiState(state: DashboardUiState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(dashboardUiStateKey, JSON.stringify(state));
  } catch {
    // Ignore storage failures so private browsing or quota issues never break the app.
  }
}

function folderPermissionMessage(action: "change" | "rename" | "delete") {
  return `Only the folder owner or an admin can ${action} this folder.`;
}

function folderActionErrorMessage(err: unknown, action: "change" | "rename" | "delete") {
  const message = err instanceof Error ? err.message : "";
  if (message.toLowerCase().includes("owner") && message.toLowerCase().includes("admin")) {
    return folderPermissionMessage(action);
  }
  return message || `Could not ${action} folder.`;
}

function relativeTime(value: string) {
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

function noteExcerpt(note: NoteRecord) {
  const clean = (note.summary ?? noteBodyMarkdown(note.text ?? ""))
    .replace(/^# .+$/m, "")
    .replace(/Created: .+$/m, "")
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean || "Open this note to see its generated Markdown content.";
}

function noteBodyMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const noteHeadingIndex = lines.findIndex((line) => line.trim().toLowerCase() === "## note");
  if (noteHeadingIndex >= 0) {
    return lines.slice(noteHeadingIndex + 1).join("\n").trimStart();
  }

  const withoutTitle = lines[0]?.startsWith("# ") ? lines.slice(1) : lines;
  return withoutTitle
    .filter((line) => !line.trim().startsWith("Created:"))
    .join("\n")
    .trimStart();
}

function sourceIcon(type: string) {
  if (["pdf", "document", "markdown", "text"].includes(type)) return FileText;
  if (["image"].includes(type)) return Image;
  if (["link", "html"].includes(type)) return Link;
  return File;
}

function badgeTone(type: string) {
  if (type === "failed") return "danger";
  if (type === "pending_parse" || type === "parsing") return "warning";
  if (type === "link" || type === "html") return "blue";
  if (type === "image") return "green";
  if (type === "pdf") return "violet";
  return "neutral";
}

function isIndexingPlaceholder(text: string) {
  const normalised = text.toLowerCase();
  return normalised.includes("mia is indexing your link")
    || normalised.includes("status: pending parsing");
}

function hasUsableNoteContent(note: NoteRecord) {
  const summary = note.summary?.trim() ?? "";
  const body = noteBodyMarkdown(note.text ?? "").trim();

  return Boolean(summary && !isIndexingPlaceholder(summary))
    || Boolean(body && !isIndexingPlaceholder(body));
}

function isNoteIndexing(note: NoteRecord) {
  const finalStatuses = ["ready", "published", "failed", "completed", "succeeded"];
  const indexingStatuses = ["pending_parse", "parsing"];
  const indexingJobStatuses = ["queued", "running"];
  const isTextNote = ["text", "markdown"].includes(note.source_type);

  if (hasUsableNoteContent(note) || finalStatuses.includes(note.status)) {
    return false;
  }

  return indexingStatuses.includes(note.status)
    || (note.job_status ? indexingJobStatuses.includes(note.job_status) : false)
    || (!note.is_published && !isTextNote);
}

function formatGigabytes(bytes: number) {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function availableStoragePercent(storage: StorageCapacityRecord | null) {
  if (!storage || storage.total_bytes <= 0) return 0;
  return (storage.free_bytes / storage.total_bytes) * 100;
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0] ?? "?").slice(0, 2).toUpperCase();
}

function avatarTone(name: string) {
  const tones = ["magenta", "violet", "blue", "sky", "cyan"];
  const hash = [...name.trim().toLowerCase()].reduce((total, character) => (
    total + character.charCodeAt(0)
  ), 0);
  return tones[hash % tones.length];
}

function UserAvatar({
  user,
  name,
  className = ""
}: {
  user?: Pick<UserRecord, "name" | "photo_url"> | null;
  name?: string;
  className?: string;
}) {
  const displayName = user?.name ?? name ?? "User";
  if (user?.photo_url) {
    return <img className={`avatar avatar-photo ${className}`} src={mediaPath(user.photo_url)} alt={displayName} />;
  }
  return <span className={`avatar avatar-${avatarTone(displayName)} ${className}`}>{userInitials(displayName)}</span>;
}

export function App() {
  const initialUiState = useMemo(() => readDashboardUiState(), []);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [storageCapacity, setStorageCapacity] = useState<StorageCapacityRecord | null>(null);
  const [selectedView, setSelectedView] = useState<"recent" | "starred">(initialUiState.selectedView);
  const [selectedUserId, setSelectedUserId] = useState<string | "all">(initialUiState.selectedUserId);
  const [selectedFolderId, setSelectedFolderId] = useState<string | "all">(initialUiState.selectedFolderId);
  const [selectedTag, setSelectedTag] = useState<string | "all">(initialUiState.selectedTag);
  const [openedNoteId, setOpenedNoteId] = useState<string | null>(initialUiState.openedNoteId);
  const [searchQuery, setSearchQuery] = useState(initialUiState.searchQuery);
  const [currentPage, setCurrentPage] = useState(initialUiState.currentPage);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkspaceLoaded, setIsWorkspaceLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<"notes" | "profile">("notes");
  const [profileUserId, setProfileUserId] = useState<string | "all">("all");
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<FolderRecord | null>(null);
  const [noteIdToEditOnOpen, setNoteIdToEditOnOpen] = useState<string | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const folderActionsMenuRef = useRef<HTMLDivElement | null>(null);
  const openedNoteIdRef = useRef<string | null>(initialUiState.openedNoteId);
  const navigationStackRef = useRef<NavigationSnapshot[]>([]);

  function clearSearch() {
    setSearchQuery("");
  }

  function navigationSnapshot(overrides: Partial<NavigationSnapshot> = {}): NavigationSnapshot {
    return {
      selectedView,
      selectedUserId,
      selectedFolderId,
      selectedTag,
      openedNoteId,
      searchQuery,
      currentPage,
      workspaceView,
      profileUserId,
      noteIdToEditOnOpen,
      ...overrides
    };
  }

  function restoreNavigationSnapshot(snapshot: NavigationSnapshot) {
    setSelectedView(snapshot.selectedView);
    setSelectedUserId(snapshot.selectedUserId);
    setSelectedFolderId(snapshot.selectedFolderId);
    setSelectedTag(snapshot.selectedTag);
    setOpenedNoteId(snapshot.openedNoteId);
    setSearchQuery(snapshot.searchQuery);
    setCurrentPage(snapshot.currentPage);
    setWorkspaceView(snapshot.workspaceView);
    setProfileUserId(snapshot.profileUserId);
    setNoteIdToEditOnOpen(snapshot.noteIdToEditOnOpen);
    setIsAccountOpen(false);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function pushNavigationSnapshot(snapshot = navigationSnapshot()) {
    navigationStackRef.current.push(snapshot);
    window.history.pushState({ mianotesView: "dashboard" }, "", window.location.href);
  }

  function goBack() {
    if (navigationStackRef.current.length > 0) {
      window.history.back();
      return;
    }

    restoreNavigationSnapshot(navigationSnapshot({
      workspaceView: "notes",
      openedNoteId: null,
      noteIdToEditOnOpen: null
    }));
  }

  function changePage(nextPage: number) {
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function selectView(view: "recent" | "starred") {
    clearSearch();
    setCurrentPage(1);
    setSelectedView(view);
    setWorkspaceView("notes");
    setOpenedNoteId(null);
    setIsSidebarOpen(false);
  }

  function selectFolder(folderId: string) {
    clearSearch();
    setCurrentPage(1);
    setSelectedFolderId(folderId);
    setWorkspaceView("notes");
    setOpenedNoteId(null);
    setIsSidebarOpen(false);
  }

  function selectUser(userId: string) {
    clearSearch();
    setCurrentPage(1);
    setSelectedUserId(userId);
  }

  function clearSelectedTag() {
    clearSearch();
    setCurrentPage(1);
    setSelectedTag("all");
  }

  function openAddNote() {
    clearSearch();
    setWorkspaceView("notes");
    setOpenedNoteId(null);
    setIsSidebarOpen(false);
    setIsAddOpen(true);
  }

  function openAddFolder() {
    clearSearch();
    setWorkspaceView("notes");
    setOpenedNoteId(null);
    setIsSidebarOpen(false);
    setIsFolderOpen(true);
  }

  function openProfile(profileId: string | "all" = currentUser?.id ?? "all") {
    clearSearch();
    pushNavigationSnapshot();
    setWorkspaceView("profile");
    setProfileUserId(profileId);
    setOpenedNoteId(null);
    setIsAccountOpen(false);
    setIsSidebarOpen(false);
    window.scrollTo(0, 0);
  }

  function openProfileTag(userId: string, tagSlug: string) {
    clearSearch();
    pushNavigationSnapshot();
    setSelectedView("recent");
    setSelectedFolderId("all");
    setSelectedUserId(userId);
    setSelectedTag(tagSlug);
    setCurrentPage(1);
    setWorkspaceView("notes");
    setOpenedNoteId(null);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    const initialNoteId = openedNoteIdRef.current;
    window.history.replaceState({ mianotesView: "dashboard-root" }, "", window.location.href);
    if (initialNoteId) {
      navigationStackRef.current.push({
        ...defaultDashboardUiState,
        ...readDashboardUiState(),
        openedNoteId: null,
        workspaceView: "notes",
        profileUserId: "all",
        noteIdToEditOnOpen: null
      });
      window.history.pushState({ mianotesView: "dashboard" }, "", window.location.href);
    }

    function handleBrowserBack() {
      const snapshot = navigationStackRef.current.pop();
      if (snapshot) {
        restoreNavigationSnapshot(snapshot);
        return;
      }

      if (openedNoteIdRef.current) {
        setOpenedNoteId(null);
        setNoteIdToEditOnOpen(null);
      }
    }

    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, []);

  useEffect(() => {
    if (!isAccountOpen) return;

    function closeAccountMenu(event: PointerEvent) {
      if (
        event.target instanceof Node
        && accountMenuRef.current
        && !accountMenuRef.current.contains(event.target)
      ) {
        setIsAccountOpen(false);
      }
    }

    function closeAccountMenuOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeAccountMenu);
    document.addEventListener("keydown", closeAccountMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeAccountMenu);
      document.removeEventListener("keydown", closeAccountMenuOnEscape);
    };
  }, [isAccountOpen]);

  useEffect(() => {
    if (!openFolderMenuId) return;

    function closeFolderMenu(event: PointerEvent) {
      if (
        event.target instanceof Node
        && folderActionsMenuRef.current
        && !folderActionsMenuRef.current.contains(event.target)
      ) {
        setOpenFolderMenuId(null);
      }
    }

    function closeFolderMenuOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenFolderMenuId(null);
      }
    }

    document.addEventListener("pointerdown", closeFolderMenu);
    document.addEventListener("keydown", closeFolderMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFolderMenu);
      document.removeEventListener("keydown", closeFolderMenuOnEscape);
    };
  }, [openFolderMenuId]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    function closeSidebarOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    }

    document.addEventListener("keydown", closeSidebarOnEscape);
    return () => document.removeEventListener("keydown", closeSidebarOnEscape);
  }, [isSidebarOpen]);

  useEffect(() => {
    if (openedNoteId) {
      setIsSidebarOpen(false);
    }
    openedNoteIdRef.current = openedNoteId;
  }, [openedNoteId]);

  async function updateFolder(folder: FolderRecord, update: Partial<Pick<FolderRecord, "name" | "is_pinned">>) {
    setError(null);
    try {
      await apiFetch<FolderRecord>(`/api/folders/${folder.id}`, {
        method: "PATCH",
        body: JSON.stringify(update)
      });
      setOpenFolderMenuId(null);
      await loadWorkspace();
      return { ok: true };
    } catch (err) {
      const message = folderActionErrorMessage(err, update.name ? "rename" : "change");
      setError(message);
      return { ok: false, error: message };
    }
  }

  async function deleteFolder(folder: FolderRecord) {
    const confirmed = window.confirm(`Archive "${folder.name}"? Notes and sources will be moved out of the active folders list.`);
    if (!confirmed) return;
    setError(null);
    try {
      await apiFetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      setOpenFolderMenuId(null);
      if (selectedFolderId === folder.id) {
        setSelectedFolderId("all");
      }
      await loadWorkspace();
    } catch (err) {
      setError(folderActionErrorMessage(err, "delete"));
    }
  }

  async function bootstrap() {
    setIsLoading(true);
    setIsWorkspaceLoaded(false);
    setError(null);
    try {
      const session = await apiFetch<{ user: UserRecord }>("/api/auth/session");
      setCurrentUser(session.user);
      await loadWorkspace();
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadWorkspace() {
    const [nextUsers, nextFolders, nextTags, nextNotes, nextStorageCapacity] = await Promise.all([
      apiFetch<UserRecord[]>("/api/users"),
      apiFetch<FolderRecord[]>("/api/folders"),
      apiFetch<TagRecord[]>("/api/tags"),
      apiFetch<NoteRecord[]>("/api/notes"),
      apiFetch<StorageCapacityRecord>("/api/storage").catch(() => null)
    ]);
    const activeFolders = nextFolders.filter((folder) => !folder.archived_at);
    const hydrated = hydrateNotes(nextNotes, nextUsers, activeFolders);
    setUsers(nextUsers);
    setFolders(activeFolders);
    setTags(nextTags);
    setNotes(hydrated);
    setStorageCapacity(nextStorageCapacity);
    setIsWorkspaceLoaded(true);
  }

  async function refreshNotes() {
    const nextNotes = await apiFetch<NoteRecord[]>("/api/notes");
    const hydrated = hydrateNotes(nextNotes, users, folders);
    setNotes((items) => (
      hydrated.map((note) => {
        const current = items.find((item) => item.id === note.id);
        return current ? mergeNoteRecord(current, note) : note;
      })
    ));
    setOpenedNoteId((current) => current && hydrated.some((note) => note.id === current) ? current : null);
  }

  async function toggleNoteStar(note: NoteRecord) {
    const nextStarred = !note.is_starred;
    setNotes((items) => (
      items.map((item) => item.id === note.id ? { ...item, is_starred: nextStarred } : item)
    ));
    try {
      const updated = await apiFetch<NoteRecord>(`/api/notes/${note.id}/star`, {
        method: "PATCH",
        body: JSON.stringify({ is_starred: nextStarred })
      });
      setNotes((items) => items.map((item) => item.id === note.id ? mergeNoteRecord(item, updated) : item));
    } catch (err) {
      setNotes((items) => (
        items.map((item) => item.id === note.id ? { ...item, is_starred: note.is_starred } : item)
      ));
      setError("Could not update the star. Please refresh the Mianotes service and try again.");
    }
  }

  async function openNote(note: NoteRecord, startInEdit = false) {
    const previousScreen = navigationSnapshot();
    try {
      const fullNote = await apiFetch<NoteRecord>(`/api/notes/${note.id}`);
      setNotes((items) => (
        items.map((item) => item.id === note.id ? mergeNoteRecord(item, fullNote) : item)
      ));
      pushNavigationSnapshot(previousScreen);
      if (startInEdit) {
        setNoteIdToEditOnOpen(note.id);
      }
      setOpenedNoteId(note.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open note");
    }
  }

  const notesByFolder = useMemo(() => countBy(notes, (note) => note.folder?.id ?? note.folder_id ?? ""), [notes]);
  const selectedFolder = selectedFolderId === "all" ? null : folders.find((folder) => folder.id === selectedFolderId) ?? null;
  const selectedTagRecord = selectedTag === "all" ? null : tags.find((tag) => tag.slug === selectedTag) ?? null;
  const selectedUser = selectedUserId === "all" ? null : users.find((user) => user.id === selectedUserId) ?? null;
  const breadcrumbItems = [
    selectedUser?.name
  ].filter(Boolean);
  const tagSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const tagMap = new Map<string, TagRecord>();
    notes.forEach((note) => {
      if (selectedView === "starred" && !note.is_starred) return;
      const userMatch = selectedUserId === "all" || note.user_id === selectedUserId;
      if (!userMatch) return;
      const folderMatch = selectedFolderId === "all" || note.folder_id === selectedFolderId;
      if (!folderMatch) return;
      const noteMatches = noteSearchText(note).includes(query);
      note.tags?.forEach((tag) => {
        const tagMatches = `${tag.name} ${tag.slug}`.toLowerCase().includes(query);
        if ((noteMatches || tagMatches) && tag.slug !== selectedTag) {
          tagMap.set(tag.slug, tag);
        }
      });
    });

    return Array.from(tagMap.values())
      .sort((first, second) => first.name.localeCompare(second.name))
      .slice(0, 6);
  }, [notes, searchQuery, selectedFolderId, selectedTag, selectedUserId, selectedView]);
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      if (selectedView === "starred" && !note.is_starred) return false;
      const userMatch = selectedUserId === "all" || note.user_id === selectedUserId;
      if (!userMatch) return false;
      const folderMatch = selectedFolderId === "all" || note.folder_id === selectedFolderId;
      if (!folderMatch) return false;
      const tagMatch = selectedTag === "all" || note.tags?.some((tag) => tag.slug === selectedTag);
      if (!tagMatch) return false;
      if (!query) return true;
      return noteSearchText(note).includes(query);
    });
  }, [notes, searchQuery, selectedFolderId, selectedTag, selectedUserId, selectedView]);
  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / notesPerPage));
  const clampedPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (clampedPage - 1) * notesPerPage;
  const paginatedNotes = filteredNotes.slice(pageStartIndex, pageStartIndex + notesPerPage);
  const visibleStart = filteredNotes.length === 0 ? 0 : pageStartIndex + 1;
  const visibleEnd = Math.min(pageStartIndex + paginatedNotes.length, filteredNotes.length);

  const openedNote = notes.find((note) => note.id === openedNoteId) ?? null;
  const hasPendingNotes = useMemo(
    () => notes.some((note) => ["pending_parse", "parsing"].includes(note.status)),
    [notes]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded) return;

    setProfileUserId((current) => (
      current === "all" || users.some((user) => user.id === current) ? current : currentUser.id
    ));

    setSelectedUserId((current) => (
      current === "all" || users.some((user) => user.id === current) ? current : "all"
    ));
    setSelectedFolderId((current) => (
      current === "all" || folders.some((folder) => folder.id === current) ? current : "all"
    ));
    setSelectedTag((current) => (
      current === "all" || tags.some((tag) => tag.slug === current) ? current : "all"
    ));
    setOpenedNoteId((current) => (
      current === null || notes.some((note) => note.id === current) ? current : null
    ));
  }, [currentUser, isWorkspaceLoaded, notes, folders, tags, users]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded || !hasPendingNotes) return;

    let cancelled = false;

    async function pollPendingNotes() {
      try {
        const nextNotes = await apiFetch<NoteRecord[]>("/api/notes");
        if (cancelled) return;

        const hydrated = hydrateNotes(nextNotes, users, folders);
        setNotes((items) => (
          hydrated.map((note) => {
            const current = items.find((item) => item.id === note.id);
            return current ? mergeNoteRecord(current, note) : note;
          })
        ));

        if (openedNoteId && hydrated.some((note) => note.id === openedNoteId)) {
          const fullNote = await apiFetch<NoteRecord>(`/api/notes/${openedNoteId}`);
          if (cancelled) return;

          setNotes((items) => (
            items.map((item) => item.id === openedNoteId ? mergeNoteRecord(item, fullNote) : item)
          ));
        }
      } catch {
        // Keep the current draft visible; explicit user actions surface their own errors.
      }
    }

    void pollPendingNotes();
    const intervalId = window.setInterval(() => {
      void pollPendingNotes();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentUser, hasPendingNotes, isWorkspaceLoaded, openedNoteId, folders, users]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded) return;

    writeDashboardUiState({
      selectedView,
      selectedUserId,
      selectedFolderId,
      selectedTag,
      openedNoteId,
      searchQuery,
      currentPage: clampedPage
    });
  }, [
    clampedPage,
    currentUser,
    isWorkspaceLoaded,
    openedNoteId,
    searchQuery,
    selectedFolderId,
    selectedTag,
    selectedUserId,
    selectedView
  ]);

  useEffect(() => {
    if (!openedNote || openedNote.text) return;
    void apiFetch<NoteRecord>(`/api/notes/${openedNote.id}`)
      .then((fullNote) => setNotes((items) => (
        items.map((item) => item.id === openedNote.id ? mergeNoteRecord(item, fullNote) : item)
      )))
      .catch(() => undefined);
  }, [openedNote?.id]);

  useEffect(() => {
    if (!openedNote || hasUsableNoteContent(openedNote) || openedNote.status === "failed") return;
    if (["text", "markdown"].includes(openedNote.source_type) && openedNote.is_published) return;

    let cancelled = false;
    const noteId = openedNote.id;

    async function refreshOpenedNote() {
      try {
        const fullNote = await apiFetch<NoteRecord>(`/api/notes/${noteId}`);
        if (cancelled || !fullNote) return;

        setNotes((items) => (
          items.map((item) => item.id === fullNote.id ? mergeNoteRecord(item, fullNote) : item)
        ));
      } catch {
        // Keep the current draft visible; opening or saving the note will surface errors.
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshOpenedNote();
    }, 2500);
    void refreshOpenedNote();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    openedNote?.id,
    openedNote?.is_published,
    openedNote?.source_type,
    openedNote?.status,
    openedNote?.summary,
    openedNote?.text
  ]);

  useEffect(() => {
    if (!openedNoteId) return;
    window.scrollTo(0, 0);
  }, [openedNoteId]);

  if (isLoading) {
    return (
      <main className="screen centered">
        <Loader2 className="spin" size={28} />
      </main>
    );
  }

  if (!currentUser) {
    return <AuthScreen onSignedIn={bootstrap} />;
  }

  const canManageFolder = (folder: FolderRecord) => currentUser.is_admin || folder.user_id === currentUser.id;

  return (
    <main className="screen">
      <button
        className="sidebar-backdrop"
        type="button"
        aria-label="Close sidebar"
        aria-hidden={!isSidebarOpen}
        onClick={() => setIsSidebarOpen(false)}
      />
      <section className={`shell ${openedNote ? "note-open" : ""}`} aria-label="Mianotes dashboard">
        <aside className={`sidebar ${isSidebarOpen ? "is-open" : ""}`}>
          <button className="add-note-button" onClick={openAddNote}>
            <Plus size={19} />
            <span>Add Note</span>
          </button>

          <nav className="nav-group" aria-label="Note filters">
            <button className={`nav-item ${selectedView === "recent" ? "active" : ""}`} onClick={() => selectView("recent")}>
              <History size={20} />
              <span>Recent</span>
            </button>
            <button className={`nav-item ${selectedView === "starred" ? "active" : ""}`} onClick={() => selectView("starred")}>
              <Star size={20} />
              <span>Starred</span>
            </button>
          </nav>

          <SidebarSection
            title="Folders"
            action={<button className="icon-button" aria-label="Add folder" onClick={openAddFolder}><Plus size={15} /></button>}
          >
            {folders.map((folder) => {
              const canManageThisFolder = canManageFolder(folder);
              const folderDisabledTitle = canManageThisFolder
                ? undefined
                : folderPermissionMessage("change");

              return (
                <div
                  key={folder.id}
                  className={`nav-item folder-nav-item ${selectedFolderId === folder.id ? "active-soft" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectFolder(folder.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    selectFolder(folder.id);
                  }}
                >
                  {folder.is_pinned ? <Pin size={18} /> : <Folder size={19} />}
                  <span>{folder.name}</span>
                  <div
                    className="folder-actions-menu"
                    ref={openFolderMenuId === folder.id ? folderActionsMenuRef : null}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <small className="folder-note-count">{notesByFolder[folder.id] ?? 0}</small>
                    <button
                      className="folder-more-button"
                      type="button"
                      aria-label={`Folder actions for ${folder.name}`}
                      aria-expanded={openFolderMenuId === folder.id}
                      onClick={() => setOpenFolderMenuId((current) => current === folder.id ? null : folder.id)}
                    >
                      <MoreVertical size={17} />
                    </button>
                    {openFolderMenuId === folder.id && (
                      <div className="folder-actions-popover" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          disabled={!canManageThisFolder}
                          title={folderDisabledTitle}
                          onClick={() => void updateFolder(folder, { is_pinned: !folder.is_pinned })}
                        >
                          <Pin size={15} />
                          {folder.is_pinned ? "Unpin" : "Pin to top"}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          disabled={!canManageThisFolder}
                          title={canManageThisFolder ? undefined : folderPermissionMessage("rename")}
                          onClick={() => {
                            setOpenFolderMenuId(null);
                            setRenamingFolder(folder);
                          }}
                        >
                          <Edit3 size={15} />
                          Rename
                        </button>
                        <div className="note-actions-divider" />
                        <button
                          className="danger-action"
                          type="button"
                          role="menuitem"
                          disabled={!canManageThisFolder}
                          title={canManageThisFolder ? undefined : folderPermissionMessage("delete")}
                          onClick={() => void deleteFolder(folder)}
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </SidebarSection>

          <div className="storage-meter">
            <div>
              <span>Storage</span>
              <strong>{storageCapacity ? `${formatGigabytes(storageCapacity.free_bytes)} available` : "Checking..."}</strong>
            </div>
            <div className="meter-track">
              <div
                className="meter-fill"
                style={{ width: `${Math.min(availableStoragePercent(storageCapacity), 100)}%` }}
              />
            </div>
          </div>

          <div className="sidebar-reserved-space" aria-hidden="true" />
        </aside>

        <section className="workspace">
          {workspaceView === "notes" && !openedNote && (
            <header className="toolbar">
              <button
                className="mobile-sidebar-toggle"
                type="button"
                aria-label="Open sidebar"
                aria-expanded={isSidebarOpen}
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div className="breadcrumb">
                <span>Folder</span>
                <span className={breadcrumbItems.length === 0 && !selectedTagRecord ? "current" : undefined}>
                  <ChevronRight size={14} />
                  {selectedFolder?.name ?? "All folders"}
                </span>
                {breadcrumbItems.map((item, index) => (
                  <span key={`${item}-${index}`} className={index === breadcrumbItems.length - 1 ? "current" : undefined}>
                    <ChevronRight size={14} />
                    {item}
                  </span>
                ))}
                {selectedTagRecord && (
                  <button className="breadcrumb-filter-chip" type="button" onClick={clearSelectedTag}>
                    {selectedTagRecord.name}
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="toolbar-actions">
                <div className="search-area">
                  <label className="search-box">
                    <Search size={18} />
                    <input
                      value={searchQuery}
                      onChange={(event) => {
                        setCurrentPage(1);
                        setSearchQuery(event.target.value);
                      }}
                      placeholder="Search notes..."
                    />
                  </label>
                  {tagSuggestions.length > 0 && (
                    <div className="tag-suggestions" role="listbox" aria-label="Suggested tags">
                      <div className="tag-suggestions-title">Recommended tags</div>
                      <div className="tag-suggestions-list">
                        {tagSuggestions.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              setSelectedTag(tag.slug);
                              setCurrentPage(1);
                              setSearchQuery("");
                            }}
                          >
                            <Tags size={14} />
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <label className="select-button user-select-button">
                  <User className="select-button-icon" size={16} />
                  <span className="select-button-label">{selectedUser?.name ?? "All users"}</span>
                  <select value={selectedUserId} onChange={(event) => selectUser(event.target.value)}>
                    <option value="all">All users</option>
                    {users.map((person) => (
                      <option value={person.id} key={person.id}>{person.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="select-button-chevron" size={12} />
                </label>
                <div className="account-menu" ref={accountMenuRef}>
                  <button
                    className="account-avatar-button"
                    type="button"
                    aria-expanded={isAccountOpen}
                    aria-haspopup="menu"
                    onClick={() => setIsAccountOpen((value) => !value)}
                  >
                    <UserAvatar user={currentUser} />
                  </button>
                  {isAccountOpen && (
                    <div className="account-popover" role="menu">
                      <div className="account-popover-header">
                        <UserAvatar user={currentUser} className="account-popover-avatar" />
                        <TypewriterText text={currentUser.name} />
                      </div>
                      <div className="account-popover-group">
                        <button type="button" role="menuitem" onClick={() => openProfile(currentUser.id)}>
                          <User size={16} />
                          <span>Profile</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => openProfile("all")}>
                          <Users size={16} />
                          <span>Users</span>
                        </button>
                        {currentUser.is_admin && (
                          <button type="button" role="menuitem">
                            <Settings size={16} />
                            <span>Settings</span>
                          </button>
                        )}
                      </div>
                      <div className="account-popover-group">
                        <button
                          className="danger"
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsAccountOpen(false);
                            void logout(setCurrentUser);
                          }}
                        >
                          <LogOut size={16} />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>
          )}

          {workspaceView === "profile" ? (
            <ProfileScreen
              users={users}
              notes={notes}
              folders={folders}
              currentUser={currentUser}
              selectedUserId={profileUserId}
              onSelectUser={setProfileUserId}
              onBack={goBack}
              onSignOut={() => void logout(setCurrentUser)}
              onUserUpdated={(updatedUser) => {
                setUsers((items) => items.map((user) => user.id === updatedUser.id ? updatedUser : user));
                setNotes((items) => (
                  items.map((note) => (
                    note.user?.id === updatedUser.id || note.user_id === updatedUser.id
                      ? { ...note, user: updatedUser }
                      : note
                  ))
                ));
                if (currentUser.id === updatedUser.id) {
                  setCurrentUser(updatedUser);
                }
              }}
              onSelectTag={openProfileTag}
            />
          ) : (
            <>
              {error && (
                <div className="dashboard-notice" role="status">
                  <span>{error}</span>
                  <button type="button" aria-label="Dismiss message" onClick={() => setError(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="content-surface">
                {openedNote ? (
                  <NotePanel
                    note={openedNote}
                    folderLabel={openedNote.folder?.name ?? selectedFolder?.name ?? "All folders"}
                    currentUser={currentUser}
                    startInEdit={noteIdToEditOnOpen === openedNote.id}
                    onStartInEditConsumed={() => setNoteIdToEditOnOpen(null)}
                    onClose={goBack}
                    onRefresh={async () => {
                      const fullNote = await apiFetch<NoteRecord>(`/api/notes/${openedNote.id}`);
                      setNotes((items) => (
                        items.map((item) => item.id === openedNote.id ? mergeNoteRecord(item, fullNote) : item)
                      ));
                    }}
                    onDeleted={async () => {
                      setOpenedNoteId(null);
                      await refreshNotes();
                    }}
                  />
                ) : (
                  <>
                    <section className="note-list" aria-label="Notes">
                      {filteredNotes.length === 0 ? (
                        <EmptyState onAdd={openAddNote} />
                      ) : (
                        paginatedNotes.map((note) => (
                          <NoteRow
                            key={note.id}
                            note={note}
                            currentUser={currentUser}
                            onToggleStar={() => void toggleNoteStar(note)}
                            onClick={() => void openNote(note)}
                            onEdit={() => void openNote(note, true)}
                            onDeleted={refreshNotes}
                            onError={setError}
                          />
                        ))
                      )}
                    </section>
                    {filteredNotes.length > 0 && (
                      <footer className="list-pagination" aria-label="Note list pagination">
                        <span className="result-count">
                          {visibleStart}-{visibleEnd} notes of {filteredNotes.length}
                        </span>
                        <button
                          className="icon-button"
                          aria-label="Previous page"
                          disabled={clampedPage <= 1}
                          onClick={() => changePage(Math.max(1, clampedPage - 1))}
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label="Next page"
                          disabled={clampedPage >= totalPages}
                          onClick={() => changePage(Math.min(totalPages, clampedPage + 1))}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </footer>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </section>

      <footer className="brand-footer">
        <img className="brand-logo" src={logoUrl} alt="Mianotes" />
      </footer>

      {isAddOpen && (
        <AddNoteDialog
          folders={folders}
          selectedFolderId={selectedFolderId}
          onClose={() => setIsAddOpen(false)}
          onCreated={async (note, shouldEdit) => {
            const previousScreen = navigationSnapshot({
              workspaceView: "notes",
              openedNoteId: null,
              noteIdToEditOnOpen: null
            });
            setSelectedView("recent");
            setSearchQuery("");
            setSelectedTag("all");
            setCurrentPage(1);
            setNotes((items) => {
              const hydratedNote = hydrateNotes([note], users, folders)[0] ?? note;
              return items.some((item) => item.id === note.id)
                ? items.map((item) => item.id === note.id ? mergeNoteRecord(item, hydratedNote) : item)
                : [hydratedNote, ...items];
            });
            pushNavigationSnapshot(previousScreen);
            setOpenedNoteId(note.id);
            setNoteIdToEditOnOpen(shouldEdit ? note.id : null);
            setIsAddOpen(false);
            await refreshNotes();
          }}
          onError={setError}
        />
      )}
      {isFolderOpen && (
        <AddFolderDialog
          onClose={() => setIsFolderOpen(false)}
          onCreated={async (folder) => {
            setIsFolderOpen(false);
            await loadWorkspace();
            setSelectedFolderId(folder.id);
          }}
          onError={setError}
        />
      )}
      {renamingFolder && (
        <RenameFolderDialog
          folder={renamingFolder}
          onClose={() => setRenamingFolder(null)}
          onRename={async (name) => {
            const result = await updateFolder(renamingFolder, { name });
            if (result.ok) setRenamingFolder(null);
            return result;
          }}
        />
      )}
    </main>
  );
}

function TypewriterText({ text }: { text: string }) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    setVisibleText("");

    let index = 0;
    let timeoutId: number | undefined;

    function typeNextCharacter() {
      index += 1;
      setVisibleText(text.slice(0, index));
      if (index < text.length) {
        timeoutId = window.setTimeout(typeNextCharacter, 30);
      }
    }

    timeoutId = window.setTimeout(typeNextCharacter, 30);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [text]);

  return (
    <span className="typewriter-name" aria-label={text}>
      {visibleText}
      <span className="typewriter-cursor" aria-hidden="true" />
    </span>
  );
}

function userDisplayRole(user: UserRecord) {
  const jobTitle = user.role?.trim();
  if (jobTitle) {
    return user.is_admin ? `${jobTitle} (Admin)` : jobTitle;
  }
  return user.is_admin ? "Admin" : "Not set";
}

function profileScopedNotes(user: UserRecord, notes: NoteRecord[], folders: FolderRecord[]) {
  const activeFolderIds = new Set(folders.map((folder) => folder.id));
  return notes.filter((note) => {
    const isOwner = note.user_id === user.id || note.user?.id === user.id;
    if (!isOwner) return false;

    const folderId = note.folder_id ?? note.folder?.id;
    return Boolean(folderId && activeFolderIds.has(folderId));
  });
}

function profileStats(user: UserRecord, notes: NoteRecord[], folders: FolderRecord[]) {
  const userNotes = profileScopedNotes(user, notes, folders);
  const tagIds = new Set<string>();
  const folderIds = new Set<string>();

  userNotes.forEach((note) => {
    if (note.folder_id || note.folder?.id) {
      folderIds.add(note.folder_id ?? note.folder?.id ?? "");
    }
    note.tags?.forEach((tag) => tagIds.add(tag.id));
  });

  return {
    notes: userNotes.length,
    tags: tagIds.size,
    folders: folderIds.size
  };
}

function profileTags(user: UserRecord, notes: NoteRecord[], folders: FolderRecord[]) {
  const tagMap = new Map<string, TagRecord>();
  profileScopedNotes(user, notes, folders).forEach((note) => {
    note.tags?.forEach((tag) => tagMap.set(tag.id, tag));
  });
  return Array.from(tagMap.values()).sort((first, second) => first.name.localeCompare(second.name));
}

function ProfileScreen({
  users,
  notes,
  folders,
  currentUser,
  selectedUserId,
  onSelectUser,
  onBack,
  onSignOut,
  onUserUpdated,
  onSelectTag
}: {
  users: UserRecord[];
  notes: NoteRecord[];
  folders: FolderRecord[];
  currentUser: UserRecord;
  selectedUserId: string | "all";
  onSelectUser: (userId: string | "all") => void;
  onBack: () => void;
  onSignOut: () => void;
  onUserUpdated: (user: UserRecord) => void;
  onSelectTag: (userId: string, tagSlug: string) => void;
}) {
  const selectedUser = selectedUserId === "all"
    ? null
    : users.find((user) => user.id === selectedUserId) ?? currentUser;
  const toolbarName = selectedUser?.name ?? "All users";
  const canEditSelectedUser = Boolean(selectedUser && (currentUser.is_admin || selectedUser.id === currentUser.id));
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: selectedUser?.name ?? "",
    email: selectedUser?.email ?? "",
    phone: selectedUser?.phone ?? "",
    role: selectedUser?.role ?? ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const editSelectedProfileRef = useRef<string | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const shouldEditSelectedProfile = Boolean(selectedUser?.id && editSelectedProfileRef.current === selectedUser.id);
    editSelectedProfileRef.current = null;
    setIsEditing(shouldEditSelectedProfile);
    setProfileError(null);
    setDraft({
      name: selectedUser?.name ?? "",
      email: selectedUser?.email ?? "",
      phone: selectedUser?.phone ?? "",
      role: selectedUser?.role ?? ""
    });
  }, [selectedUser?.id]);

  useEffect(() => {
    if (!isAccountOpen) return;

    function closeAccountMenu(event: PointerEvent) {
      if (
        event.target instanceof Node
        && accountMenuRef.current
        && !accountMenuRef.current.contains(event.target)
      ) {
        setIsAccountOpen(false);
      }
    }

    function closeAccountMenuOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeAccountMenu);
    document.addEventListener("keydown", closeAccountMenuOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeAccountMenu);
      document.removeEventListener("keydown", closeAccountMenuOnEscape);
    };
  }, [isAccountOpen]);

  function selectUserForEditing(userId: string) {
    editSelectedProfileRef.current = userId;
    onSelectUser(userId);
  }

  async function saveProfile() {
    if (!selectedUser || !canEditSelectedUser) return;
    const nextName = draft.name.trim();
    const nextEmail = draft.email.trim();
    if (!nextName || !nextEmail) {
      setProfileError("Name and email are required.");
      return;
    }

    setIsSaving(true);
    setProfileError(null);
    try {
      const updatedUser = await apiFetch<UserRecord>(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: nextName,
          email: nextEmail,
          phone: draft.phone.trim(),
          role: draft.role.trim()
        })
      });
      onUserUpdated(updatedUser);
      setIsEditing(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not update profile");
    } finally {
      setIsSaving(false);
    }
  }

  function cancelEditing() {
    setIsEditing(false);
    setProfileError(null);
    setDraft({
      name: selectedUser?.name ?? "",
      email: selectedUser?.email ?? "",
      phone: selectedUser?.phone ?? "",
      role: selectedUser?.role ?? ""
    });
  }

  async function uploadProfilePhoto(file: File) {
    if (!selectedUser || !canEditSelectedUser) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setProfileError("Profile photos must be JPG or PNG images.");
      return;
    }

    const formData = new FormData();
    formData.append("photo", file);
    setIsUploadingPhoto(true);
    setProfileError(null);
    try {
      const updatedUser = await apiFetch<UserRecord>(`/api/users/${selectedUser.id}/photo`, {
        method: "POST",
        body: formData
      });
      onUserUpdated({
        ...updatedUser,
        photo_url: updatedUser.photo_url ? versionedMediaPath(updatedUser.photo_url) : updatedUser.photo_url
      });
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not upload profile photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  return (
    <>
      <header className="toolbar profile-toolbar">
        <div className="profile-toolbar-left">
          <button className="back-square-button" onClick={onBack} aria-label="Back to notes">
            <ChevronLeft size={16} />
          </button>
          <div className="breadcrumb">
            <span>Users</span>
            <span className="current">
              <ChevronRight size={14} />
              {toolbarName}
            </span>
          </div>
        </div>
        <div className="toolbar-actions">
          {selectedUser && canEditSelectedUser && (
            isEditing ? (
              <>
                <button
                  className="primary-button compact save-profile-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => void saveProfile()}
                >
                  {isSaving ? <Loader2 className="spin" size={15} /> : null}
                  Save
                </button>
                <button className="text-button compact" type="button" onClick={cancelEditing}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="secondary-action-button" type="button" onClick={() => setIsEditing(true)}>
                <Edit3 size={16} />
                Edit
              </button>
            )
          )}
          <label className="select-button user-select-button profile-user-select">
            <User className="select-button-icon" size={16} />
            <span className="select-button-label">{toolbarName}</span>
            <select
              value={selectedUserId}
              onChange={(event) => onSelectUser(event.target.value)}
            >
              <option value="all">All users</option>
              {users.map((person) => (
                <option value={person.id} key={person.id}>{person.name}</option>
              ))}
            </select>
            <ChevronDown className="select-button-chevron" size={12} />
          </label>
          <div className="account-menu profile-account-menu" ref={accountMenuRef}>
            <button
              className="account-avatar-button"
              type="button"
              aria-expanded={isAccountOpen}
              aria-haspopup="menu"
              onClick={() => setIsAccountOpen((value) => !value)}
            >
              <UserAvatar user={currentUser} className="profile-toolbar-avatar" />
            </button>
            {isAccountOpen && (
              <div className="account-popover" role="menu">
                <div className="account-popover-header">
                  <UserAvatar user={currentUser} className="account-popover-avatar" />
                  <TypewriterText text={currentUser.name} />
                </div>
                <div className="account-popover-group">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountOpen(false);
                      onSelectUser(currentUser.id);
                    }}
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountOpen(false);
                      onSelectUser("all");
                    }}
                  >
                    <Users size={16} />
                    <span>Users</span>
                  </button>
                  {currentUser.is_admin && (
                    <button type="button" role="menuitem">
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                  )}
                </div>
                <div className="account-popover-group">
                  <button
                    className="danger"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountOpen(false);
                      onSignOut();
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {profileError && (
        <div className="dashboard-notice" role="alert">
          <span>{profileError}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setProfileError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="profile-surface">
        {selectedUser ? (
          <SingleProfileView
            user={selectedUser}
            notes={notes}
            folders={folders}
            isEditing={isEditing}
            draft={draft}
            onDraftChange={setDraft}
            canUploadPhoto={canEditSelectedUser}
            isUploadingPhoto={isUploadingPhoto}
            onPhotoUpload={uploadProfilePhoto}
            onSelectTag={onSelectTag}
          />
        ) : (
          <AllProfilesView
            users={users}
            notes={notes}
            folders={folders}
            currentUser={currentUser}
            onSelectUser={(userId) => onSelectUser(userId)}
            onEditUser={selectUserForEditing}
          />
        )}
      </div>
    </>
  );
}

function ProfileSummaryCard({
  user,
  notes,
  folders,
  compact = false,
  canUploadPhoto = false,
  isUploadingPhoto = false,
  onPhotoUpload
}: {
  user: UserRecord;
  notes: NoteRecord[];
  folders: FolderRecord[];
  compact?: boolean;
  canUploadPhoto?: boolean;
  isUploadingPhoto?: boolean;
  onPhotoUpload?: (file: File) => void;
}) {
  const stats = profileStats(user, notes, folders);

  return (
    <article className={`profile-card${compact ? " compact" : ""}`}>
      <div className="profile-avatar-wrap">
        <UserAvatar user={user} className="profile-avatar" />
        {canUploadPhoto && (
          <label className="profile-avatar-upload" aria-label="Upload profile photo">
            {isUploadingPhoto ? <Loader2 className="spin" size={15} /> : <Camera size={15} />}
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) {
                  onPhotoUpload?.(file);
                }
              }}
            />
          </label>
        )}
      </div>
      <h2>{user.name}</h2>
      <p>{userDisplayRole(user)}</p>
      <span>{user.email}</span>
      <div className="profile-stats" aria-label={`${user.name} stats`}>
        <div>
          <span className="number">{stats.notes}</span>
          <span>Notes</span>
        </div>
        <div>
          <span className="number">{stats.tags}</span>
          <span>Tags</span>
        </div>
        <div>
          <span className="number">{stats.folders}</span>
          <span>Folders</span>
        </div>
      </div>
    </article>
  );
}

function SingleProfileView({
  user,
  notes,
  folders,
  isEditing,
  draft,
  onDraftChange,
  canUploadPhoto,
  isUploadingPhoto,
  onPhotoUpload,
  onSelectTag
}: {
  user: UserRecord;
  notes: NoteRecord[];
  folders: FolderRecord[];
  isEditing: boolean;
  draft: { name: string; email: string; phone: string; role: string };
  onDraftChange: (draft: { name: string; email: string; phone: string; role: string }) => void;
  canUploadPhoto: boolean;
  isUploadingPhoto: boolean;
  onPhotoUpload: (file: File) => void;
  onSelectTag: (userId: string, tagSlug: string) => void;
}) {
  const tags = profileTags(user, notes, folders);

  function setDraftField(field: keyof typeof draft, value: string) {
    onDraftChange({ ...draft, [field]: value });
  }

  return (
    <div className="profile-layout">
      <ProfileSummaryCard
        user={user}
        notes={notes}
        folders={folders}
        canUploadPhoto={canUploadPhoto}
        isUploadingPhoto={isUploadingPhoto}
        onPhotoUpload={onPhotoUpload}
      />
      <div className="profile-detail-column">
        <section className="profile-info-card">
          <header>
            <h2>Personal Information</h2>
          </header>
          {isEditing ? (
            <div className="profile-info-grid editable">
              <label>
                <span>Full name</span>
                <input value={draft.name} onChange={(event) => setDraftField("name", event.target.value)} />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={draft.email} onChange={(event) => setDraftField("email", event.target.value)} />
              </label>
              <label>
                <span>Phone</span>
                <input value={draft.phone} onChange={(event) => setDraftField("phone", event.target.value)} />
              </label>
              <label>
                <span>Job title</span>
                <input value={draft.role} onChange={(event) => setDraftField("role", event.target.value)} />
              </label>
            </div>
          ) : (
            <div className="profile-info-grid">
              <div>
                <span>Full name</span>
                <strong>{user.name}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{user.phone?.trim() || "Not set"}</strong>
              </div>
              <div>
                <span>Job title</span>
                <strong>{userDisplayRole(user)}</strong>
              </div>
            </div>
          )}
        </section>
        <section className="profile-info-card">
          <header>
            <h2>Tags</h2>
          </header>
          <div className="profile-tags">
            {tags.length > 0 ? (
              tags.slice(0, 12).map((tag) => (
                <button
                  className="tag-pill profile-tag-button"
                  key={tag.id}
                  type="button"
                  onClick={() => onSelectTag(user.id, tag.slug)}
                >
                  {tag.name}
                </button>
              ))
            ) : (
              <p>No tags yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AllProfilesView({
  users,
  notes,
  folders,
  currentUser,
  onEditUser,
  onSelectUser
}: {
  users: UserRecord[];
  notes: NoteRecord[];
  folders: FolderRecord[];
  currentUser: UserRecord;
  onEditUser: (userId: string) => void;
  onSelectUser: (userId: string) => void;
}) {
  return (
    <section className="profiles-grid" aria-label="All user profiles">
      {users.map((user) => {
        const canEditUser = currentUser.is_admin || currentUser.id === user.id;
        return (
          <article className="profile-card-shell" key={user.id}>
            {canEditUser && (
              <button
                className="profile-card-edit-button"
                type="button"
                aria-label={`Edit ${user.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onEditUser(user.id);
                }}
              >
                <Edit3 size={15} />
              </button>
            )}
            <button className="profile-card-button" type="button" onClick={() => onSelectUser(user.id)}>
              <ProfileSummaryCard user={user} notes={notes} folders={folders} compact />
            </button>
          </article>
        );
      })}
    </section>
  );
}

function AuthScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [step, setStep] = useState<"email" | "join" | "login">("email");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [masterPasswordOwnerName, setMasterPasswordOwnerName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function checkEmail(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await apiFetch<EmailCheckResponse>("/api/auth/check-email", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setUserId(result.user_id);
      setIsFirstUser(Boolean(result.is_first_user));
      setMasterPasswordOwnerName(result.master_password_owner_name ?? null);
      setStep(result.user_id ? "login" : "join");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check email");
    }
  }

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (step === "login") {
        await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ user_id: userId, password })
        });
      } else {
        await apiFetch("/api/auth/join", {
          method: "POST",
          body: JSON.stringify({
            email,
            name,
            password,
            password_confirmation: isFirstUser ? passwordConfirmation : undefined
          })
        });
      }
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    }
  }

  const masterPasswordCopy = masterPasswordOwnerName
    ? `Enter the master password set by ${masterPasswordOwnerName}.`
    : "Enter the master password set by the instance admin.";
  const authCopy = step === "email"
    ? "Enter your email address."
    : isFirstUser
      ? "This is a new Mianotes instance. The password you choose will be used as the master password by all users who sign in to this instance."
      : masterPasswordCopy;

  return (
    <main className="screen auth-screen">
      <section className="auth-panel">
        <div className="auth-brand">
          <img className="brand-logo" src={logoUrl} alt="Mianotes" />
        </div>
        <h1>Sign in</h1>
        <p>{authCopy}</p>
        {step === "email" ? (
          <form onSubmit={checkEmail} className="form-stack">
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" />
            <button className="primary-button">Continue</button>
          </form>
        ) : (
          <form onSubmit={submitAuth} className="form-stack">
            {step === "join" && (
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            )}
            <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
            {step === "join" && isFirstUser && (
              <input
                type="password"
                required
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                placeholder="Confirm password"
              />
            )}
            <button className="primary-button">{step === "join" ? "Create account" : "Sign in"}</button>
            <button className="text-button" type="button" onClick={() => setStep("email")}>Use another email</button>
          </form>
        )}
        {error && <div className="notice danger">{error}</div>}
      </section>
    </main>
  );
}

function SidebarSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="sidebar-section">
      <div className="section-title">
        <span>{title}</span>
        {action}
      </div>
      <div className="nav-group">{children}</div>
    </section>
  );
}

function NoteRow({
  note,
  currentUser,
  onClick,
  onToggleStar,
  onEdit,
  onDeleted,
  onError
}: {
  note: NoteRecord;
  currentUser: UserRecord;
  onClick: () => void;
  onToggleStar: () => void;
  onEdit: () => void;
  onDeleted: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const Icon = sourceIcon(note.source_type);
  const folderName = note.folder?.name ?? "Unassigned";
  const owner = note.user?.name ?? "Unknown";
  const tags = note.tags ?? [];
  const isBusy = isNoteIndexing(note);
  const canChangeNote = currentUser.is_admin || note.user_id === currentUser.id || note.user?.id === currentUser.id;
  const cannotChangeNoteMessage = `Only ${owner} or an admin can change this note.`;

  function openRowFromKeyboard(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onClick();
  }

  async function copyShareLink() {
    const shareUrl = note.note_url ? new URL(note.note_url, window.location.origin).toString() : window.location.href;
    await navigator.clipboard?.writeText(shareUrl);
  }

  async function deleteNote() {
    if (!canChangeNote) {
      onError(cannotChangeNoteMessage);
      return;
    }
    const confirmed = window.confirm(`Delete "${note.title}"? This cannot be undone.`);
    if (!confirmed) return;
    onError(null);
    try {
      await apiFetch(`/api/notes/${note.id}`, { method: "DELETE" });
      await onDeleted();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not delete note");
    }
  }

  return (
    <article
      className="note-row"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={openRowFromKeyboard}
    >
      <span
        className={`star ${note.is_starred ? "on" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={note.is_starred ? "Remove from starred" : "Add to starred"}
        aria-pressed={note.is_starred}
        onClick={(event) => {
          event.stopPropagation();
          onToggleStar();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          onToggleStar();
        }}
      >
        <Star size={21} fill={note.is_starred ? "currentColor" : "none"} />
      </span>
      <div className="note-body">
        <div className="note-meta-top">
          <span className="folder-name">{folderName}</span>
          <span className={`badge ${badgeTone(note.source_type)}`}><Icon size={15} />{note.source_type}</span>
          {isBusy && <span className="badge warning"><Loader2 size={14} className="spin" />{note.status.replace("_", " ")}</span>}
        </div>
        <h2>{note.title}</h2>
        <p>{noteExcerpt(note)}</p>
        <div className="note-meta-bottom">
          <UserAvatar user={note.user} name={owner} />
          <strong>{owner}</strong>
          {tags.slice(0, 2).map((tag) => (
            <span key={tag.id} className="inline-meta"><Tags size={15} />{tag.name}</span>
          ))}
          <span className="row-spacer" />
          <span className="inline-meta"><Clock3 size={16} />{relativeTime(note.updated_at ?? note.created_at)}</span>
        </div>
      </div>
      <div className="note-row-actions">
        <NoteActionsMenu
          note={note}
          canChangeNote={canChangeNote}
          cannotChangeNoteMessage={cannotChangeNoteMessage}
          onEdit={onEdit}
          onShare={copyShareLink}
          onDelete={deleteNote}
        />
      </div>
    </article>
  );
}

function NoteActionsMenu({
  note,
  canChangeNote,
  cannotChangeNoteMessage,
  isDeleting = false,
  onEdit,
  onShare,
  onDelete
}: {
  note: NoteRecord;
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  isDeleting?: boolean;
  onEdit: () => void;
  onShare: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function closeMenu(event: PointerEvent) {
      if (
        event.target instanceof Node
        && menuRef.current
        && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function closeMenuOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [isOpen]);

  function stopRowAction(event: SyntheticEvent) {
    event.stopPropagation();
  }

  async function runAndClose(action: () => void | Promise<void>) {
    await action();
    setIsOpen(false);
  }

  return (
    <div className="note-actions-menu" ref={menuRef} onClick={stopRowAction} onKeyDown={stopRowAction}>
      <button
        className="icon-button"
        aria-label="More note actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((current) => !current)}
      >
        <MoreVertical size={19} />
      </button>
      {isOpen && (
        <div className="note-actions-popover" role="menu">
          <button
            type="button"
            role="menuitem"
            disabled={!canChangeNote}
            title={!canChangeNote ? cannotChangeNoteMessage : undefined}
            onClick={() => void runAndClose(onEdit)}
          >
            <Edit3 size={15} />
            Edit
          </button>
          <button type="button" role="menuitem" onClick={() => void runAndClose(onShare)}>
            <Share2 size={15} />
            Share
          </button>
          {note.source_files?.[0]?.url ? (
            <a
              href={note.source_files[0].url}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <Eye size={15} />
              View Source
            </a>
          ) : (
            <span role="menuitem" aria-disabled="true">
              <Eye size={15} />
              View Source
            </span>
          )}
          <div className="note-actions-divider" />
          <button
            className="danger-action"
            type="button"
            role="menuitem"
            disabled={isDeleting || !canChangeNote}
            title={!canChangeNote ? cannotChangeNoteMessage : undefined}
            onClick={() => void runAndClose(onDelete)}
          >
            {isDeleting ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function NotePanel({
  note,
  folderLabel,
  currentUser,
  startInEdit = false,
  onStartInEditConsumed,
  onClose,
  onRefresh,
  onDeleted
}: {
  note: NoteRecord;
  folderLabel: string;
  currentUser: UserRecord;
  startInEdit?: boolean;
  onStartInEditConsumed?: () => void;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [commentBody, setCommentBody] = useState("");
  const [miaResponse, setMiaResponse] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(noteBodyMarkdown(note.text ?? ""));
  const [noteError, setNoteError] = useState<string | null>(null);
  const [miaError, setMiaError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [miaLoadingMessage, setMiaLoadingMessage] = useState("Sending your request to Mia...");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApplyingMia, setIsApplyingMia] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(note.title);
  const markdownEditorRef = useRef<MDXEditorMethods | null>(null);
  const miaLoadingTimersRef = useRef<number[]>([]);

  function clearMiaLoadingTimers() {
    miaLoadingTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    miaLoadingTimersRef.current = [];
  }

  function startMiaLoadingMessages() {
    clearMiaLoadingTimers();
    setMiaLoadingMessage("Sending your request to Mia...");
    miaLoadingTimersRef.current = [
      window.setTimeout(() => {
        setMiaLoadingMessage("This might take a few seconds.");
      }, 3000),
      window.setTimeout(() => {
        setMiaLoadingMessage("Processing the response, hold on.");
      }, 6000)
    ];
  }

  useEffect(() => {
    clearMiaLoadingTimers();
    setMiaResponse(null);
    setNoteError(null);
    setMiaError(null);
    setTagError(null);
    setMiaLoadingMessage("Sending your request to Mia...");
    setCommentBody("");
    setIsEditing(startInEdit);
    setDraftText(noteBodyMarkdown(note.text ?? ""));
    setIsApplyingMia(false);
    setIsEditingTitle(false);
    setIsTagDialogOpen(false);
    setTitleDraft(note.title);
    if (startInEdit) {
      onStartInEditConsumed?.();
    }
  }, [note?.id]);

  useEffect(() => () => {
    clearMiaLoadingTimers();
  }, []);

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleDraft(note.title);
    }
  }, [isEditingTitle, note.title]);

  useEffect(() => {
    if (!isEditing) {
      setDraftText(noteBodyMarkdown(note.text ?? ""));
    }
  }, [isEditing, note.text]);

  const authorName = note.user?.name ?? "Unknown";
  const canChangeNote = currentUser.is_admin || note.user_id === currentUser.id || note.user?.id === currentUser.id;
  const cannotChangeNoteMessage = `Only ${authorName} or an admin can change this note.`;

  function currentEditorMarkdown() {
    if (!isEditing) return noteMarkdownBody;
    return markdownEditorRef.current?.getMarkdown() ?? draftText;
  }

  async function saveMarkdown() {
    if (!canChangeNote) {
      setNoteError(cannotChangeNoteMessage);
      return;
    }
    setIsSaving(true);
    setNoteError(null);
    const nextText = currentEditorMarkdown();
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: nextText })
      });
      setDraftText(nextText);
      setIsEditing(false);
      setMiaResponse(null);
      setMiaError(null);
      await onRefresh();
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveTitle() {
    if (!canChangeNote) {
      setNoteError(cannotChangeNoteMessage);
      setIsEditingTitle(false);
      return;
    }

    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setNoteError("Note title cannot be empty.");
      return;
    }

    if (nextTitle === note.title) {
      setIsEditingTitle(false);
      return;
    }

    setIsSaving(true);
    setNoteError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: nextTitle })
      });
      setIsEditingTitle(false);
      await onRefresh();
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Could not save note title");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitMiaPrompt(instructions: string, clearInput = false) {
    if (!note) return;
    if (isIndexingNote) {
      setMiaError("Mia is still indexing this note. You can ask questions once the content is ready.");
      return;
    }
    const trimmedInstructions = instructions.trim();
    if (!trimmedInstructions) {
      setMiaError("Please provide instructions for Mia.");
      return;
    }
    const body = trimmedInstructions.toLowerCase().startsWith("@mia")
      ? trimmedInstructions
      : `@mia ${trimmedInstructions}`;
    setIsLoading(true);
    startMiaLoadingMessages();
    setMiaResponse(null);
    setMiaError(null);
    const markdown = isEditing ? currentEditorMarkdown() : undefined;
    try {
      const result = await apiFetch<MiaPromptRecord>(`/api/notes/${note.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body, markdown })
      });
      setMiaResponse(result.text);
      if (clearInput) setCommentBody("");
      await onRefresh();
    } catch (err) {
      setMiaError(err instanceof Error ? err.message : "Could not send comment");
    } finally {
      clearMiaLoadingTimers();
      setIsLoading(false);
    }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    await submitMiaPrompt(commentBody, true);
  }

  async function copyMiaResponse() {
    if (!miaResponse) return;
    await navigator.clipboard?.writeText(miaResponse);
  }

  async function applyMiaResponse(mode: "append" | "replace") {
    if (!miaResponse) return;
    if (!canChangeNote) {
      setMiaError(cannotChangeNoteMessage);
      return;
    }
    if (mode === "replace") {
      const confirmed = window.confirm("Replace this note with Mia's response?");
      if (!confirmed) return;
    }

    const currentText = currentEditorMarkdown().trim();
    const miaText = miaResponse.trim();
    const nextText = mode === "append" && currentText ? `${currentText}\n\n---\n\n${miaText}` : miaText;

    setIsApplyingMia(true);
    setMiaError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: nextText })
      });
      setDraftText(nextText);
      setMiaResponse(null);
      setMiaError(null);
      await onRefresh();
    } catch (err) {
      setMiaError(err instanceof Error ? err.message : "Could not update note");
    } finally {
      setIsApplyingMia(false);
    }
  }

  async function copyShareLink() {
    const shareUrl = note.note_url ? new URL(note.note_url, window.location.origin).toString() : window.location.href;
    await navigator.clipboard?.writeText(shareUrl);
  }

  async function deleteNote() {
    if (!canChangeNote) {
      setNoteError(cannotChangeNoteMessage);
      return;
    }
    const confirmed = window.confirm(`Delete "${note.title}"? This cannot be undone.`);
    if (!confirmed) return;
    setIsDeleting(true);
    setNoteError(null);
    try {
      await apiFetch(`/api/notes/${note.id}`, { method: "DELETE" });
      await onDeleted();
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Could not delete note");
    } finally {
      setIsDeleting(false);
    }
  }

  async function addTag(tagName: string) {
    if (!canChangeNote) {
      setTagError(cannotChangeNoteMessage);
      return false;
    }
    const existingTags = note.tags ?? [];
    if (existingTags.length >= 5) return false;

    const normalizedTagName = tagName.trim();
    if (!normalizedTagName) return false;

    const nextTags = Array.from(new Set([...existingTags.map((tag) => tag.name), normalizedTagName])).slice(0, 5);
    setTagError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tags: nextTags })
      });
      await onRefresh();
      return true;
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Could not add tag");
      return false;
    }
  }

  async function removeTag(tagName: string) {
    if (!canChangeNote) {
      setTagError(cannotChangeNoteMessage);
      return;
    }

    const nextTags = noteTags.map((tag) => tag.name).filter((name) => name !== tagName);
    setTagError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tags: nextTags })
      });
      await onRefresh();
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Could not remove tag");
    }
  }

  const noteDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(note.created_at));
  const hasLoadedNoteText = typeof note.text === "string";
  const noteMarkdownBody = noteBodyMarkdown(note.text ?? "");
  const noteTags = note.tags ?? [];
  const isIndexingNote = isNoteIndexing(note);
  const isMiaDisabled = isLoading || isIndexingNote;

  return (
    <section className={`note-panel ${isEditing ? "editing" : ""}`}>
      <div className="note-document-header">
        <button className="back-square-button" onClick={onClose} aria-label="Back to notes">
          <ChevronLeft size={16} />
        </button>
        <div className="note-document-breadcrumb">
          <span>Folder</span>
          <span className="current">
            <ChevronRight size={14} />
            {folderLabel}
          </span>
        </div>
        <div className="panel-actions">
          {isEditing ? (
            <>
              <button className="primary-button compact save-note-button" type="button" disabled={isSaving} onClick={() => void saveMarkdown()}>
                {isSaving ? <Loader2 className="spin" size={15} /> : null}
                Save
              </button>
              <button
                className="text-button compact"
                type="button"
                onClick={() => {
                  setDraftText(noteMarkdownBody);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className="secondary-action-button"
                type="button"
                disabled={!canChangeNote}
                title={!canChangeNote ? cannotChangeNoteMessage : undefined}
                onClick={() => setIsEditing(true)}
              >
                <Edit3 size={16} />
                Edit
              </button>
              <NoteActionsMenu
                note={note}
                canChangeNote={canChangeNote}
                cannotChangeNoteMessage={cannotChangeNoteMessage}
                isDeleting={isDeleting}
                onEdit={() => setIsEditing(true)}
                onShare={copyShareLink}
                onDelete={deleteNote}
              />
            </>
          )}
        </div>
      </div>
      {noteError && (
        <div className="notice danger note-panel-notice" role="alert">
          {noteError}
        </div>
      )}
      <div className="note-document-title">
        {isEditingTitle ? (
          <input
            className="note-title-input"
            value={titleDraft}
            autoFocus
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void saveTitle();
              }
              if (event.key === "Escape") {
                setTitleDraft(note.title);
                setIsEditingTitle(false);
                setNoteError(null);
              }
            }}
          />
        ) : (
          <h1
            className={isEditing && canChangeNote ? "editable-note-title" : undefined}
            title={isEditing && canChangeNote ? "Click to edit title" : undefined}
            onClick={() => {
              if (!isEditing || !canChangeNote) return;
              setNoteError(null);
              setTitleDraft(note.title);
              setIsEditingTitle(true);
            }}
          >
            {note.title}
          </h1>
        )}
      </div>
      <div className="note-document-meta">
        <UserAvatar user={note.user} name={authorName} className="note-author-avatar" />
        <div className="note-author-details">
          <strong>{authorName}</strong>
          <span>{noteDate}</span>
        </div>
      </div>
      {isEditing ? (
        <div className="markdown-preview">
          <Suspense fallback={<div className="editor-loading">Loading editor...</div>}>
            <MarkdownEditor
              ref={markdownEditorRef}
              id={note.id}
              markdown={draftText}
              onChange={setDraftText}
            />
          </Suspense>
        </div>
      ) : (
        <div className="markdown-preview">
          <Suspense fallback={<div className="editor-loading">Loading note...</div>}>
            {hasLoadedNoteText ? (
              <MarkdownViewer
                id={note.id}
                updatedAt={note.updated_at}
                markdown={noteMarkdownBody}
              />
            ) : (
              <div className="editor-loading">Loading note...</div>
            )}
          </Suspense>
        </div>
      )}
      <div className="note-section-divider" />
      <section className="comments-box">
        <h3>Ask Mia</h3>
        {isIndexingNote && (
          <p className="mia-disabled-note">
            Mia is still indexing this note. You can ask questions once the content is ready.
          </p>
        )}
        {(isLoading || miaResponse) && (
          <div className={`mia-output ${isLoading ? "loading" : "result"}`} aria-live="polite">
            {isLoading ? (
              <div className="mia-loader">
                <img src={logoMarkUrl} alt="" />
                <p>{miaLoadingMessage}</p>
              </div>
            ) : (
              <>
                <div className="mia-output-scroll">
                  <Suspense fallback={<div className="editor-loading">Rendering Mia response...</div>}>
                    <MarkdownViewer
                      id={`${note.id}-mia-response`}
                      updatedAt={miaResponse ?? ""}
                      markdown={miaResponse ?? ""}
                    />
                  </Suspense>
                </div>
                <div className="mia-output-actions">
                  <button type="button" onClick={() => void copyMiaResponse()}>Copy</button>
                  <button
                    type="button"
                    disabled={isApplyingMia || !canChangeNote}
                    title={!canChangeNote ? cannotChangeNoteMessage : undefined}
                    onClick={() => void applyMiaResponse("append")}
                  >
                    {isApplyingMia ? "Saving..." : "Append"}
                  </button>
                  <button
                    type="button"
                    disabled={isApplyingMia || !canChangeNote}
                    title={!canChangeNote ? cannotChangeNoteMessage : undefined}
                    onClick={() => void applyMiaResponse("replace")}
                  >
                    Replace
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <form onSubmit={addComment} className="comment-form">
          <textarea
            value={commentBody}
            disabled={isMiaDisabled}
            onChange={(event) => {
              setCommentBody(event.target.value);
              if (miaError === "Please provide instructions for Mia.") {
                setMiaError(null);
              }
            }}
            placeholder="Ask Mia anything about this note."
          />
          <div className="mia-action-row">
            <button className="primary-button small ask-mia-button" disabled={isMiaDisabled}>
              <MessageCircle size={16} />
              Ask Mia
            </button>
            <div className="mia-quick-actions">
              {miaQuickActions.map((action) => (
                <button
                  className="mia-quick-action"
                  disabled={isMiaDisabled}
                  key={action.label}
                  type="button"
                  onClick={() => void submitMiaPrompt(action.prompt)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </form>
        {miaError && (
          <div className="notice danger section-notice" role="alert">
            {miaError}
          </div>
        )}
      </section>
      <section className="note-tags-section">
        <h3>Tags</h3>
        <div className="note-document-tags">
          {noteTags.map((tag) => (
            <span className="tag-chip" key={tag.id}>
              <span className="tag-pill">{tag.name}</span>
              {canChangeNote && (
                <button
                  className="tag-remove-button"
                  type="button"
                  aria-label={`Remove ${tag.name} tag`}
                  onClick={() => void removeTag(tag.name)}
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
          {noteTags.length < 5 && (
            <button
              className="tag-add-button"
              type="button"
              aria-label="Add tag"
              disabled={!canChangeNote}
              title={!canChangeNote ? cannotChangeNoteMessage : undefined}
              onClick={() => {
                setTagError(null);
                setIsTagDialogOpen(true);
              }}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        {tagError && (
          <div className="notice danger section-notice" role="alert">
            {tagError}
          </div>
        )}
      </section>
      {isTagDialogOpen && (
        <AddTagDialog
          existingTags={noteTags.map((tag) => tag.name)}
          onClose={() => setIsTagDialogOpen(false)}
          onAdd={async (tagName) => {
            const didAddTag = await addTag(tagName);
            if (didAddTag) setIsTagDialogOpen(false);
            return didAddTag;
          }}
        />
      )}
    </section>
  );
}

function AddNoteDialog({
  folders,
  selectedFolderId,
  onClose,
  onCreated,
  onError
}: {
  folders: FolderRecord[];
  selectedFolderId: string | "all";
  onClose: () => void;
  onCreated: (note: NoteRecord, shouldEdit: boolean) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [mode, setMode] = useState<"text" | "link" | "file">("text");
  const shouldChooseFolder = selectedFolderId === "all";
  const [folderId, setFolderId] = useState(shouldChooseFolder ? "" : selectedFolderId);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const cleanTitle = title.trim();
  const cleanUrl = url.trim();
  const canCreate =
    Boolean(folderId)
    && (
      (mode === "text" && cleanTitle.length > 0)
      || (mode === "link" && cleanTitle.length > 0 && cleanUrl.length > 0)
      || (mode === "file" && cleanTitle.length > 0 && Boolean(file))
    );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canCreate) return;
    setIsSaving(true);
    onError(null);
    try {
      let createdNote: NoteRecord;
      let shouldEdit = false;
      if (mode === "text") {
        createdNote = await apiFetch<NoteRecord>("/api/notes/from-text", {
          method: "POST",
          body: JSON.stringify({ folder_id: folderId, title: cleanTitle, text: text.trim() || " " })
        });
        shouldEdit = true;
      } else if (mode === "link") {
        createdNote = await apiFetch<NoteRecord>("/api/notes/from-url", {
          method: "POST",
          body: JSON.stringify({ folder_id: folderId, title: cleanTitle, url: cleanUrl })
        });
      } else if (file) {
        const formData = new FormData();
        formData.set("folder_id", folderId);
        formData.set("title", cleanTitle);
        formData.set("file", file);
        createdNote = await apiFetch<NoteRecord>("/api/notes/from-file", { method: "POST", body: formData });
      } else {
        return;
      }
      await onCreated(createdNote, shouldEdit);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal folder-modal add-note-modal" onSubmit={submit}>
        <div className="folder-modal-header">
          <div>
            <h2>Add note</h2>
            <p>Create a note, index a link, or upload a .pdf, .docx, .xls, .csv, .png, .jpg, .mp3, or .m4a file.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="folder-modal-body">
          <div className="segmented" aria-label="Note source type">
            <button type="button" className={mode === "text" ? "selected" : ""} onClick={() => setMode("text")}><FileText size={17} />Text</button>
            <button type="button" className={mode === "link" ? "selected" : ""} onClick={() => setMode("link")}><Link size={17} />Link</button>
            <button type="button" className={mode === "file" ? "selected" : ""} onClick={() => setMode("file")}><Upload size={17} />File</button>
          </div>
          {shouldChooseFolder && (
            <label className="field-label">
              <span>Folder</span>
              <select value={folderId} onChange={(event) => setFolderId(event.target.value)} required>
                <option value="">Choose a folder</option>
                {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
              </select>
            </label>
          )}
          <label className="field-label">
            <span>Title</span>
            <input
              autoFocus
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          {mode === "text" && (
            <label className="field-label">
              <span>Text (optional)</span>
              <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste notes, agent output, or rough thoughts" />
            </label>
          )}
          {mode === "link" && (
            <label className="field-label">
              <span>URL</span>
              <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/article" />
              <small className="field-help">Mia will save a draft now, then replace it with the page contents once indexing is complete.</small>
            </label>
          )}
          {mode === "file" && (
            <div className="field-label">
              <span>File</span>
              <label className="file-picker">
                <input required type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                <span className="file-picker-button">
                  <Upload size={16} />
                  Choose file
                </span>
                <span className={`file-picker-name${file ? "" : " is-empty"}`}>{file?.name ?? "No file selected"}</span>
              </label>
            </div>
          )}
        </div>
        <div className="folder-modal-actions">
          <button className="primary-button create-note-button" disabled={isSaving || !canCreate}>
            {isSaving ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
            Create note
          </button>
          <button className="text-button" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function AddFolderDialog({
  onClose,
  onCreated,
  onError
}: {
  onClose: () => void;
  onCreated: (folder: FolderRecord) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canCreateFolder = name.trim().length >= 3;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    onError(null);
    try {
      const folder = await apiFetch<FolderRecord>("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name, is_pinned: isPinned })
      });
      await onCreated(folder);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not add folder");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal folder-modal" onSubmit={submit}>
        <div className="folder-modal-header">
          <div>
            <h2>Add folder</h2>
            <p>Anyone signed in can view this folder and add notes to it.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="folder-modal-body">
          <label className="field-label">
            <span>Folder name</span>
            <input
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="checkbox-card">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(event) => setIsPinned(event.target.checked)}
            />
            <span>
              <strong>Pin to top</strong>
              <small>Keep this folder above the rest of the list.</small>
            </span>
          </label>
        </div>
        <div className="folder-modal-actions">
          <button className="primary-button create-folder-button" disabled={isSaving || !canCreateFolder}>
            {isSaving ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
            Create folder
          </button>
          <button className="text-button" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function RenameFolderDialog({
  folder,
  onClose,
  onRename
}: {
  folder: FolderRecord;
  onClose: () => void;
  onRename: (name: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const cleanName = name.trim();
  const canRename = cleanName.length >= 3 && cleanName !== folder.name;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canRename) return;

    setError(null);
    setIsSaving(true);
    try {
      const result = await onRename(cleanName);
      if (!result.ok) setError(result.error ?? "Could not rename folder.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal folder-modal" onSubmit={submit}>
        <div className="folder-modal-header">
          <div>
            <h2>Rename folder</h2>
            <p>Update the folder name shown to everyone signed in.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="folder-modal-body">
          <label className="field-label">
            <span>Folder name</span>
            <input
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {error && (
            <div className="notice danger modal-notice" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="folder-modal-actions">
          <button className="primary-button create-folder-button" disabled={isSaving || !canRename}>
            {isSaving ? <Loader2 className="spin" size={17} /> : <Edit3 size={17} />}
            Save changes
          </button>
          <button className="text-button" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function AddTagDialog({
  existingTags,
  onClose,
  onAdd
}: {
  existingTags: string[];
  onClose: () => void;
  onAdd: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const cleanName = name.trim();
  const tagExists = existingTags.some((tag) => tag.toLowerCase() === cleanName.toLowerCase());
  const canAddTag = cleanName.length >= 2 && !tagExists;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (cleanName.length < 2) {
      setError("Tags need at least 2 characters.");
      return;
    }
    if (tagExists) {
      setError("This note already has that tag.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const didAddTag = await onAdd(cleanName);
      if (!didAddTag) setError("Could not add tag.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal folder-modal" onSubmit={submit}>
        <div className="folder-modal-header">
          <div>
            <h2>Add tag</h2>
            <p>Tags help people filter and find related notes.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="folder-modal-body">
          <label className="field-label">
            <span>Tag name</span>
            <input
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {error && (
            <div className="notice danger modal-notice" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="folder-modal-actions">
          <button className="primary-button create-folder-button" disabled={isSaving || !canAddTag}>
            {isSaving ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
            Add tag
          </button>
          <button className="text-button" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <Bot size={34} />
      <h2>No notes found</h2>
      <p>Add a note, upload a file, or paste a link and Mia will add it to your knowledge hub.</p>
      <button className="primary-button empty-state-button" onClick={onAdd}><Plus size={17} />Add Note</button>
    </div>
  );
}

function countBy<T>(items: T[], getter: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getter(item);
    if (key) counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function hydrateNotes(notes: NoteRecord[], users: UserRecord[], folders: FolderRecord[]) {
  return notes.map((note) => ({
    ...note,
    user: note.user ?? users.find((user) => user.id === note.user_id),
    folder: note.folder ?? folders.find((folder) => folder.id === note.folder_id)
  }));
}

function mergeNoteRecord(current: NoteRecord, update: NoteRecord) {
  return {
    ...current,
    ...update,
    user_id: update.user_id ?? update.user?.id ?? current.user_id,
    folder_id: update.folder_id ?? update.folder?.id ?? current.folder_id,
    user: update.user ?? current.user,
    folder: update.folder ?? current.folder,
    tags: update.tags ?? current.tags,
    source_files: update.source_files ?? current.source_files
  };
}

function noteSearchText(note: NoteRecord) {
  const tagsText = note.tags?.map((tag) => `${tag.name} ${tag.slug}`).join(" ") ?? "";
  return [
    note.title,
    note.summary,
    note.text,
    note.folder?.name,
    note.user?.name,
    tagsText
  ].filter(Boolean).join(" ").toLowerCase();
}

async function logout(setCurrentUser: (user: UserRecord | null) => void) {
  await apiFetch("/api/auth/logout", { method: "POST" });
  setCurrentUser(null);
}
