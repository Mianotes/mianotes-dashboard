import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NoteRecord, UserRecord } from "../../api/types";
import { EmptyState } from "./EmptyState";
import { NoteRow } from "./NoteRow";

type NoteListProps = {
  notes: NoteRecord[];
  workspaceId: string;
  currentUser: UserRecord;
  filteredCount: number | null;
  currentPage: number;
  visibleStart: number;
  visibleEnd: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onAdd: () => void;
  onOpenNote: (note: NoteRecord, edit?: boolean) => void;
  onMoveNote: (note: NoteRecord) => void;
  onShareNote: (note: NoteRecord) => void;
  onExportNotePdf: (note: NoteRecord) => void;
  onToggleStar: (note: NoteRecord) => void;
  onDeleted: () => Promise<void>;
  onError: (message: string | null) => void;
  onPageChange: (page: number) => void;
};

export function NoteList({
  notes,
  workspaceId,
  currentUser,
  filteredCount,
  currentPage,
  visibleStart,
  visibleEnd,
  hasPreviousPage,
  hasNextPage,
  onAdd,
  onOpenNote,
  onMoveNote,
  onShareNote,
  onExportNotePdf,
  onToggleStar,
  onDeleted,
  onError,
  onPageChange
}: NoteListProps) {
  return (
    <>
      <section className="note-list" aria-label="Notes">
        {notes.length === 0 ? (
          <EmptyState onAdd={onAdd} />
        ) : (
          notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              workspaceId={workspaceId}
              currentUser={currentUser}
              onToggleStar={() => onToggleStar(note)}
              onClick={() => onOpenNote(note)}
              onEdit={() => onOpenNote(note, true)}
              onMove={() => onMoveNote(note)}
              onShare={() => onShareNote(note)}
              onExportPdf={() => onExportNotePdf(note)}
              onDeleted={onDeleted}
              onError={onError}
            />
          ))
        )}
      </section>
      {notes.length > 0 && (
        <footer className="list-pagination" aria-label="Note list pagination">
          <span className="result-count">
            {visibleStart}-{visibleEnd} notes{filteredCount !== null ? ` of ${filteredCount}` : ""}
          </span>
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={!hasPreviousPage}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={!hasNextPage}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </footer>
      )}
    </>
  );
}
