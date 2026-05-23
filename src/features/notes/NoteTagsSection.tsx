import { Plus, X } from "lucide-react";
import type { TagRecord } from "../../api/types";

type NoteTagsSectionProps = {
  tags: TagRecord[];
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  tagError: string | null;
  onAddTagClick: () => void;
  onRemoveTag: (tagName: string) => void | Promise<void>;
};

export function NoteTagsSection({
  tags,
  canChangeNote,
  cannotChangeNoteMessage,
  tagError,
  onAddTagClick,
  onRemoveTag
}: NoteTagsSectionProps) {
  return (
    <section className="note-tags-section">
      <h3>Tags</h3>
      <div className="note-document-tags">
        {tags.map((tag) => (
          <span className="tag-chip" key={tag.id}>
            <span className="tag-pill">{tag.name}</span>
            {canChangeNote && (
              <button
                className="tag-remove-button"
                type="button"
                aria-label={`Remove ${tag.name} tag`}
                onClick={() => void onRemoveTag(tag.name)}
              >
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {tags.length < 5 && (
          <button
            className="tag-add-button"
            type="button"
            aria-label="Add tag"
            disabled={!canChangeNote}
            title={!canChangeNote ? cannotChangeNoteMessage : undefined}
            onClick={onAddTagClick}
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      {tagError && (
        <div className="notice danger section-notice" role="alert">
          {tagError}
        </div>
      )}
    </section>
  );
}
