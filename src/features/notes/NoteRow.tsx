import { Clock3, Loader2, Star, Tags } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { apiFetch } from "../../api/client";
import type { NoteRecord, UserRecord } from "../../api/types";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { relativeTime } from "../../utils/format";
import { appUrlForPath, noteRoutePath } from "../../utils/internalRoutes";
import { badgeTone, isNoteJobActive, isNoteIndexing, noteExcerpt, noteJobBadge, sourceIcon } from "../../utils/notes";
import { NoteActionsMenu } from "./NoteActionsMenu";

type NoteRowProps = {
  note: NoteRecord;
  currentUser: UserRecord;
  onClick: () => void;
  onToggleStar: () => void;
  onEdit: () => void;
  onMove: () => void;
  onDeleted: () => Promise<void>;
  onError: (message: string | null) => void;
};

export function NoteRow({
  note,
  currentUser,
  onClick,
  onToggleStar,
  onEdit,
  onMove,
  onDeleted,
  onError
}: NoteRowProps) {
  const Icon = sourceIcon(note.source_type);
  const folderName = note.folder?.name ?? "Unassigned";
  const owner = note.user?.name ?? "Unknown";
  const tags = note.tags ?? [];
  const isBusy = isNoteIndexing(note);
  const canChangeNote = currentUser.is_admin || note.user_id === currentUser.id || note.user?.id === currentUser.id;
  const canEditNote = canChangeNote && !isNoteJobActive(note);
  const cannotChangeNoteMessage = `Only ${owner} or an admin can change this note.`;
  const cannotEditNoteMessage = isNoteJobActive(note) ? "Mia is still processing this note." : cannotChangeNoteMessage;
  const jobBadge = noteJobBadge(note);

  function openRowFromKeyboard(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onClick();
  }

  async function copyShareLink() {
    await navigator.clipboard?.writeText(appUrlForPath(noteRoutePath(note.id)));
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
          {isBusy && !jobBadge && <span className="badge warning"><Loader2 size={14} className="spin" />{note.status.replace("_", " ")}</span>}
        </div>
        <h2>
          {note.title}
          {jobBadge && <span className={`badge ${jobBadge.tone}`}>{jobBadge.label}</span>}
        </h2>
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
          canEditNote={canEditNote}
          cannotEditNoteMessage={cannotEditNoteMessage}
          onEdit={onEdit}
          onMove={onMove}
          onShare={copyShareLink}
          onDelete={deleteNote}
        />
      </div>
    </article>
  );
}
