import { Download, Settings, X } from "lucide-react";
import type { NoteRecord, UserRecord } from "../../api/types";
import { Modal } from "../../components/ui/Modal";
import { noteBodyMarkdown } from "../../utils/notes";

type ShareNoteDialogProps = {
  note: NoteRecord;
  currentUser: UserRecord;
  onClose: () => void;
  onOpenSettings: () => void;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadPdfFromBrowser(note: NoteRecord) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    window.print();
    return;
  }
  const noteText = noteBodyMarkdown(note.text ?? note.summary ?? "");
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(note.title)}</title>
        <style>
          body { color: #17181d; font: 16px/1.55 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 48px; }
          h1 { font-size: 32px; line-height: 1.2; margin: 0 0 24px; }
          pre { white-space: pre-wrap; font: inherit; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(note.title)}</h1>
        <pre>${escapeHtml(noteText)}</pre>
        <script>window.print();</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function ShareNoteDialog({
  note,
  currentUser,
  onClose,
  onOpenSettings
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
          <button className="primary-button share-note-primary" type="button" onClick={() => downloadPdfFromBrowser(note)}>
            <Download size={18} />
            Download PDF
          </button>
        )}
        {currentUser.is_admin ? (
          <button className="secondary-action share-note-secondary" type="button" onClick={() => downloadPdfFromBrowser(note)}>
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
