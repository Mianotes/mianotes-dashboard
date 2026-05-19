import {
  Activity,
  Bot,
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
  X
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import logoUrl from "./assets/logo_small.png";
import logoMarkUrl from "./assets/mianotes_mark.svg";

const MarkdownViewer = lazy(() => import("./MarkdownViewer"));
const MarkdownEditor = lazy(() => import("./MarkdownViewer").then((module) => ({ default: module.MarkdownEditor })));

type UserRecord = {
  id: string;
  email: string;
  name: string;
  username: string;
  is_admin: boolean;
  photo_url?: string | null;
};

type ProjectRecord = {
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
  project?: ProjectRecord;
  project_id?: string;
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
  selectedProjectId: string | "all";
  selectedTag: string | "all";
  openedNoteId: string | null;
  searchQuery: string;
  currentPage: number;
};

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
const dashboardUiStateKey = "mianotes.dashboard.uiState";
const notesPerPage = 10;

const defaultDashboardUiState: DashboardUiState = {
  selectedView: "recent",
  selectedUserId: "all",
  selectedProjectId: "all",
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
      selectedProjectId: typeof value.selectedProjectId === "string" ? value.selectedProjectId : "all",
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
    return <img className={`avatar avatar-photo ${className}`} src={user.photo_url} alt={displayName} />;
  }
  return <span className={`avatar avatar-${avatarTone(displayName)} ${className}`}>{userInitials(displayName)}</span>;
}

