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

function TextNoteIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 3.99998H6.8C5.11984 3.99998 4.27976 3.99998 3.63803 4.32696C3.07354 4.61458 2.6146 5.07353 2.32698 5.63801C2 6.27975 2 7.11983 2 8.79998V17.2C2 18.8801 2 19.7202 2.32698 20.362C2.6146 20.9264 3.07354 21.3854 3.63803 21.673C4.27976 22 5.11984 22 6.8 22H15.2C16.8802 22 17.7202 22 18.362 21.673C18.9265 21.3854 19.3854 20.9264 19.673 20.362C20 19.7202 20 18.8801 20 17.2V13M7.99997 16H9.67452C10.1637 16 10.4083 16 10.6385 15.9447C10.8425 15.8957 11.0376 15.8149 11.2166 15.7053C11.4184 15.5816 11.5914 15.4086 11.9373 15.0627L21.5 5.49998C22.3284 4.67156 22.3284 3.32841 21.5 2.49998C20.6716 1.67156 19.3284 1.67155 18.5 2.49998L8.93723 12.0627C8.59133 12.4086 8.41838 12.5816 8.29469 12.7834C8.18504 12.9624 8.10423 13.1574 8.05523 13.3615C7.99997 13.5917 7.99997 13.8363 7.99997 14.3255V16Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
            <button type="button" className={mode === "text" ? "selected" : ""} onClick={() => setMode("text")}><TextNoteIcon />Text</button>
            <button type="button" className={mode === "link" ? "selected" : ""} onClick={() => setMode("link")}><Link size={17} />Link</button>
            <button type="button" className={mode === "file" ? "selected" : ""} onClick={() => setMode("file")}><FileText size={17} />File</button>
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
