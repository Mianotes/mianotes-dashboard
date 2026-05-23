type NoteTitleProps = {
  title: string;
  titleDraft: string;
  isEditing: boolean;
  isEditingTitle: boolean;
  canChangeNote: boolean;
  onTitleDraftChange: (value: string) => void;
  onStartTitleEdit: () => void;
  onSaveTitle: () => void | Promise<void>;
  onCancelTitleEdit: () => void;
};

export function NoteTitle({
  title,
  titleDraft,
  isEditing,
  isEditingTitle,
  canChangeNote,
  onTitleDraftChange,
  onStartTitleEdit,
  onSaveTitle,
  onCancelTitleEdit
}: NoteTitleProps) {
  return (
    <div className="note-document-title">
      {isEditingTitle ? (
        <input
          className="note-title-input"
          value={titleDraft}
          autoFocus
          onChange={(event) => onTitleDraftChange(event.target.value)}
          onBlur={() => void onSaveTitle()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void onSaveTitle();
            }
            if (event.key === "Escape") {
              onCancelTitleEdit();
            }
          }}
        />
      ) : (
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
      )}
    </div>
  );
}
