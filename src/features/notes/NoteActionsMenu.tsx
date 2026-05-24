import { Edit3, Eye, Loader2, MoreVertical, Share2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { mediaPath } from "../../api/client";
import type { NoteRecord } from "../../api/types";
import { MoveNoteIcon } from "../../components/icons/MoveNoteIcon";

type NoteActionsMenuProps = {
  note: NoteRecord;
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  canEditNote: boolean;
  cannotEditNoteMessage: string;
  isDeleting?: boolean;
  onEdit: () => void;
  onMove: () => void;
  onShare: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
};

function originalSourceUrl(note: NoteRecord): string | null {
  if (note.source_type !== "link") return null;

  const value = note.source_files?.[0]?.original_filename?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function NoteActionsMenu({
  note,
  canChangeNote,
  cannotChangeNoteMessage,
  canEditNote,
  cannotEditNoteMessage,
  isDeleting = false,
  onEdit,
  onMove,
  onShare,
  onDelete
}: NoteActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpeningSource, setIsOpeningSource] = useState(false);
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

  async function openSourceFile() {
    const sourceFile = note.source_files?.[0];
    if ((!sourceFile?.url && !originalSourceUrl(note)) || isOpeningSource) {
      return;
    }

    setIsOpeningSource(true);
    const sourceUrl = originalSourceUrl(note);
    if (sourceUrl) {
      const viewer = window.open(sourceUrl, "_blank", "noopener,noreferrer");
      if (viewer) {
        viewer.opener = null;
      }
      setIsOpeningSource(false);
      setIsOpen(false);
      return;
    }
    if (!sourceFile?.url) {
      setIsOpeningSource(false);
      return;
    }

    const viewer = window.open("about:blank", "_blank");
    if (viewer) {
      viewer.opener = null;
      viewer.document.title = sourceFile.original_filename;
      viewer.document.body.textContent = "Opening source file...";
    }
    try {
      const response = await fetch(mediaPath(sourceFile.url), { credentials: "include" });
      if (!response.ok) {
        throw new Error("Could not open the source file.");
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      if (viewer) {
        viewer.location.assign(blobUrl);
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      setIsOpen(false);
    } catch (error) {
      viewer?.close();
      window.alert(error instanceof Error ? error.message : "Could not open the source file.");
    } finally {
      setIsOpeningSource(false);
    }
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
            disabled={!canEditNote}
            title={!canEditNote ? cannotEditNoteMessage : undefined}
            onClick={() => void runAndClose(onEdit)}
          >
            <Edit3 size={15} />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canChangeNote}
            title={!canChangeNote ? cannotChangeNoteMessage : undefined}
            onClick={() => void runAndClose(onMove)}
          >
            <MoveNoteIcon size={15} />
            Move
          </button>
          <button type="button" role="menuitem" onClick={() => void runAndClose(onShare)}>
            <Share2 size={15} />
            Share
          </button>
          {note.source_files?.[0]?.url ? (
            <button
              type="button"
              role="menuitem"
              disabled={isOpeningSource}
              onClick={() => void openSourceFile()}
            >
              {isOpeningSource ? <Loader2 size={15} className="spin" /> : <Eye size={15} />}
              View Source
            </button>
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
