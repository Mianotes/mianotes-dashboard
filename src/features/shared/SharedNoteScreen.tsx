import { Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import type { NoteRecord } from "../../api/types";
import logoUrl from "../../assets/logo_small.png";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { noteBodyMarkdown } from "../../utils/notes";

const MarkdownViewer = lazy(() => import("../../MarkdownViewer"));

type SharedNoteScreenProps = {
  token: string;
};

export function SharedNoteScreen({ token }: SharedNoteScreenProps) {
  const [note, setNote] = useState<NoteRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sharedAuthor = note?.user
    ? {
        ...note.user,
        photo_url: note.user.photo_url ? `/api/notes/shared/${encodeURIComponent(token)}/avatar` : null
      }
    : null;

  useEffect(() => {
    let cancelled = false;

    async function loadSharedNote() {
      setIsLoading(true);
      setError(null);
      try {
        const sharedNote = await apiFetch<NoteRecord>(`/api/notes/shared/${encodeURIComponent(token)}`);
        if (!cancelled) setNote(sharedNote);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "This shared note is no longer available.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSharedNote();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!note || isLoading || error) return;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("print") !== "1") return;

    const printTimer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(printTimer);
  }, [error, isLoading, note]);

  return (
    <main className="shared-note-screen">
      <article className="shared-note-document">
        {isLoading ? (
          <div className="shared-note-state">
            <Loader2 className="spin" size={28} />
          </div>
        ) : error ? (
          <div className="shared-note-state" role="alert">
            {error}
          </div>
        ) : note ? (
          <>
            <p className="shared-note-folder">{note.folder?.name ?? "Shared note"}</p>
            <h1>{note.title}</h1>
            <div className="shared-note-author">
              <UserAvatar user={sharedAuthor} name={note.user?.name ?? "Mianotes"} />
              <span>{note.user?.name ?? "Mianotes"}</span>
            </div>
            <div className="markdown-preview shared-note-preview">
              <Suspense fallback={<div className="editor-loading">Loading note...</div>}>
                <MarkdownViewer
                  id={note.id}
                  updatedAt={note.updated_at}
                  markdown={noteBodyMarkdown(note.text ?? "")}
                />
              </Suspense>
            </div>
          </>
        ) : null}
      </article>
      <footer className="shared-note-footer">
        <img src={logoUrl} alt="Mianotes" />
      </footer>
    </main>
  );
}
