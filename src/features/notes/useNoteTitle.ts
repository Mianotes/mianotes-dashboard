import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import type { NoteRecord } from "../../api/types";

type UseNoteTitleArgs = {
  note: NoteRecord;
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  onError: (message: string | null) => void;
  onRefresh: () => Promise<void>;
  setIsSaving: (isSaving: boolean) => void;
};

export function useNoteTitle({
  note,
  canChangeNote,
  cannotChangeNoteMessage,
  onError,
  onRefresh,
  setIsSaving
}: UseNoteTitleArgs) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(note.title);

  useEffect(() => {
    setIsEditingTitle(false);
    setTitleDraft(note.title);
  }, [note.id, note.title]);

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleDraft(note.title);
    }
  }, [isEditingTitle, note.title]);

  function startTitleEdit() {
    onError(null);
    setTitleDraft(note.title);
    setIsEditingTitle(true);
  }

  function cancelTitleEdit() {
    setTitleDraft(note.title);
    setIsEditingTitle(false);
    onError(null);
  }

  async function saveTitle() {
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

    setIsSaving(true);
    onError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: nextTitle })
      });
      setIsEditingTitle(false);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save note title");
    } finally {
      setIsSaving(false);
    }
  }

  return {
    titleDraft,
    isEditingTitle,
    setTitleDraft,
    startTitleEdit,
    cancelTitleEdit,
    saveTitle
  };
}
