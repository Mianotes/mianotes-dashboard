import { Loader2 } from "lucide-react";

type NoteTitleProps = {
  title: string;
  jobBadge: { label: string; tone: "blue" | "danger" } | null;
  titleDraft: string;
  isEditing: boolean;
  isEditingTitle: boolean;
  isSavingTitle: boolean;
  canChangeNote: boolean;
  onTitleDraftChange: (value: string) => void;
  onStartTitleEdit: () => void;
  onSaveTitle: () => void | Promise<void>;
  onCancelTitleEdit: () => void;
};

export function NoteTitle({
  title,
  jobBadge,
  titleDraft,
  isEditing,
  isEditingTitle,
  isSavingTitle,
  canChangeNote,
  onTitleDraftChange,
  onStartTitleEdit,
  onSaveTitle,
  onCancelTitleEdit
}: NoteTitleProps) {
  return (
    <div className="note-document-title">
      {isEditingTitle ? (
        <div className="note-title-edit-row">
          <input
            className="note-title-input"
            value={titleDraft}
            autoFocus
            disabled={isSavingTitle}
            onChange={(event) => onTitleDraftChange(event.target.value)}
            onBlur={() => {
              if (!isSavingTitle) void onSaveTitle();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onSaveTitle();
              }
              if (event.key === "Escape" && !isSavingTitle) {
                onCancelTitleEdit();
              }
            }}
          />
          {isSavingTitle && (
            <Loader2
              className="spin note-title-spinner"
              size={18}
              aria-label="Saving title"
            />
          )}
        </div>
      ) : (
        <div className="note-title-row">
          <h1
            className={isEditing && canChangeNote ? "editable-note-title" : undefined}
            title={isEditing && canChangeNote ? "Click to edit title" : undefined}
            onClick={() => {
              if (!isEditing || !canChangeNote) return;
              onStartTitleEdit();
            }}
          >
            {title}
          </h1>
          {jobBadge && <span className={`badge ${jobBadge.tone}`}>{jobBadge.label}</span>}
        </div>
      )}
    </div>
  );
}
