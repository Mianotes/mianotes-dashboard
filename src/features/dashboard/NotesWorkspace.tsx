import { X } from "lucide-react";
import type { FolderRecord, NoteRecord, UserRecord } from "../../api/types";
import { NoteList } from "../notes/NoteList";
import { NotePanel } from "../notes/NotePanel";

type NotesWorkspaceProps = {
  error: string | null;
  successMessage: string | null;
  workspaceId: string;
  workspaceName: string;
  openedNote: NoteRecord | null;
  selectedFolder: FolderRecord | null;
  currentUser: UserRecord;
  noteIdToEditOnOpen: string | null;
  paginatedNotes: NoteRecord[];
  filteredCount: number | null;
  clampedPage: number;
  visibleStart: number;
  visibleEnd: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onDismissError: () => void;
  onDismissSuccess: () => void;
  onBack: () => void;
  onRefreshOpenedNote: () => Promise<void>;
  onNoteEditModeChange: (isEditing: boolean) => void;
  onOpenedNoteDeleted: () => Promise<void>;
  onAdd: () => void;
  onOpenNote: (note: NoteRecord, edit?: boolean) => void;
  onMoveNote: (note: NoteRecord) => void;
  onShareNote: (note: NoteRecord) => void;
  onExportNotePdf: (note: NoteRecord) => void;
  onToggleStar: (note: NoteRecord) => void;
  onNotesDeleted: () => Promise<void>;
  onError: (message: string | null) => void;
  onPageChange: (page: number) => void;
};

export function NotesWorkspace({
  error,
  successMessage,
  workspaceId,
  workspaceName,
  openedNote,
  selectedFolder,
  currentUser,
  noteIdToEditOnOpen,
  paginatedNotes,
  filteredCount,
  clampedPage,
  visibleStart,
  visibleEnd,
  hasPreviousPage,
  hasNextPage,
  onDismissError,
  onDismissSuccess,
  onBack,
  onRefreshOpenedNote,
  onNoteEditModeChange,
  onOpenedNoteDeleted,
  onAdd,
  onOpenNote,
  onMoveNote,
  onShareNote,
  onExportNotePdf,
  onToggleStar,
  onNotesDeleted,
  onError,
  onPageChange
}: NotesWorkspaceProps) {
  return (
    <>
      {error && (
        <div className="dashboard-notice dashboard-toast-notice" role="status">
          <span>{error}</span>
          <button type="button" aria-label="Dismiss message" onClick={onDismissError}>
            <X size={14} />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="dashboard-notice success dashboard-toast-notice share-copy-notice" role="status">
          <span>{successMessage}</span>
          <button type="button" aria-label="Dismiss message" onClick={onDismissSuccess}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="content-surface">
        {openedNote ? (
          <NotePanel
            note={openedNote}
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            folderLabel={openedNote.folder?.name ?? selectedFolder?.name ?? "All folders"}
            currentUser={currentUser}
            startInEdit={noteIdToEditOnOpen === openedNote.id}
            onClose={onBack}
            onRefresh={onRefreshOpenedNote}
            onEditModeChange={onNoteEditModeChange}
            onMove={onMoveNote}
            onShare={onShareNote}
            onExportPdf={onExportNotePdf}
            onDeleted={onOpenedNoteDeleted}
          />
        ) : (
          <NoteList
            notes={paginatedNotes}
            workspaceId={workspaceId}
            currentUser={currentUser}
            filteredCount={filteredCount}
            currentPage={clampedPage}
            visibleStart={visibleStart}
            visibleEnd={visibleEnd}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onAdd={onAdd}
            onOpenNote={onOpenNote}
            onMoveNote={onMoveNote}
            onShareNote={onShareNote}
            onExportNotePdf={onExportNotePdf}
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
