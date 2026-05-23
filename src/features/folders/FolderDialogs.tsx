import { Edit3, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { apiFetch } from "../../api/client";
import type { FolderRecord } from "../../api/types";
import { Modal } from "../../components/ui/Modal";

export function AddFolderDialog({
  onClose,
  onCreated,
  onError
}: {
  onClose: () => void;
  onCreated: (folder: FolderRecord) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canCreateFolder = name.trim().length >= 3;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    onError(null);
    try {
      const folder = await apiFetch<FolderRecord>("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name, is_pinned: isPinned })
      });
      await onCreated(folder);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not add folder");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal as="form" className="folder-modal" labelledBy="add-folder-title" onClose={onClose} onSubmit={submit}>
        <div className="folder-modal-header">
          <div>
            <h2 id="add-folder-title">Add folder</h2>
            <p>Anyone signed in can view this folder and add notes to it.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="folder-modal-body">
          <label className="field-label">
            <span>Folder name</span>
            <input
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="checkbox-card">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(event) => setIsPinned(event.target.checked)}
            />
            <span>
              <strong>Pin to top</strong>
              <small>Keep this folder above the rest of the list.</small>
            </span>
          </label>
        </div>
        <div className="folder-modal-actions">
          <button className="primary-button create-folder-button" disabled={isSaving || !canCreateFolder}>
            {isSaving ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
            Create folder
          </button>
          <button className="text-button" type="button" onClick={onClose}>Cancel</button>
        </div>
    </Modal>
  );
}

export function RenameFolderDialog({
  folder,
  onClose,
  onRename
}: {
  folder: FolderRecord;
  onClose: () => void;
  onRename: (name: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const cleanName = name.trim();
  const canRename = cleanName.length >= 3 && cleanName !== folder.name;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canRename) return;

    setError(null);
    setIsSaving(true);
    try {
      const result = await onRename(cleanName);
      if (!result.ok) setError(result.error ?? "Could not rename folder.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal as="form" className="folder-modal" labelledBy="rename-folder-title" onClose={onClose} onSubmit={submit}>
        <div className="folder-modal-header">
          <div>
            <h2 id="rename-folder-title">Rename folder</h2>
            <p>Update the folder name shown to everyone signed in.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="folder-modal-body">
          <label className="field-label">
            <span>Folder name</span>
            <input
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {error && (
            <div className="notice danger modal-notice" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="folder-modal-actions">
          <button className="primary-button create-folder-button" disabled={isSaving || !canRename}>
            {isSaving ? <Loader2 className="spin" size={17} /> : <Edit3 size={17} />}
            Save changes
          </button>
          <button className="text-button" type="button" onClick={onClose}>Cancel</button>
        </div>
    </Modal>
  );
}
