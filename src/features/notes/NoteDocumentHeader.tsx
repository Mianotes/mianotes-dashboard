import { ChevronLeft, Edit3, Loader2 } from "lucide-react";
import type { NoteRecord } from "../../api/types";
import { Breadcrumb } from "../../components/layout/Breadcrumb";
import { NoteActionsMenu } from "./NoteActionsMenu";

type NoteDocumentHeaderProps = {
  note: NoteRecord;
  workspaceName: string;
  folderLabel: string;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  canEditNote: boolean;
  cannotEditNoteMessage: string;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  onEdit: () => void;
  onMove: () => void;
  onShare: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
};

export function NoteDocumentHeader({
  note,
  workspaceName,
  folderLabel,
  isEditing,
  isSaving,
  isDeleting,
  canChangeNote,
  cannotChangeNoteMessage,
  canEditNote,
  cannotEditNoteMessage,
  onClose,
  onSave,
  onCancel,
  onEdit,
  onMove,
  onShare,
  onDelete
}: NoteDocumentHeaderProps) {
  return (
    <div className="note-document-header">
      <button className="back-square-button" onClick={onClose} aria-label="Back to notes">
        <ChevronLeft size={16} />
      </button>
      <Breadcrumb
        className="note-document-breadcrumb"
        items={[
          { label: workspaceName },
          { label: folderLabel, current: true }
        ]}
      />
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
              disabled={!canEditNote}
              title={!canEditNote ? cannotEditNoteMessage : undefined}
              onClick={onEdit}
            >
              <Edit3 size={16} />
              Edit
            </button>
            <NoteActionsMenu
              note={note}
              canChangeNote={canChangeNote}
              cannotChangeNoteMessage={cannotChangeNoteMessage}
              canEditNote={canEditNote}
              cannotEditNoteMessage={cannotEditNoteMessage}
              isDeleting={isDeleting}
              onEdit={onEdit}
              onMove={onMove}
              onShare={onShare}
              onDelete={onDelete}
            />
          </>
        )}
      </div>
    </div>
  );
}
