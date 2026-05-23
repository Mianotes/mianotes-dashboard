import { X } from "lucide-react";
import type { FolderRecord, NoteRecord, UserRecord } from "../../api/types";
import { NoteList } from "../notes/NoteList";
import { NotePanel } from "../notes/NotePanel";

type NotesWorkspaceProps = {
  error: string | null;
  openedNote: NoteRecord | null;
  selectedFolder: FolderRecord | null;
  currentUser: UserRecord;
  noteIdToEditOnOpen: string | null;
  paginatedNotes: NoteRecord[];
  filteredCount: number;
  clampedPage: number;
  totalPages: number;
  visibleStart: number;
  visibleEnd: number;
  onDismissError: () => void;
  onStartInEditConsumed: () => void;
  onBack: () => void;
  onRefreshOpenedNote: () => Promise<void>;
  onOpenedNoteDeleted: () => Promise<void>;
  onAdd: () => void;
  onOpenNote: (note: NoteRecord, edit?: boolean) => void;
  onMoveNote: (note: NoteRecord) => void;
  onToggleStar: (note: NoteRecord) => void;
  onNotesDeleted: () => Promise<void>;
  onError: (message: string | null) => void;
  onPageChange: (page: number) => void;
};

export function NotesWorkspace({
  error,
  openedNote,
  selectedFolder,
  currentUser,
  noteIdToEditOnOpen,
  paginatedNotes,
  filteredCount,
  clampedPage,
  totalPages,
  visibleStart,
  visibleEnd,
  onDismissError,
  onStartInEditConsumed,
  onBack,
  onRefreshOpenedNote,
  onOpenedNoteDeleted,
  onAdd,
  onOpenNote,
  onMoveNote,
  onToggleStar,
  onNotesDeleted,
  onError,
  onPageChange
}: NotesWorkspaceProps) {
  return (
    <>
      {error && (
        <div className="dashboard-notice" role="status">
          <span>{error}</span>
          <button type="button" aria-label="Dismiss message" onClick={onDismissError}>
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
            onStartInEditConsumed={onStartInEditConsumed}
            onClose={onBack}
            onRefresh={onRefreshOpenedNote}
            onMove={onMoveNote}
            onDeleted={onOpenedNoteDeleted}
          />
        ) : (
          <NoteList
            notes={paginatedNotes}
            currentUser={currentUser}
            filteredCount={filteredCount}
            currentPage={clampedPage}
            totalPages={totalPages}
            visibleStart={visibleStart}
            visibleEnd={visibleEnd}
            onAdd={onAdd}
            onOpenNote={onOpenNote}
            onMoveNote={onMoveNote}
            onToggleStar={onToggleStar}
            onDeleted={onNotesDeleted}
            onError={onError}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </>
  );
}
