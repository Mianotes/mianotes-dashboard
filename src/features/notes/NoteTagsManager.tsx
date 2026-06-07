import { useState } from "react";
import { apiFetch } from "../../api/client";
import type { NoteRecord } from "../../api/types";
import { AddTagDialog } from "./AddTagDialog";
import { NoteTagsSection } from "./NoteTagsSection";

type NoteTagsManagerProps = {
  note: NoteRecord;
  workspaceId: string | null;
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  onRefresh: () => Promise<void>;
};

export function NoteTagsManager({
  note,
  workspaceId,
  canChangeNote,
  cannotChangeNoteMessage,
  onRefresh
}: NoteTagsManagerProps) {
  const [tagError, setTagError] = useState<string | null>(null);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const noteTags = note.tags ?? [];

  async function addTag(tagName: string) {
    if (!canChangeNote) {
      setTagError(cannotChangeNoteMessage);
      return false;
    }
    if (noteTags.length >= 5) return false;

    const normalizedTagName = tagName.trim();
    if (!normalizedTagName) return false;

    const nextTags = Array.from(new Set([...noteTags.map((tag) => tag.name), normalizedTagName])).slice(0, 5);
    setTagError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}/tags`, {
        method: "PUT",
        workspaceId,
        body: JSON.stringify({ tags: nextTags })
      });
      await onRefresh();
      return true;
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Could not add tag");
      return false;
    }
  }

  async function removeTag(tagName: string) {
    if (!canChangeNote) {
      setTagError(cannotChangeNoteMessage);
      return;
    }

    const nextTags = noteTags.map((tag) => tag.name).filter((name) => name !== tagName);
    setTagError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}/tags`, {
        method: "PUT",
        workspaceId,
        body: JSON.stringify({ tags: nextTags })
      });
      await onRefresh();
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Could not remove tag");
    }
  }

  return (
    <>
      <NoteTagsSection
        tags={noteTags}
        canChangeNote={canChangeNote}
        cannotChangeNoteMessage={cannotChangeNoteMessage}
        tagError={tagError}
        onAddTagClick={() => {
          setTagError(null);
          setIsTagDialogOpen(true);
        }}
        onRemoveTag={removeTag}
      />
      {isTagDialogOpen && (
        <AddTagDialog
          existingTags={noteTags.map((tag) => tag.name)}
          onClose={() => setIsTagDialogOpen(false)}
          onAdd={async (tagName) => {
            const didAddTag = await addTag(tagName);
            if (didAddTag) setIsTagDialogOpen(false);
            return didAddTag;
          }}
        />
      )}
    </>
  );
}
