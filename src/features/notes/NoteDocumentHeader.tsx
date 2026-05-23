import { ChevronLeft, ChevronRight, Edit3, Loader2 } from "lucide-react";
import type { NoteRecord } from "../../api/types";
import { NoteActionsMenu } from "./NoteActionsMenu";

type NoteDocumentHeaderProps = {
  note: NoteRecord;
  folderLabel: string;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  onEdit: () => void;
  onShare: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
};

export function NoteDocumentHeader({
  note,
  folderLabel,
  isEditing,
  isSaving,
  isDeleting,
  canChangeNote,
  cannotChangeNoteMessage,
  onClose,
  onSave,
  onCancel,
  onEdit,
  onShare,
  onDelete
}: NoteDocumentHeaderProps) {
  return (
    <div className="note-document-header">
      <button className="back-square-button" onClick={onClose} aria-label="Back to notes">
        <ChevronLeft size={16} />
      </button>
      <div className="note-document-breadcrumb">
        <span>Folder</span>
        <span className="current">
          <ChevronRight size={14} />
          {folderLabel}
        </span>
      </div>
      <div className="panel-actions">
        {isEditing ? (
          <>
            <button className="primary-button compact save-note-button" type="button" disabled={isSaving} onClick={() => void onSave()}>
              {isSaving ? <Loader2 className="spin" size={15} /> : null}
              Save
            </button>
            <button className="text-button compact" type="button" onClick={onCancel}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="secondary-action-button"
              type="button"
              disabled={!canChangeNote}
              title={!canChangeNote ? cannotChangeNoteMessage : undefined}
              onClick={onEdit}
            >
              <Edit3 size={16} />
              Edit
            </button>
            <NoteActionsMenu
              note={note}
              canChangeNote={canChangeNote}
              cannotChangeNoteMessage={cannotChangeNoteMessage}
              isDeleting={isDeleting}
              onEdit={onEdit}
              onShare={onShare}
              onDelete={onDelete}
            />
          </>
        )}
      </div>
    </div>
  );
}
