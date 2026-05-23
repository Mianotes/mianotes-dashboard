import { Edit3, Eye, Loader2, MoreVertical, Share2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import type { NoteRecord } from "../../api/types";

type NoteActionsMenuProps = {
  note: NoteRecord;
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  isDeleting?: boolean;
  onEdit: () => void;
  onShare: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
};

export function NoteActionsMenu({
  note,
  canChangeNote,
  cannotChangeNoteMessage,
  isDeleting = false,
  onEdit,
  onShare,
  onDelete
}: NoteActionsMenuProps) {
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
