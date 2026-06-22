import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../api/client";
import type { NoteRecord } from "../../api/types";

type UseNoteTitleArgs = {
  note: NoteRecord;
  workspaceId: string | null;
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  onError: (message: string | null) => void;
  onRefresh: () => Promise<void>;
  setIsSaving: (isSaving: boolean) => void;
};

export function useNoteTitle({
  note,
  workspaceId,
  canChangeNote,
  cannotChangeNoteMessage,
  onError,
  onRefresh,
  setIsSaving
}: UseNoteTitleArgs) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(note.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const isSavingTitleRef = useRef(false);

  useEffect(() => {
    if (isSavingTitle) return;
    setIsEditingTitle(false);
    setTitleDraft(note.title);
  }, [isSavingTitle, note.id, note.title]);

  useEffect(() => {
    if (!isEditingTitle && !isSavingTitle) {
      setTitleDraft(note.title);
    }
  }, [isEditingTitle, isSavingTitle, note.title]);

  function startTitleEdit() {
    if (isSavingTitle) return;
    onError(null);
    setTitleDraft(note.title);
    setIsEditingTitle(true);
  }

  function cancelTitleEdit() {
    if (isSavingTitle) return;
    setTitleDraft(note.title);
    setIsEditingTitle(false);
    onError(null);
  }

  async function saveTitle() {
    if (isSavingTitleRef.current) return;

    if (!canChangeNote) {
      onError(cannotChangeNoteMessage);
      setIsEditingTitle(false);
      return;
    }

    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      onError("Note title cannot be empty.");
      return;
    }

    if (nextTitle === note.title) {
      setIsEditingTitle(false);
      return;
    }

    isSavingTitleRef.current = true;
    setIsSavingTitle(true);
    setIsSaving(true);
    onError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}`, {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({ title: nextTitle })
      });
      setIsEditingTitle(false);
      await onRefresh();
    } catch (err) {
      setTitleDraft(note.title);
      setIsEditingTitle(false);
      onError(err instanceof Error ? err.message : "Could not save note title");
    } finally {
      isSavingTitleRef.current = false;
      setIsSavingTitle(false);
      setIsSaving(false);
    }
  }

  return {
    titleDraft,
    isEditingTitle,
    isSavingTitle,
    setTitleDraft,
    startTitleEdit,
    cancelTitleEdit,
    saveTitle
  };
}
