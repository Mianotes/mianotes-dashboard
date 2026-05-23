import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NoteRecord, UserRecord } from "../../api/types";
import { EmptyState } from "./EmptyState";
import { NoteRow } from "./NoteRow";

type NoteListProps = {
  notes: NoteRecord[];
  currentUser: UserRecord;
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  visibleStart: number;
  visibleEnd: number;
  onAdd: () => void;
  onOpenNote: (note: NoteRecord, edit?: boolean) => void;
  onToggleStar: (note: NoteRecord) => void;
  onDeleted: () => Promise<void>;
  onError: (message: string | null) => void;
  onPageChange: (page: number) => void;
};

export function NoteList({
  notes,
  currentUser,
  filteredCount,
  currentPage,
  totalPages,
  visibleStart,
  visibleEnd,
  onAdd,
  onOpenNote,
  onToggleStar,
  onDeleted,
  onError,
  onPageChange
}: NoteListProps) {
  return (
    <>
      <section className="note-list" aria-label="Notes">
        {filteredCount === 0 ? (
          <EmptyState onAdd={onAdd} />
        ) : (
          notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              currentUser={currentUser}
              onToggleStar={() => onToggleStar(note)}
              onClick={() => onOpenNote(note)}
              onEdit={() => onOpenNote(note, true)}
              onDeleted={onDeleted}
              onError={onError}
            />
          ))
        )}
      </section>
      {filteredCount > 0 && (
        <footer className="list-pagination" aria-label="Note list pagination">
          <span className="result-count">
            {visibleStart}-{visibleEnd} notes of {filteredCount}
          </span>
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            <ChevronRight size={18} />
          </button>
        </footer>
      )}
    </>
  );
}
