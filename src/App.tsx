import {
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
  Home,
  Image,
  Link,
  Loader2,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Share2,
  Star,
  Tags,
  Trash2,
  Upload,
  User,
  X
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import logoUrl from "./assets/logo_small.png";

const MarkdownViewer = lazy(() => import("./MarkdownViewer"));
const MarkdownEditor = lazy(() => import("./MarkdownViewer").then((module) => ({ default: module.MarkdownEditor })));

type UserRecord = {
  id: string;
  email: string;
  name: string;
  username: string;
  is_admin: boolean;
};

type ProjectRecord = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
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

type CommentRecord = {
  id: string;
  body: string;
  created_at: string;
  user?: UserRecord | null;
};

type MiaPromptRecord = {
  type: "prompt";
  text: string;
  comment?: CommentRecord;
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

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

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

function displayCommentBody(body: string) {
  return body.trim().toLowerCase().startsWith("@mia") ? body.trim().slice(4).trim() : body;
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

export function App() {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [storageCapacity, setStorageCapacity] = useState<StorageCapacityRecord | null>(null);
  const [selectedView, setSelectedView] = useState<"recent" | "starred">("recent");
  const [selectedUserId, setSelectedUserId] = useState<string | "all">("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string | "all">("all");
  const [openedNoteId, setOpenedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    setIsLoading(true);
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
  }

  async function refreshNotes() {
    const nextNotes = await apiFetch<NoteRecord[]>("/api/notes");
    const hydrated = hydrateNotes(nextNotes, users, projects);
    setNotes(hydrated);
    setOpenedNoteId((current) => current && hydrated.some((note) => note.id === current) ? current : null);
  }

  const notesByProject = useMemo(() => countBy(notes, (note) => note.project?.id ?? note.project_id ?? ""), [notes]);
  const selectedProject = selectedProjectId === "all" ? null : projects.find((project) => project.id === selectedProjectId) ?? null;
  const selectedTagRecord = selectedTag === "all" ? null : tags.find((tag) => tag.slug === selectedTag) ?? null;
  const selectedUser = selectedUserId === "all" ? null : users.find((user) => user.id === selectedUserId) ?? null;
  const breadcrumbItems = [
    selectedProject?.name,
    selectedUser?.name
  ].filter(Boolean);
  const tagSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const tagMap = new Map<string, TagRecord>();
    notes.forEach((note) => {
      const haystack = `${note.title} ${note.summary ?? ""} ${note.text ?? ""} ${note.project?.name ?? ""} ${note.user?.name ?? ""}`.toLowerCase();
      const noteMatches = haystack.includes(query);
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
  }, [notes, searchQuery, selectedTag]);
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      const userMatch = selectedUserId === "all" || note.user_id === selectedUserId;
      if (!userMatch) return false;
      const projectMatch = selectedProjectId === "all" || note.project_id === selectedProjectId;
      if (!projectMatch) return false;
      const tagMatch = selectedTag === "all" || note.tags?.some((tag) => tag.slug === selectedTag);
      if (!tagMatch) return false;
      if (!query) return true;
      return `${note.title} ${note.summary ?? ""} ${note.text ?? ""} ${note.project?.name ?? ""} ${note.user?.name ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [notes, searchQuery, selectedProjectId, selectedTag, selectedUserId]);

  const openedNote = notes.find((note) => note.id === openedNoteId) ?? null;

  useEffect(() => {
    if (!openedNote || openedNote.text) return;
    void apiFetch<NoteRecord>(`/api/notes/${openedNote.id}`)
      .then((fullNote) => setNotes((items) => items.map((item) => item.id === openedNote.id ? fullNote : item)))
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
      <section className="shell" aria-label="Mianotes dashboard">
        <aside className="sidebar">
          <button className="add-note-button" onClick={() => setIsAddOpen(true)}>
            <Plus size={19} />
            <span>Add Note</span>
          </button>

          <nav className="nav-group" aria-label="Note filters">
            <button className={`nav-item ${selectedView === "recent" ? "active" : ""}`} onClick={() => {
              setSelectedView("recent");
              setSelectedProjectId("all");
            }}>
              <History size={20} />
              <span>Recent</span>
            </button>
            <button className={`nav-item ${selectedView === "starred" ? "active" : ""}`} onClick={() => setSelectedView("starred")}>
              <Star size={20} />
              <span>Starred</span>
            </button>
          </nav>

          <SidebarSection
            title="Projects"
            action={<button className="icon-button" aria-label="Add project"><Plus size={15} /></button>}
          >
            {projects.map((project) => (
              <button
                key={project.id}
                className={`nav-item ${selectedProjectId === project.id ? "active-soft" : ""}`}
                onClick={() => {
                  setSelectedView("recent");
                  setSelectedProjectId(project.id);
                }}
              >
                <Folder size={19} />
                <span>{project.name}</span>
                <small>{notesByProject[project.id] ?? 0}</small>
              </button>
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

          <div className="sidebar-links" aria-label="Account links">
            <button type="button">Profile</button>
            <span>|</span>
            <button type="button">Settings</button>
            <span>|</span>
            <button type="button" onClick={() => void logout(setCurrentUser)}>Sign out</button>
          </div>
        </aside>

        <section className="workspace">
          {!openedNote && (
            <header className="toolbar">
              <div className="breadcrumb">
                <Home className="breadcrumb-home" size={14} />
                <span className="breadcrumb-root">
                  {selectedView === "starred" ? "Starred" : "Recent"}
                </span>
                {breadcrumbItems.map((item, index) => (
                  <span key={`${item}-${index}`} className={index === breadcrumbItems.length - 1 ? "current" : undefined}>
                    <ChevronRight size={14} />
                    {item}
                  </span>
                ))}
                {selectedTagRecord && (
                  <button className="breadcrumb-filter-chip" type="button" onClick={() => setSelectedTag("all")}>
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
                      onChange={(event) => setSearchQuery(event.target.value)}
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
                  <span className="select-button-label">{selectedUser?.name ?? "Users"}</span>
                  <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                    <option value="all">Users</option>
                    {users.map((person) => (
                      <option value={person.id} key={person.id}>{person.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="select-button-chevron" size={12} />
                </label>
              </div>
            </header>
          )}

          {error && <div className="notice danger">{error}</div>}

          <div className="content-surface">
            {openedNote ? (
              <NotePanel
                note={openedNote}
                view={selectedView}
                onClose={() => setOpenedNoteId(null)}
                onRefresh={async () => {
                  const fullNote = await apiFetch<NoteRecord>(`/api/notes/${openedNote.id}`);
                  setNotes((items) => items.map((item) => item.id === openedNote.id ? fullNote : item));
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
                    <EmptyState onAdd={() => setIsAddOpen(true)} />
                  ) : (
                    filteredNotes.map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        onClick={async () => {
                          try {
                            const fullNote = note.text ? note : await apiFetch<NoteRecord>(`/api/notes/${note.id}`);
                            setNotes((items) => items.map((item) => item.id === note.id ? fullNote : item));
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
                    <span className="result-count">{filteredNotes.length} notes</span>
                    <button className="icon-button" aria-label="Previous page"><ChevronLeft size={18} /></button>
                    <button className="icon-button" aria-label="Next page"><ChevronRight size={18} /></button>
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
          onClose={() => setIsAddOpen(false)}
          onCreated={async () => {
            setIsAddOpen(false);
            await refreshNotes();
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
    : "Enter the master password for this Mianotes instance.";
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
            <button className="primary-button">{step === "join" ? "Join Mianotes" : "Sign in"}</button>
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

function NoteRow({ note, onClick }: { note: NoteRecord; onClick: () => void }) {
  const Icon = sourceIcon(note.source_type);
  const projectName = note.project?.name ?? "Unassigned";
  const owner = note.user?.name ?? "Unknown";
  const tags = note.tags ?? [];
  const isBusy = ["pending_parse", "parsing"].includes(note.status);

  return (
    <button className="note-row" onClick={onClick}>
      <span className="star"><Star size={21} /></span>
      <div className="note-body">
        <div className="note-meta-top">
          <span className="project-name">{projectName}</span>
          <span className={`badge ${badgeTone(note.source_type)}`}><Icon size={15} />{note.source_type}</span>
          {isBusy && <span className="badge warning"><Loader2 size={14} className="spin" />{note.status.replace("_", " ")}</span>}
        </div>
        <h2>{note.title}</h2>
        <p>{noteExcerpt(note)}</p>
        <div className="note-meta-bottom">
          <span className="avatar">{owner.slice(0, 2).toUpperCase()}</span>
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
  view,
  onClose,
  onRefresh,
  onDeleted
}: {
  note: NoteRecord;
  view: "recent" | "starred";
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [miaResponse, setMiaResponse] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(noteBodyMarkdown(note.text ?? ""));
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMiaResponse(null);
    setCommentBody("");
    setIsEditing(false);
    setDraftText(noteBodyMarkdown(note.text ?? ""));
    setIsActionsOpen(false);
    if (!note) return;
    void apiFetch<CommentRecord[]>(`/api/notes/${note.id}/comments`).then(setComments).catch(() => setComments([]));
  }, [note?.id]);

  async function saveMarkdown() {
    setIsSaving(true);
    setError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: draftText })
      });
      setIsEditing(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setIsSaving(false);
    }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!note || !commentBody.trim()) return;
    const body = commentBody.trim().toLowerCase().startsWith("@mia")
      ? commentBody.trim()
      : `@mia ${commentBody.trim()}`;
    setIsLoading(true);
    setMiaResponse(null);
    setError(null);
    try {
      const result = await apiFetch<CommentRecord | MiaPromptRecord>(`/api/notes/${note.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body })
      });
      if (isMiaPrompt(result)) {
        setMiaResponse(result.text);
        if (result.comment) {
          setComments((items) => [...items, result.comment!]);
        }
        setCommentBody("");
        await onRefresh();
      } else {
        setComments((items) => [...items, result]);
        setCommentBody("");
        await onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send comment");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyShareLink() {
    const shareUrl = note.note_url ? new URL(note.note_url, window.location.origin).toString() : window.location.href;
    await navigator.clipboard?.writeText(shareUrl);
    setIsActionsOpen(false);
  }

  async function deleteNote() {
    const confirmed = window.confirm(`Delete "${note.title}"? This cannot be undone.`);
    if (!confirmed) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/notes/${note.id}`, { method: "DELETE" });
      await onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete note");
    } finally {
      setIsDeleting(false);
    }
  }

  const viewLabel = view === "starred" ? "Starred" : "Recent";
  const noteDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(note.created_at));
  const authorName = note.user?.name ?? "Unknown";
  const noteMarkdownBody = noteBodyMarkdown(note.text ?? "");

  return (
    <section className="note-panel">
      <div className="note-document-header">
        <button className="back-square-button" onClick={onClose} aria-label="Back to notes">
          <ChevronLeft size={16} />
        </button>
        <div className="note-document-breadcrumb">
          <Home className="breadcrumb-home" size={14} />
          <span className="breadcrumb-root">{viewLabel}</span>
          <ChevronRight size={14} />
          <span>{note.project?.name ?? "Project"}</span>
          <ChevronRight size={14} />
          <strong>{note.title}</strong>
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
              <button className="secondary-action-button" type="button" onClick={() => setIsEditing(true)}>
                <Edit3 size={16} />
                Edit
              </button>
              <div className="note-actions-menu">
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
                    <button type="button" role="menuitem" onClick={() => {
                      setIsEditing(true);
                      setIsActionsOpen(false);
                    }}>
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
                    <button className="danger-action" type="button" role="menuitem" disabled={isDeleting} onClick={() => void deleteNote()}>
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
      <div className="note-document-meta">
        <span className="avatar note-author-avatar">{authorName.slice(0, 2).toUpperCase()}</span>
        <div className="note-author-details">
          <strong>{authorName}</strong>
          <span>{noteDate}</span>
        </div>
        <div className="note-document-tags">
          {(note.tags ?? []).map((tag) => (
            <span className="tag-pill" key={tag.id}>{tag.name}</span>
          ))}
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
            <MarkdownViewer
              id={note.id}
              updatedAt={note.updated_at}
              markdown={noteMarkdownBody || "Open the note to load the full Markdown body."}
            />
          </Suspense>
        </div>
      )}
      <div className="note-section-divider" />
      <section className="comments-box">
        <h3>Ask Mia</h3>
        <form onSubmit={addComment} className="comment-form">
          <textarea
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder="Summarise this note, extract key points, or suggest improvements"
          />
          <button className="primary-button small" disabled={isLoading}>
            {isLoading ? <Loader2 className="spin" size={16} /> : <MessageCircle size={16} />}
            Ask Mia
          </button>
        </form>
        {miaResponse && <pre className="mia-response">{miaResponse}</pre>}
        {error && <div className="notice danger">{error}</div>}
        {comments.map((comment) => (
          <div className="comment" key={comment.id}>
            <div className="comment-header">
              <strong>{comment.user?.name ?? "User"}</strong>
              <button type="button" onClick={() => void navigator.clipboard?.writeText(displayCommentBody(comment.body))}>Copy</button>
            </div>
            <p>{displayCommentBody(comment.body)}</p>
          </div>
        ))}
      </section>
    </section>
  );
}

function AddNoteDialog({
  projects,
  onClose,
  onCreated,
  onError
}: {
  projects: ProjectRecord[];
  onClose: () => void;
  onCreated: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [mode, setMode] = useState<"text" | "link" | "file">("text");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
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
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <Bot size={34} />
      <h2>No notes found</h2>
      <p>Add a note, upload a file, or paste a link and Mia will turn it into Markdown.</p>
      <button className="primary-button" onClick={onAdd}><Plus size={17} />Add Note</button>
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

function isMiaPrompt(value: CommentRecord | MiaPromptRecord): value is MiaPromptRecord {
  return "type" in value && value.type === "prompt";
}

async function logout(setCurrentUser: (user: UserRecord | null) => void) {
  await apiFetch("/api/auth/logout", { method: "POST" });
  setCurrentUser(null);
}
