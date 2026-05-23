import type { MDXEditorMethods } from "@mdxeditor/editor";
import { Loader2, Save } from "lucide-react";
import { lazy, Suspense } from "react";
import type { RefObject } from "react";
import type { NoteRecord } from "../../api/types";

const MarkdownViewer = lazy(() => import("../../MarkdownViewer"));
const MarkdownEditor = lazy(() => import("../../MarkdownViewer").then((module) => ({ default: module.MarkdownEditor })));

type NoteContentProps = {
  note: NoteRecord;
  isEditing: boolean;
  isSaving: boolean;
  draftText: string;
  noteMarkdownBody: string;
  hasLoadedNoteText: boolean;
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  editorRef: RefObject<MDXEditorMethods | null>;
  autoFocusEditor: boolean;
  onDraftTextChange: (markdown: string) => void;
  onEditorFocused: () => void;
  onSave: () => void;
  imageUploadHandler: (image: File) => Promise<string>;
};

export function NoteContent({
  note,
  isEditing,
  isSaving,
  draftText,
  noteMarkdownBody,
  hasLoadedNoteText,
  canChangeNote,
  cannotChangeNoteMessage,
  editorRef,
  autoFocusEditor,
  onDraftTextChange,
  onEditorFocused,
  onSave,
  imageUploadHandler
}: NoteContentProps) {
  const markdownEditorRef = editorRef as RefObject<MDXEditorMethods>;

  return (
    <>
      {isEditing ? (
        <div className="markdown-preview">
          <Suspense fallback={<div className="editor-loading">Loading editor...</div>}>
            <MarkdownEditor
              ref={markdownEditorRef}
              id={note.id}
              markdown={draftText}
              onChange={onDraftTextChange}
              imageUploadHandler={imageUploadHandler}
              autoFocus={autoFocusEditor}
              onAutoFocused={onEditorFocused}
            />
          </Suspense>
        </div>
      ) : (
        <div className="markdown-preview">
          <Suspense fallback={<div className="editor-loading">Loading note...</div>}>
            {hasLoadedNoteText ? (
              <MarkdownViewer
                id={note.id}
                updatedAt={note.updated_at}
                markdown={noteMarkdownBody}
              />
            ) : (
              <div className="editor-loading">Loading note...</div>
            )}
          </Suspense>
        </div>
      )}
      {isEditing && (
        <div className="note-bottom-save">
          <button
            className="bottom-save-button"
            type="button"
            disabled={isSaving || !canChangeNote}
            title={!canChangeNote ? cannotChangeNoteMessage : undefined}
            onClick={onSave}
          >
            {isSaving ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
            Save
          </button>
          <span>Press ⌘ + S on Mac or Ctrl + S on Windows and ChromeOS</span>
        </div>
      )}
    </>
  );
}
