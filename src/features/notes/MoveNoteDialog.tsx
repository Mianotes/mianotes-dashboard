import { FolderInput, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { FolderRecord, NoteRecord } from "../../api/types";
import { Modal } from "../../components/ui/Modal";

type MoveNoteResult = { ok: true } | { ok: false; error: string };

type MoveNoteDialogProps = {
  note: NoteRecord;
  folders: FolderRecord[];
  onClose: () => void;
  onMove: (note: NoteRecord, folderId: string) => Promise<MoveNoteResult>;
};

export function MoveNoteDialog({
  note,
  folders,
  onClose,
  onMove
}: MoveNoteDialogProps) {
  const currentFolderId = note.folder_id ?? note.folder?.id;
  const folderOptions = useMemo(
    () => folders.filter((folder) => folder.id !== currentFolderId),
    [currentFolderId, folders]
  );
  const [folderId, setFolderId] = useState(folderOptions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const canMove = Boolean(folderId) && folderId !== currentFolderId;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canMove) return;

    setError(null);
    setIsMoving(true);
    try {
      const result = await onMove(note, folderId);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error);
      }
    } finally {
      setIsMoving(false);
    }
  }

  return (
    <Modal as="form" className="folder-modal move-note-modal" labelledBy="move-note-title" onClose={onClose} onSubmit={submit}>
      <div className="folder-modal-header">
        <div>
          <h2 id="move-note-title">Move note</h2>
          <p>Choose the folder where this note should live.</p>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <div className="folder-modal-body">
        <label className="field-label">
          <span>Folder</span>
          <select
            autoFocus
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            required
          >
            {folderOptions.length === 0 ? (
              <option value="">No other folders available</option>
            ) : (
              folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))
            )}
          </select>
        </label>
        {error && (
          <div className="notice danger modal-notice" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="folder-modal-actions">
        <button className="primary-button move-note-button" disabled={isMoving || !canMove}>
          {isMoving ? <Loader2 className="spin" size={17} /> : <FolderInput size={17} />}
          Move note
        </button>
        <button className="text-button" type="button" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

export type { MoveNoteResult };
