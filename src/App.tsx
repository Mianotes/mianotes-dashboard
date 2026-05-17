import {
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  File,
  FileText,
  Folder,
  Image,
  Inbox,
  Link,
  Loader2,
  LogOut,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Star,
  Tags,
  Upload,
  User,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

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
};

type EmailCheckResponse = {
  user_id: string | null;
  is_first_user?: boolean;
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
  const clean = (note.text ?? "")
    .replace(/^# .+$/m, "")
    .replace(/Created: .+$/m, "")
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean || "Open this note to see its generated Markdown content.";
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

export function App() {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | "all">("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string | "all">("all");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
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
    const [nextUsers, nextProjects, nextTags, nextNotes] = await Promise.all([
      apiFetch<UserRecord[]>("/api/users"),
      apiFetch<ProjectRecord[]>("/api/projects"),
      apiFetch<TagRecord[]>("/api/tags"),
      apiFetch<NoteRecord[]>("/api/notes")
    ]);
    const activeProjects = nextProjects.filter((project) => !project.archived_at);
    const hydrated = hydrateNotes(nextNotes, nextUsers, activeProjects);
    const detailed = await loadNoteDetails(hydrated);
    setUsers(nextUsers);
    setProjects(activeProjects);
    setTags(nextTags);
    setNotes(detailed);
    setSelectedNoteId((current) => current ?? detailed[0]?.id ?? null);
  }

  async function refreshNotes() {
    const params = new URLSearchParams();
    if (selectedUserId !== "all") params.set("user_id", selectedUserId);
    if (selectedProjectId !== "all") params.set("project_id", selectedProjectId);
    const queryString = params.toString();
    const nextNotes = await apiFetch<NoteRecord[]>(`/api/notes${queryString ? `?${queryString}` : ""}`);
    const hydrated = hydrateNotes(nextNotes, users, projects);
    const detailed = await loadNoteDetails(hydrated);
    setNotes(detailed);
    setSelectedNoteId((current) => current && detailed.some((note) => note.id === current) ? current : detailed[0]?.id ?? null);
  }

  useEffect(() => {
    if (currentUser) {
      void refreshNotes();
    }
  }, [selectedUserId, selectedProjectId]);

  const notesByUser = useMemo(() => countBy(notes, (note) => note.user?.id ?? note.user_id ?? ""), [notes]);
  const notesByProject = useMemo(() => countBy(notes, (note) => note.project?.id ?? note.project_id ?? ""), [notes]);
  const projectsForSidebar = selectedUserId === "all" ? projects : projects.filter((project) => project.user_id === selectedUserId);
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      const tagMatch = selectedTag === "all" || note.tags?.some((tag) => tag.slug === selectedTag);
      if (!tagMatch) return false;
      if (!query) return true;
      return `${note.title} ${note.text ?? ""} ${note.project?.name ?? ""} ${note.user?.name ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [notes, searchQuery, selectedTag]);

  const selectedNote = filteredNotes.find((note) => note.id === selectedNoteId) ?? filteredNotes[0] ?? null;

  useEffect(() => {
    if (!selectedNote || selectedNote.text) return;
    void apiFetch<NoteRecord>(`/api/notes/${selectedNote.id}`)
      .then((fullNote) => setNotes((items) => items.map((item) => item.id === selectedNote.id ? fullNote : item)))
      .catch(() => undefined);
  }, [selectedNote?.id]);

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
            <button className="nav-item active" onClick={() => {
              setSelectedProjectId("all");
              setSelectedUserId("all");
            }}>
              <Inbox size={20} />
              <span>Recent</span>
            </button>
            <button className="nav-item">
              <Star size={20} />
              <span>Starred</span>
            </button>
          </nav>

          <SidebarSection title="Users">
            {users.map((person) => (
              <button
                key={person.id}
                className={`nav-item ${selectedUserId === person.id ? "active-soft" : ""}`}
                onClick={() => {
                  setSelectedUserId(person.id);
                  setSelectedProjectId("all");
                }}
              >
                <User size={19} />
                <span>{person.name}</span>
                <small>{notesByUser[person.id] ?? 0}</small>
              </button>
            ))}
          </SidebarSection>

          <SidebarSection
            title="Projects"
            action={<button className="icon-button" aria-label="Add project"><Plus size={17} /></button>}
          >
            {projectsForSidebar.map((project) => (
              <button
                key={project.id}
                className={`nav-item ${selectedProjectId === project.id ? "active-soft" : ""}`}
                onClick={() => setSelectedProjectId(project.id)}
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
              <strong>Local</strong>
            </div>
            <div className="meter-track">
              <div className="meter-fill" />
            </div>
          </div>
        </aside>

        <section className="workspace">
          <header className="toolbar">
            <div className="breadcrumb">
              <span>{selectedUserId === "all" ? "Everyone" : users.find((user) => user.id === selectedUserId)?.name}</span>
              <ChevronRight size={17} />
              <strong>{selectedProjectId === "all" ? "Recent notes" : projects.find((project) => project.id === selectedProjectId)?.name}</strong>
            </div>
            <div className="toolbar-actions">
              <label className="search-box">
                <Search size={21} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search notes..."
                />
              </label>
              <label className="select-button">
                <Tags size={18} />
                <select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)}>
                  <option value="all">Tags</option>
                  {tags.map((tag) => (
                    <option value={tag.slug} key={tag.id}>{tag.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </label>
              <span className="result-count">{filteredNotes.length} notes</span>
              <button className="icon-button" aria-label="Previous page"><ChevronLeft size={21} /></button>
              <button className="icon-button" aria-label="Next page"><ChevronRight size={21} /></button>
              <button className="icon-button" aria-label="Account menu" onClick={() => void logout(setCurrentUser)}>
                <LogOut size={19} />
              </button>
            </div>
          </header>

          {error && <div className="notice danger">{error}</div>}

          <div className="content-grid">
            <section className="note-list" aria-label="Notes">
              {filteredNotes.length === 0 ? (
                <EmptyState onAdd={() => setIsAddOpen(true)} />
              ) : (
                filteredNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    selected={selectedNote?.id === note.id}
                    onClick={async () => {
                      setSelectedNoteId(note.id);
                      if (!note.text) {
                        try {
                          const fullNote = await apiFetch<NoteRecord>(`/api/notes/${note.id}`);
                          setNotes((items) => items.map((item) => item.id === note.id ? fullNote : item));
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Could not open note");
                        }
                      }
                    }}
                  />
                ))
              )}
            </section>

            <NotePanel
              note={selectedNote}
              onRefresh={async () => {
                if (!selectedNote) return;
                const fullNote = await apiFetch<NoteRecord>(`/api/notes/${selectedNote.id}`);
                setNotes((items) => items.map((item) => item.id === selectedNote.id ? fullNote : item));
              }}
            />
          </div>
        </section>
      </section>

      <footer className="brand-footer">
        <span className="brand-mark" />
        <strong>mianotes</strong>
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

  return (
    <main className="screen auth-screen">
      <section className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark" />
          <strong>mianotes</strong>
        </div>
        <h1>{step === "email" ? "Open your local knowledge base" : step === "join" ? "Create your profile" : "Welcome back"}</h1>
        <p>
          {isFirstUser
            ? "You are setting up this Mianotes instance. The password becomes the shared household password."
            : "Sign in to browse notes, projects, sources, comments, and Mia prompts."}
        </p>
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

function NoteRow({ note, selected, onClick }: { note: NoteRecord; selected: boolean; onClick: () => void }) {
  const Icon = sourceIcon(note.source_type);
  const projectName = note.project?.name ?? "Unassigned";
  const owner = note.user?.name ?? "Unknown";
  const tags = note.tags ?? [];
  const isBusy = ["pending_parse", "parsing"].includes(note.status);

  return (
    <button className={`note-row ${selected ? "selected" : ""}`} onClick={onClick}>
      <span className={`star ${selected ? "on" : ""}`}><Star size={21} fill={selected ? "currentColor" : "none"} /></span>
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

function NotePanel({ note, onRefresh }: { note: NoteRecord | null; onRefresh: () => Promise<void> }) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [miaResponse, setMiaResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMiaResponse(null);
    setCommentBody("");
    if (!note) return;
    void apiFetch<CommentRecord[]>(`/api/notes/${note.id}/comments`).then(setComments).catch(() => setComments([]));
  }, [note?.id]);

  if (!note) {
    return (
      <aside className="note-panel empty-panel">
        <Sparkles size={28} />
        <h2>Select a note</h2>
        <p>Pick a note to preview Markdown, source files, comments, and Mia prompts.</p>
      </aside>
    );
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!note || !commentBody.trim()) return;
    setIsLoading(true);
    setMiaResponse(null);
    setError(null);
    try {
      const result = await apiFetch<CommentRecord | MiaPromptRecord>(`/api/notes/${note.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: commentBody })
      });
      if (isMiaPrompt(result)) {
        setMiaResponse(result.text);
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

  return (
    <aside className="note-panel">
      <div className="panel-header">
        <div>
          <span className={`badge ${badgeTone(note.status)}`}>{note.status.replace("_", " ")}</span>
          <h2>{note.title}</h2>
        </div>
        <button className="icon-button" aria-label="More note actions"><MoreVertical size={19} /></button>
      </div>
      <div className="panel-meta">
        <span><User size={16} />{note.user?.name ?? "Unknown"}</span>
        <span><Folder size={16} />{note.project?.name ?? "Project"}</span>
        <span><Clock3 size={16} />{relativeTime(note.updated_at ?? note.created_at)}</span>
      </div>
      <pre className="markdown-preview">{note.text ?? "Open the note to load the full Markdown body."}</pre>
      <div className="source-list">
        {(note.source_files ?? []).map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
            <FileText size={17} />
            {source.original_filename}
          </a>
        ))}
      </div>
      <section className="comments-box">
        <h3>Comments and Mia</h3>
        <form onSubmit={addComment} className="comment-form">
          <textarea
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder="@mia summarise this note, or write a normal comment"
          />
          <button className="primary-button small" disabled={isLoading}>
            {isLoading ? <Loader2 className="spin" size={16} /> : <MessageCircle size={16} />}
            Send
          </button>
        </form>
        {miaResponse && <pre className="mia-response">{miaResponse}</pre>}
        {error && <div className="notice danger">{error}</div>}
        {comments.map((comment) => (
          <div className="comment" key={comment.id}>
            <strong>{comment.user?.name ?? "User"}</strong>
            <p>{comment.body}</p>
          </div>
        ))}
      </section>
    </aside>
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

async function loadNoteDetails(notes: NoteRecord[]) {
  return Promise.all(
    notes.map((note) => {
      if (note.text) return note;
      return apiFetch<NoteRecord>(`/api/notes/${note.id}`).catch(() => note);
    })
  );
}

async function logout(setCurrentUser: (user: UserRecord | null) => void) {
  await apiFetch("/api/auth/logout", { method: "POST" });
  setCurrentUser(null);
}
