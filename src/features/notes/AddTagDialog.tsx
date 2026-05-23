import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

type AddTagDialogProps = {
  existingTags: string[];
  onClose: () => void;
  onAdd: (name: string) => Promise<boolean>;
};

export function AddTagDialog({ existingTags, onClose, onAdd }: AddTagDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const cleanName = name.trim();
  const tagExists = existingTags.some((tag) => tag.toLowerCase() === cleanName.toLowerCase());
  const canAddTag = cleanName.length >= 2 && !tagExists;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (cleanName.length < 2) {
      setError("Tags need at least 2 characters.");
      return;
    }
    if (tagExists) {
      setError("This note already has that tag.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const didAddTag = await onAdd(cleanName);
      if (!didAddTag) setError("Could not add tag.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal folder-modal" onSubmit={submit}>
        <div className="folder-modal-header">
          <div>
            <h2>Add tag</h2>
            <p>Tags help people filter and find related notes.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="folder-modal-body">
          <label className="field-label">
            <span>Tag name</span>
            <input autoFocus required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          {error && (
            <div className="notice danger modal-notice" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="folder-modal-actions">
          <button className="primary-button create-folder-button" disabled={isSaving || !canAddTag}>
            {isSaving ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
            Add tag
          </button>
          <button className="text-button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
