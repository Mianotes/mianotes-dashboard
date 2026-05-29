import { FileText, Link, Loader2, Plus, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import type { DragEvent, FormEvent, KeyboardEvent } from "react";
import { apiFetch } from "../../api/client";
import type { FolderRecord, NoteRecord } from "../../api/types";
import { Modal, ModalActions } from "../../components/ui/Modal";

const supportedUploadAccept = [
  ".csv",
  ".doc",
  ".docx",
  ".htm",
  ".html",
  ".jpeg",
  ".jpg",
  ".m4a",
  ".md",
  ".markdown",
  ".mp3",
  ".mp4",
  ".odt",
  ".pdf",
  ".png",
  ".rtf",
  ".tif",
  ".tiff",
  ".txt",
  ".wav"
].join(",");

export function AddNoteDialog({
  folders,
  selectedFolderId,
  onClose,
  onCreated,
  onError
}: {
  folders: FolderRecord[];
  selectedFolderId: string | "all";
  onClose: () => void;
  onCreated: (note: NoteRecord, shouldEdit: boolean) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [mode, setMode] = useState<"text" | "link" | "file">("text");
  const shouldChooseFolder = selectedFolderId === "all";
  const [folderId, setFolderId] = useState(shouldChooseFolder ? "" : selectedFolderId);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cleanTitle = title.trim();
  const cleanUrl = url.trim();
  const canCreate =
    Boolean(folderId)
    && (
      (mode === "text" && cleanTitle.length > 0)
      || (mode === "link" && cleanTitle.length > 0 && cleanUrl.length > 0)
      || (mode === "file" && cleanTitle.length > 0 && Boolean(file))
    );

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
  }

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    openFilePicker();
  }

  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    if (droppedFile) {
      selectFile(droppedFile);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canCreate) return;
    setIsSaving(true);
    onError(null);
    try {
      let createdNote: NoteRecord;
      let shouldEdit = false;
      if (mode === "text") {
        createdNote = await apiFetch<NoteRecord>("/api/notes/from-text", {
          method: "POST",
          body: JSON.stringify({ folder_id: folderId, title: cleanTitle, text: text.trim() || " " })
        });
        shouldEdit = true;
      } else if (mode === "link") {
        createdNote = await apiFetch<NoteRecord>("/api/notes/from-url", {
          method: "POST",
          body: JSON.stringify({ folder_id: folderId, title: cleanTitle, url: cleanUrl })
        });
      } else if (file) {
        const formData = new FormData();
        formData.set("folder_id", folderId);
        formData.set("title", cleanTitle);
        formData.set("file", file);
        createdNote = await apiFetch<NoteRecord>("/api/notes/from-file", { method: "POST", body: formData });
      } else {
        return;
      }
      await onCreated(createdNote, shouldEdit);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal as="form" className="folder-modal add-note-modal" labelledBy="add-note-title" onClose={onClose} onSubmit={submit}>
        <div className="folder-modal-header">
          <div>
            <h2 id="add-note-title">Add note</h2>
            <p>Create a note, index a link, upload a document or audio file.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="folder-modal-body">
          <div className="segmented" aria-label="Note source type">
            <button type="button" className={mode === "text" ? "selected" : ""} onClick={() => setMode("text")}><FileText size={17} />Text</button>
            <button type="button" className={mode === "link" ? "selected" : ""} onClick={() => setMode("link")}><Link size={17} />Link</button>
            <button type="button" className={mode === "file" ? "selected" : ""} onClick={() => setMode("file")}><Upload size={17} />File</button>
          </div>
          {shouldChooseFolder && (
            <label className="field-label">
              <span>Folder</span>
              <select value={folderId} onChange={(event) => setFolderId(event.target.value)} required>
                <option value="">Choose a folder</option>
                {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
              </select>
            </label>
          )}
          {mode === "link" && (
            <label className="field-label">
              <span>URL</span>
              <input
                autoFocus
                required
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/article"
              />
            </label>
          )}
          <label className="field-label">
            <span>Title</span>
            <input
              autoFocus={mode !== "link"}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            {mode === "link" && (
              <small className="field-help">
                Mia will save a draft now, then replace it with the page contents once indexing is complete.
              </small>
            )}
          </label>
          {mode === "text" && (
            <label className="field-label">
              <span>Text (optional)</span>
              <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste notes, agent output, or rough thoughts" />
            </label>
          )}
          {mode === "file" && (
            <div className="field-label">
              <span>File</span>
              <div
                className={`file-dropzone${isDraggingFile ? " is-dragging" : ""}`}
                role="button"
                tabIndex={0}
                onClick={openFilePicker}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={dropFile}
                onKeyDown={handleFileDropzoneKeyDown}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={supportedUploadAccept}
                  onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                />
                {!file ? (
                  <span className="file-dropzone-empty">
                    <Upload size={20} />
                    <strong>Drop a file here or browse</strong>
                    <small>PDF, Word, Excel, CSV, images, audio, and video files are supported.</small>
                  </span>
                ) : (
                  <span className="file-chip">
                    <span className="file-chip-name">{file.name}</span>
                    <button
                      type="button"
                      className="file-chip-remove"
                      aria-label="Remove file"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        clearFile();
                      }}
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <ModalActions
          onCancel={onClose}
          primaryClassName="create-note-button"
          primaryDisabled={isSaving || !canCreate}
          primaryIcon={isSaving ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
          primaryLabel="Create note"
          primaryType="submit"
        />
    </Modal>
  );
}