export function App() {
  const initialUiState = useMemo(() => readDashboardUiState(), []);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [storageCapacity, setStorageCapacity] = useState<StorageCapacityRecord | null>(null);
  const [selectedView, setSelectedView] = useState<"recent" | "starred">(initialUiState.selectedView);
  const [selectedUserId, setSelectedUserId] = useState<string | "all">(initialUiState.selectedUserId);
  const [selectedProjectId, setSelectedProjectId] = useState<string | "all">(initialUiState.selectedProjectId);
  const [selectedTag, setSelectedTag] = useState<string | "all">(initialUiState.selectedTag);
  const [openedNoteId, setOpenedNoteId] = useState<string | null>(initialUiState.openedNoteId);
  const [searchQuery, setSearchQuery] = useState(initialUiState.searchQuery);
  const [currentPage, setCurrentPage] = useState(initialUiState.currentPage);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkspaceLoaded, setIsWorkspaceLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const projectActionsMenuRef = useRef<HTMLDivElement | null>(null);

  function clearSearch() {
    setSearchQuery("");
  }

  function selectView(view: "recent" | "starred") {
    clearSearch();
    setCurrentPage(1);
    setSelectedView(view);
  }

  function selectProject(projectId: string) {
    clearSearch();
    setCurrentPage(1);
    setSelectedProjectId(projectId);
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
    setIsAddOpen(true);
  }

  function openAddProject() {
    clearSearch();
    setIsProjectOpen(true);
  }

  useEffect(() => {
    void bootstrap();
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

    function closeAccountMenuOnEscape(event: KeyboardEvent) {
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
    if (!openProjectMenuId) return;

    function closeProjectMenu(event: PointerEvent) {
      if (
        event.target instanceof Node
        && projectActionsMenuRef.current
        && !projectActionsMenuRef.current.contains(event.target)
      ) {
        setOpenProjectMenuId(null);
      }
    }

    function closeProjectMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenProjectMenuId(null);
      }
    }

    document.addEventListener("pointerdown", closeProjectMenu);
    document.addEventListener("keydown", closeProjectMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeProjectMenu);
      document.removeEventListener("keydown", closeProjectMenuOnEscape);
    };
  }, [openProjectMenuId]);

  async function updateProject(project: ProjectRecord, update: Partial<Pick<ProjectRecord, "name" | "is_pinned">>) {
    setError(null);
    try {
      await apiFetch<ProjectRecord>(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify(update)
      });
      setOpenProjectMenuId(null);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update project");
    }
  }

  async function renameProject(project: ProjectRecord) {
    const nextName = window.prompt("Rename project", project.name)?.trim();
    if (!nextName || nextName === project.name) return;
    await updateProject(project, { name: nextName });
  }

  async function deleteProject(project: ProjectRecord) {
    const confirmed = window.confirm(`Delete "${project.name}"? Notes are kept, but the project is archived.`);
    if (!confirmed) return;
    setError(null);
    try {
      await apiFetch(`/api/projects/${project.id}`, { method: "DELETE" });
      setOpenProjectMenuId(null);
      if (selectedProjectId === project.id) {
        setSelectedProjectId("all");
      }
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete project");
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
    const [nextUsers, nextProjects, nextTags, nextNotes, nextStorageCapacity] = await Promise.all([
      apiFetch<UserRecord[]>("/api/users"),
      apiFetch<ProjectRecord[]>("/api/projects"),
      apiFetch<TagRecord[]>("/api/tags"),
      apiFetch<NoteRecord[]>("/api/notes"),
      apiFetch<StorageCapacityRecord>("/api/storage").catch(() => null)
    ]);
    const activeProjects = nextProjects.filter((project) => !project.archived_at);
    const hydrated = hydrateNotes(nextNotes, nextUsers, activeProjects);
    setUsers(nextUsers);
    setProjects(activeProjects);
    setTags(nextTags);
    setNotes(hydrated);
    setStorageCapacity(nextStorageCapacity);
    setIsWorkspaceLoaded(true);
  }

  async function refreshNotes() {
    const nextNotes = await apiFetch<NoteRecord[]>("/api/notes");
    const hydrated = hydrateNotes(nextNotes, users, projects);
    setNotes(hydrated);
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

  const notesByProject = useMemo(() => countBy(notes, (note) => note.project?.id ?? note.project_id ?? ""), [notes]);
  const selectedProject = selectedProjectId === "all" ? null : projects.find((project) => project.id === selectedProjectId) ?? null;
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
      const projectMatch = selectedProjectId === "all" || note.project_id === selectedProjectId;
      if (!projectMatch) return;
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
  }, [notes, searchQuery, selectedProjectId, selectedTag, selectedUserId, selectedView]);
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      if (selectedView === "starred" && !note.is_starred) return false;
      const userMatch = selectedUserId === "all" || note.user_id === selectedUserId;
      if (!userMatch) return false;
      const projectMatch = selectedProjectId === "all" || note.project_id === selectedProjectId;
      if (!projectMatch) return false;
      const tagMatch = selectedTag === "all" || note.tags?.some((tag) => tag.slug === selectedTag);
      if (!tagMatch) return false;
      if (!query) return true;
      return noteSearchText(note).includes(query);
    });
  }, [notes, searchQuery, selectedProjectId, selectedTag, selectedUserId, selectedView]);
  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / notesPerPage));
  const clampedPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (clampedPage - 1) * notesPerPage;
  const paginatedNotes = filteredNotes.slice(pageStartIndex, pageStartIndex + notesPerPage);
  const visibleStart = filteredNotes.length === 0 ? 0 : pageStartIndex + 1;
  const visibleEnd = Math.min(pageStartIndex + paginatedNotes.length, filteredNotes.length);

  const openedNote = notes.find((note) => note.id === openedNoteId) ?? null;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded) return;

    setSelectedUserId((current) => (
      current === "all" || users.some((user) => user.id === current) ? current : "all"
    ));
    setSelectedProjectId((current) => (
      current === "all" || projects.some((project) => project.id === current) ? current : "all"
    ));
    setSelectedTag((current) => (
      current === "all" || tags.some((tag) => tag.slug === current) ? current : "all"
    ));
    setOpenedNoteId((current) => (
      current === null || notes.some((note) => note.id === current) ? current : null
    ));
  }, [currentUser, isWorkspaceLoaded, notes, projects, tags, users]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded) return;

    writeDashboardUiState({
      selectedView,
      selectedUserId,
      selectedProjectId,
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
    selectedProjectId,
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

  return (
    <main className="screen">
      <section className={`shell ${openedNote ? "note-open" : ""}`} aria-label="Mianotes dashboard">
        <aside className="sidebar">
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
            title="Projects"
            action={<button className="icon-button" aria-label="Add project" onClick={openAddProject}><Plus size={15} /></button>}
          >
            {projects.map((project) => (
              <div
                key={project.id}
                className={`nav-item project-nav-item ${selectedProjectId === project.id ? "active-soft" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => selectProject(project.id)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  selectProject(project.id);
                }}
              >
                {project.is_pinned ? <Pin size={18} /> : <Folder size={19} />}
                <span>{project.name}</span>
                <div
                  className="project-actions-menu"
                  ref={openProjectMenuId === project.id ? projectActionsMenuRef : null}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <small className="project-note-count">{notesByProject[project.id] ?? 0}</small>
                  <button
                    className="project-more-button"
                    type="button"
                    aria-label={`Project actions for ${project.name}`}
                    aria-expanded={openProjectMenuId === project.id}
                    onClick={() => setOpenProjectMenuId((current) => current === project.id ? null : project.id)}
                  >
                    <MoreVertical size={17} />
                  </button>
                  {openProjectMenuId === project.id && (
                    <div className="project-actions-popover" role="menu">
                      <button type="button" role="menuitem" onClick={() => void updateProject(project, { is_pinned: !project.is_pinned })}>
                        <Pin size={15} />
                        {project.is_pinned ? "Unpin" : "Pin to top"}
                      </button>
                      <button type="button" role="menuitem" onClick={() => void renameProject(project)}>
                        <Edit3 size={15} />
                        Rename
                      </button>
                      <div className="note-actions-divider" />
                      <button className="danger-action" type="button" role="menuitem" onClick={() => void deleteProject(project)}>
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
          {!openedNote && (
            <header className="toolbar">
              <div className="breadcrumb">
                <span>Project</span>
                <span className={breadcrumbItems.length === 0 && !selectedTagRecord ? "current" : undefined}>
                  <ChevronRight size={14} />
                  {selectedProject?.name ?? "All projects"}
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
                        <strong>{currentUser.name}</strong>
                      </div>
                      <div className="account-popover-group">
                        <button type="button" role="menuitem">
                          <User size={16} />
                          <span>Profile</span>
                        </button>
                        <button type="button" role="menuitem">
                          <Settings size={16} />
                          <span>Settings</span>
                        </button>
                        <button type="button" role="menuitem">
                          <Activity size={16} />
                          <span>Activity</span>
                        </button>
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
                projectLabel={openedNote.project?.name ?? selectedProject?.name ?? "All projects"}
                currentUser={currentUser}
                onClose={() => setOpenedNoteId(null)}
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
                        onToggleStar={() => void toggleNoteStar(note)}
                        onClick={async () => {
                          try {
                            const fullNote = note.text ? note : await apiFetch<NoteRecord>(`/api/notes/${note.id}`);
                            setNotes((items) => (
                              items.map((item) => item.id === note.id ? mergeNoteRecord(item, fullNote) : item)
                            ));
                            setOpenedNoteId(note.id);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Could not open note");
                          }
                        }}
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
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Next page"
                      disabled={clampedPage >= totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </footer>
                )}
              </>
            )}
          </div>
        </section>
      </section>

      <footer className="brand-footer">
        <img className="brand-logo" src={logoUrl} alt="Mianotes" />
      </footer>

      {isAddOpen && (
        <AddNoteDialog
          projects={projects}
          selectedProjectId={selectedProjectId}
          onClose={() => setIsAddOpen(false)}
          onCreated={async () => {
            setIsAddOpen(false);
            await refreshNotes();
          }}
          onError={setError}
        />
      )}
      {isProjectOpen && (
        <AddProjectDialog
          onClose={() => setIsProjectOpen(false)}
          onCreated={async (project) => {
            setIsProjectOpen(false);
            await loadWorkspace();
            setSelectedProjectId(project.id);
          }}
          onError={setError}
        />
      )}
    </main>
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
  onClick,
  onToggleStar
}: {
  note: NoteRecord;
  onClick: () => void;
  onToggleStar: () => void;
}) {
  const Icon = sourceIcon(note.source_type);
  const projectName = note.project?.name ?? "Unassigned";
  const owner = note.user?.name ?? "Unknown";
  const tags = note.tags ?? [];
  const isBusy = ["pending_parse", "parsing"].includes(note.status);

  return (
    <button className="note-row" onClick={onClick}>
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
          <span className="project-name">{projectName}</span>
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
          <span className="inline-meta"><MessageCircle size={16} />{note.comments_count ?? 0}</span>
        </div>
      </div>
    </button>
  );
}

function NotePanel({
  note,
  projectLabel,
  currentUser,
  onClose,
  onRefresh,
  onDeleted
}: {
  note: NoteRecord;
  projectLabel: string;
  currentUser: UserRecord;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [commentBody, setCommentBody] = useState("");
  const [miaResponse, setMiaResponse] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(noteBodyMarkdown(note.text ?? ""));
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [miaError, setMiaError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApplyingMia, setIsApplyingMia] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(note.title);
  const noteActionsMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMiaResponse(null);
    setNoteError(null);
    setMiaError(null);
    setTagError(null);
    setCommentBody("");
    setIsEditing(false);
    setDraftText(noteBodyMarkdown(note.text ?? ""));
    setIsActionsOpen(false);
    setIsApplyingMia(false);
    setIsEditingTitle(false);
    setTitleDraft(note.title);
  }, [note?.id]);

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

  useEffect(() => {
    if (!isActionsOpen) return;

    function closeNoteActionsMenu(event: PointerEvent) {
      if (
        event.target instanceof Node
        && noteActionsMenuRef.current
        && !noteActionsMenuRef.current.contains(event.target)
      ) {
        setIsActionsOpen(false);
      }
    }

    function closeNoteActionsMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsActionsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeNoteActionsMenu);
    document.addEventListener("keydown", closeNoteActionsMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeNoteActionsMenu);
      document.removeEventListener("keydown", closeNoteActionsMenuOnEscape);
    };
  }, [isActionsOpen]);

  const authorName = note.user?.name ?? "Unknown";
  const canChangeNote = currentUser.is_admin || note.user_id === currentUser.id || note.user?.id === currentUser.id;
  const cannotChangeNoteMessage = `Only ${authorName} or an admin can change this note.`;

  async function saveMarkdown() {
    if (!canChangeNote) {
      setNoteError(cannotChangeNoteMessage);
      return;
    }
    setIsSaving(true);
    setNoteError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: draftText })
      });
      setIsEditing(false);
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
    const trimmedInstructions = instructions.trim();
    if (!trimmedInstructions) {
      setMiaError("Please provide instructions for Mia.");
      return;
    }
    const body = trimmedInstructions.toLowerCase().startsWith("@mia")
      ? trimmedInstructions
      : `@mia ${trimmedInstructions}`;
    setIsLoading(true);
    setMiaResponse(null);
    setMiaError(null);
    try {
      const result = await apiFetch<MiaPromptRecord>(`/api/notes/${note.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body })
      });
      setMiaResponse(result.text);
      if (clearInput) setCommentBody("");
      await onRefresh();
    } catch (err) {
      setMiaError(err instanceof Error ? err.message : "Could not send comment");
    } finally {
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

    const currentText = noteMarkdownBody.trim();
    const miaText = miaResponse.trim();
    const nextText = mode === "append" && currentText ? `${currentText}\n\n${miaText}` : miaText;

    setIsApplyingMia(true);
    setMiaError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: nextText })
      });
      setDraftText(nextText);
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
    setIsActionsOpen(false);
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

  async function addTag() {
    if (!canChangeNote) {
      setTagError(cannotChangeNoteMessage);
      return;
    }
    const existingTags = note.tags ?? [];
    if (existingTags.length >= 5) return;

    const tagName = window.prompt("Add tag");
    const normalizedTagName = tagName?.trim();
    if (!normalizedTagName) return;

    const nextTags = Array.from(new Set([...existingTags.map((tag) => tag.name), normalizedTagName])).slice(0, 5);
    setTagError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tags: nextTags })
      });
      await onRefresh();
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Could not add tag");
    }
  }

  const noteDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(note.created_at));
  const hasLoadedNoteText = typeof note.text === "string";
  const noteMarkdownBody = noteBodyMarkdown(note.text ?? "");
  const noteTags = note.tags ?? [];

  return (
    <section className={`note-panel ${isEditing ? "editing" : ""}`}>
      <div className="note-document-header">
        <button className="back-square-button" onClick={onClose} aria-label="Back to notes">
          <ChevronLeft size={16} />
        </button>
        <div className="note-document-breadcrumb">
          <span>Project</span>
          <span>
            <ChevronRight size={14} />
            {projectLabel}
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
              <div className="note-actions-menu" ref={noteActionsMenuRef}>
                <button
                  className="icon-button"
                  aria-label="More note actions"
                  aria-expanded={isActionsOpen}
                  onClick={() => setIsActionsOpen((current) => !current)}
                >
                  <MoreVertical size={19} />
                </button>
                {isActionsOpen && (
                  <div className="note-actions-popover" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!canChangeNote}
                      title={!canChangeNote ? cannotChangeNoteMessage : undefined}
                      onClick={() => {
                        setIsEditing(true);
                        setIsActionsOpen(false);
                      }}
                    >
                      <Edit3 size={15} />
                      Edit
                    </button>
                    <button type="button" role="menuitem" onClick={() => void copyShareLink()}>
                      <Share2 size={15} />
                      Share
                    </button>
                    {(note.source_files ?? []).length > 0 ? (
                      <a href={note.source_files?.[0]?.url} target="_blank" rel="noreferrer" role="menuitem" onClick={() => setIsActionsOpen(false)}>
                        <Eye size={15} />
                        View Source
                      </a>
                    ) : (
                      <span>No source file</span>
                    )}
                    <div className="note-actions-divider" />
                    <button
                      className="danger-action"
                      type="button"
                      role="menuitem"
                      disabled={isDeleting || !canChangeNote}
                      title={!canChangeNote ? cannotChangeNoteMessage : undefined}
                      onClick={() => void deleteNote()}
                    >
                      {isDeleting ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                      Delete
                    </button>
                  </div>
                )}
              </div>
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
            className={canChangeNote ? "editable-note-title" : undefined}
            title={canChangeNote ? "Click to edit title" : cannotChangeNoteMessage}
            onClick={() => {
              if (!canChangeNote) return;
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
        {(isLoading || miaResponse) && (
          <div className={`mia-output ${isLoading ? "loading" : "result"}`} aria-live="polite">
            {isLoading ? (
              <div className="mia-loader">
                <img src={logoMarkUrl} alt="" />
              </div>
            ) : (
              <>
                <div className="mia-output-scroll">
                  <pre>{miaResponse}</pre>
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
            onChange={(event) => {
              setCommentBody(event.target.value);
              if (miaError === "Please provide instructions for Mia.") {
                setMiaError(null);
              }
            }}
            placeholder="Ask Mia anything about this note."
          />
          <div className="mia-action-row">
            <button className="primary-button small ask-mia-button" disabled={isLoading}>
              <MessageCircle size={16} />
              Ask Mia
            </button>
            <div className="mia-quick-actions">
              {miaQuickActions.map((action) => (
                <button
                  className="mia-quick-action"
                  disabled={isLoading}
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
            <span className="tag-pill" key={tag.id}>{tag.name}</span>
          ))}
          {noteTags.length < 5 && (
            <button
              className="tag-add-button"
              type="button"
              aria-label="Add tag"
              disabled={!canChangeNote}
              title={!canChangeNote ? cannotChangeNoteMessage : undefined}
              onClick={() => void addTag()}
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
    </section>
  );
}

function AddNoteDialog({
  projects,
  selectedProjectId,
  onClose,
  onCreated,
  onError
}: {
  projects: ProjectRecord[];
  selectedProjectId: string | "all";
  onClose: () => void;
  onCreated: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [mode, setMode] = useState<"text" | "link" | "file">("text");
  const shouldChooseProject = selectedProjectId === "all";
  const [projectId, setProjectId] = useState(shouldChooseProject ? "" : selectedProjectId);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    onError(null);
    try {
      if (mode === "text") {
        await apiFetch("/api/notes/from-text", {
          method: "POST",
          body: JSON.stringify({ project_id: projectId, title: title || undefined, text })
        });
      } else if (mode === "link") {
        await apiFetch("/api/notes/from-url", {
          method: "POST",
          body: JSON.stringify({ project_id: projectId, title: title || undefined, url })
        });
      } else if (file) {
        const formData = new FormData();
        formData.set("project_id", projectId);
        if (title) formData.set("title", title);
        formData.set("file", file);
        await apiFetch("/api/notes/from-file", { method: "POST", body: formData });
      }
      await onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <h2>Add note</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="segmented">
          <button type="button" className={mode === "text" ? "selected" : ""} onClick={() => setMode("text")}><FileText size={17} />Text</button>
          <button type="button" className={mode === "link" ? "selected" : ""} onClick={() => setMode("link")}><Link size={17} />Link</button>
          <button type="button" className={mode === "file" ? "selected" : ""} onClick={() => setMode("file")}><Upload size={17} />File</button>
        </div>
        {shouldChooseProject && (
          <label className="field-label">
            <span>Project</span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
              <option value="">Choose a project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
        )}
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title, optional" />
        {mode === "text" && <textarea required value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste notes, agent output, or rough thoughts" />}
        {mode === "link" && <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/article" />}
        {mode === "file" && <input required type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />}
        <button className="primary-button" disabled={isSaving || !projectId}>
          {isSaving ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
          Create note
        </button>
      </form>
    </div>
  );
}

function AddProjectDialog({
  onClose,
  onCreated,
  onError
}: {
  onClose: () => void;
  onCreated: (project: ProjectRecord) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canCreateProject = name.trim().length >= 3;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    onError(null);
    try {
      const project = await apiFetch<ProjectRecord>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, is_pinned: isPinned })
      });
      await onCreated(project);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not add project");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal project-modal" onSubmit={submit}>
        <div className="project-modal-header">
          <div>
            <h2>Add project</h2>
            <p>Anyone signed in can view this project and add notes to it.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="project-modal-body">
          <label className="field-label">
            <span>Project name</span>
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
              <small>Keep this project above the rest of the list.</small>
            </span>
          </label>
        </div>
        <div className="project-modal-actions">
          <button className="primary-button create-project-button" disabled={isSaving || !canCreateProject}>
            {isSaving ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
            Create project
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

function hydrateNotes(notes: NoteRecord[], users: UserRecord[], projects: ProjectRecord[]) {
  return notes.map((note) => ({
    ...note,
    user: note.user ?? users.find((user) => user.id === note.user_id),
    project: note.project ?? projects.find((project) => project.id === note.project_id)
  }));
}

function mergeNoteRecord(current: NoteRecord, update: NoteRecord) {
  return {
    ...current,
    ...update,
    user_id: update.user_id ?? update.user?.id ?? current.user_id,
    project_id: update.project_id ?? update.project?.id ?? current.project_id,
    user: update.user ?? current.user,
    project: update.project ?? current.project,
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
    note.project?.name,
    note.user?.name,
    tagsText
  ].filter(Boolean).join(" ").toLowerCase();
}

async function logout(setCurrentUser: (user: UserRecord | null) => void) {
  await apiFetch("/api/auth/logout", { method: "POST" });
  setCurrentUser(null);
}
