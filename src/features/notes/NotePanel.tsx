import { useCallback, useEffect, useRef, useState } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { apiFetch, mediaPath } from "../../api/client";
import type { NoteRecord, UserRecord } from "../../api/types";
import { isNoteJobActive, isNoteIndexing, noteBodyMarkdown, noteJobBadge } from "../../utils/notes";
import { AskMiaPanel } from "./AskMiaPanel";
import { NoteAuthorMeta } from "./NoteAuthorMeta";
import { NoteContent } from "./NoteContent";
import { NoteDocumentHeader } from "./NoteDocumentHeader";
import { NoteTagsManager } from "./NoteTagsManager";
import { NoteTitle } from "./NoteTitle";
import { useMiaPrompt } from "./useMiaPrompt";
import { useNoteTitle } from "./useNoteTitle";

export function NotePanel({
  note,
  workspaceName,
  folderLabel,
  currentUser,
  startInEdit = false,
  onClose,
  onRefresh,
  onEditModeChange,
  onMove,
  onShare,
  onDeleted
}: {
  note: NoteRecord;
  workspaceName: string;
  folderLabel: string;
  currentUser: UserRecord;
  startInEdit?: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onEditModeChange: (isEditing: boolean) => void;
  onMove: (note: NoteRecord) => void;
  onShare: (note: NoteRecord) => void;
  onDeleted: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [shouldFocusEditor, setShouldFocusEditor] = useState(false);
  const [draftText, setDraftText] = useState(noteBodyMarkdown(note.text ?? ""));
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const markdownEditorRef = useRef<MDXEditorMethods | null>(null);

  useEffect(() => {
    const shouldOpenInEdit = Boolean(startInEdit);
    setNoteError(null);
    setIsEditing(shouldOpenInEdit);
    setShouldFocusEditor(shouldOpenInEdit);
    setDraftText(noteBodyMarkdown(note.text ?? ""));
  }, [note?.id]);

  const handleEditorFocused = useCallback(() => {
    setShouldFocusEditor(false);
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setDraftText(noteBodyMarkdown(note.text ?? ""));
    }
  }, [isEditing, note.text]);

  const authorName = note.user?.name ?? "Unknown";
  const canChangeNote = currentUser.is_admin || note.user_id === currentUser.id || note.user?.id === currentUser.id;
  const canEditNote = canChangeNote && !isNoteJobActive(note);
  const cannotChangeNoteMessage = `Only ${authorName} or an admin can change this note.`;
  const cannotEditNoteMessage = isNoteJobActive(note) ? "Mia is still processing this note." : cannotChangeNoteMessage;
  const noteDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(note.created_at));
  const hasLoadedNoteText = typeof note.text === "string";
  const noteMarkdownBody = noteBodyMarkdown(note.text ?? "");
  const isIndexingNote = isNoteIndexing(note);
  const {
    titleDraft,
    isEditingTitle,
    setTitleDraft,
    startTitleEdit,
    cancelTitleEdit,
    saveTitle
  } = useNoteTitle({
    note,
    canChangeNote,
    cannotChangeNoteMessage,
    onError: setNoteError,
    onRefresh,
    setIsSaving
  });

  function currentEditorMarkdown() {
    if (!isEditing) return noteMarkdownBody;
    return markdownEditorRef.current?.getMarkdown() ?? draftText;
  }

  const {
    commentBody,
    miaResponse,
    miaError,
    isLoading,
    isApplyingMia,
    miaLoadingMessage,
    isMiaDisabled,
    setCommentBody,
    setMiaError,
    submitMiaPrompt,
    addComment,
    copyMiaResponse,
    applyMiaResponse
  } = useMiaPrompt({
    note,
    isEditing,
    isIndexingNote,
    canChangeNote,
    cannotChangeNoteMessage,
    editorRef: markdownEditorRef,
    currentEditorMarkdown,
    onDraftTextChange: setDraftText,
    onRefresh
  });

  async function uploadEditorImage(image: File) {
    if (!canChangeNote) {
      throw new Error(cannotChangeNoteMessage);
    }

    const formData = new FormData();
    formData.set("image", image);
    const response = await apiFetch<{ url: string }>(`/api/notes/${note.id}/images`, {
      method: "POST",
      body: formData
    });
    return mediaPath(response.url);
  }

  async function saveMarkdown() {
    if (!canChangeNote) {
      setNoteError(cannotChangeNoteMessage);
      return;
    }
    const nextText = currentEditorMarkdown();
    if (!nextText.trim()) {
      setNoteError("Please add some text before saving this note.");
      return;
    }

    setIsSaving(true);
    setNoteError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: nextText })
      });
      setDraftText(nextText);
      setMiaError(null);
      setIsEditing(false);
      onEditModeChange(false);
      await onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save note";
      setNoteError(
        message.includes("String should have at least 1 character")
          ? "Please add some text before saving this note."
          : message
      );
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!isEditing) return;

    function saveFromKeyboard(event: globalThis.KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (isSaving) return;
      void saveMarkdown();
    }

    window.addEventListener("keydown", saveFromKeyboard);
    return () => window.removeEventListener("keydown", saveFromKeyboard);
  }, [canChangeNote, draftText, isEditing, isSaving, note.id]);

  async function deleteNote() {
    if (!canChangeNote) {
      setNoteError(cannotChangeNoteMessage);
      return;
    }
    const confirmed = window.confirm(`Delete "${note.title}"? This cannot be undone.`);
    if (!confirmed) return;
    setIsDeleting(true);
    setNoteError(null);
    try {
      await apiFetch(`/api/notes/${note.id}`, { method: "DELETE" });
      await onDeleted();
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Could not delete note");
    } finally {
      setIsDeleting(false);
    }
  }

  function startEditing() {
    if (!canEditNote) {
      setNoteError(cannotEditNoteMessage);
      return;
    }
    setIsEditing(true);
    onEditModeChange(true);
  }

  function cancelEditing() {
    setDraftText(noteMarkdownBody);
    setIsEditing(false);
    onEditModeChange(false);
  }

  return (
    <section className={`note-panel ${isEditing ? "editing" : ""}`}>
      <NoteDocumentHeader
        note={note}
        workspaceName={workspaceName}
        folderLabel={folderLabel}
        isEditing={isEditing}
        isSaving={isSaving}
        isDeleting={isDeleting}
        canChangeNote={canChangeNote}
        cannotChangeNoteMessage={cannotChangeNoteMessage}
        canEditNote={canEditNote}
        cannotEditNoteMessage={cannotEditNoteMessage}
        onClose={onClose}
        onSave={saveMarkdown}
        onCancel={cancelEditing}
        onEdit={startEditing}
        onMove={() => onMove(note)}
        onShare={() => onShare(note)}
        onDelete={deleteNote}
      />
      {noteError && (
        <div className="notice danger note-panel-notice" role="alert">
          {noteError}
        </div>
      )}
      <NoteTitle
        title={note.title}
        jobBadge={noteJobBadge(note)}
        titleDraft={titleDraft}
        isEditing={isEditing}
        isEditingTitle={isEditingTitle}
        canChangeNote={canEditNote}
        onTitleDraftChange={setTitleDraft}
        onStartTitleEdit={startTitleEdit}
        onSaveTitle={saveTitle}
        onCancelTitleEdit={cancelTitleEdit}
      />
      <NoteAuthorMeta user={note.user} authorName={authorName} noteDate={noteDate} />
      <NoteContent
        note={note}
        isEditing={isEditing}
        isSaving={isSaving}
        draftText={draftText}
        noteMarkdownBody={noteMarkdownBody}
        hasLoadedNoteText={hasLoadedNoteText}
        canChangeNote={canEditNote}
        cannotChangeNoteMessage={cannotEditNoteMessage}
        editorRef={markdownEditorRef}
        autoFocusEditor={shouldFocusEditor}
        onDraftTextChange={setDraftText}
        onEditorFocused={handleEditorFocused}
        onSave={() => void saveMarkdown()}
        imageUploadHandler={uploadEditorImage}
      />
      <div className="note-section-divider" />
      <AskMiaPanel
        noteId={note.id}
        commentBody={commentBody}
        miaResponse={miaResponse}
        miaError={miaError}
        isLoading={isLoading}
        isIndexingNote={isIndexingNote}
        isMiaDisabled={isMiaDisabled}
        isApplyingMia={isApplyingMia}
        canChangeNote={canEditNote}
        cannotChangeNoteMessage={cannotEditNoteMessage}
        miaLoadingMessage={miaLoadingMessage}
        onCommentBodyChange={setCommentBody}
        onClearEmptyPromptError={() => setMiaError(null)}
        onSubmit={addComment}
        onSubmitPrompt={submitMiaPrompt}
        onCopyResponse={copyMiaResponse}
        onApplyResponse={applyMiaResponse}
      />
      <div className="note-section-divider" />
      <NoteTagsManager
        note={note}
        canChangeNote={canEditNote}
        cannotChangeNoteMessage={cannotEditNoteMessage}
        onRefresh={onRefresh}
      />
    </section>
  );
}
