import { Download, Settings, X } from "lucide-react";
import type { NoteRecord, UserRecord } from "../../api/types";
import { Modal } from "../../components/ui/Modal";

type ShareNoteDialogProps = {
  note: NoteRecord;
  currentUser: UserRecord;
  onClose: () => void;
  onOpenSettings: () => void;
  onDownloadPdf: (note: NoteRecord) => void;
};

export function ShareNoteDialog({
  note,
  currentUser,
  onClose,
  onOpenSettings,
  onDownloadPdf
}: ShareNoteDialogProps) {
  return (
    <Modal className="folder-modal share-note-modal" labelledBy="share-note-title" onClose={onClose}>
      <header className="folder-modal-header">
        <div>
          <h2 id="share-note-title">Share this note</h2>
          <p>
            This note is using a local Mianotes address, so the link may not work for other people.
          </p>
        </div>
        <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
          <X size={24} />
        </button>
      </header>
      <div className="folder-modal-body share-note-copy">
        <p>
          Add a public workspace address to create reliable links. Or download the note as a PDF and share it yourself.
        </p>
      </div>
      <div className="folder-modal-actions share-note-actions">
        {currentUser.is_admin ? (
          <button className="primary-button share-note-primary" type="button" onClick={onOpenSettings}>
            <Settings size={18} />
            Go to settings
          </button>
        ) : (
          <button className="primary-button share-note-primary" type="button" onClick={() => onDownloadPdf(note)}>
            <Download size={18} />
            Download PDF
          </button>
        )}
        {currentUser.is_admin ? (
          <button className="secondary-action share-note-secondary" type="button" onClick={() => onDownloadPdf(note)}>
            <Download size={18} />
            Download PDF
          </button>
        ) : null}
        <button className="text-button" type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
