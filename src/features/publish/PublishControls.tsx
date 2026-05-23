import { Loader2 } from "lucide-react";
import type { FolderRecord, PublishThemeRecord, TagRecord } from "../../api/types";

type PublishControlsProps = {
  folders: FolderRecord[];
  folderId: string | "all";
  isLoadingThemes: boolean;
  isPreparing: boolean;
  isPublishing: boolean;
  tagId: string | "all";
  tags: TagRecord[];
  theme: string;
  themes: PublishThemeRecord[];
  onContinue: () => void;
  onFolderChange: (folderId: string) => void;
  onTagChange: (tagId: string) => void;
  onThemeChange: (theme: string) => void;
};

export function PublishControls({
  folders,
  folderId,
  isLoadingThemes,
  isPreparing,
  isPublishing,
  tagId,
  tags,
  theme,
  themes,
  onContinue,
  onFolderChange,
  onTagChange,
  onThemeChange
}: PublishControlsProps) {
  return (
    <div className="publish-controls">
      <label>
        Folder
        <select value={folderId} onChange={(event) => onFolderChange(event.target.value)}>
          <option value="all">All folders</option>
          {folders.map((folder) => (
            <option value={folder.id} key={folder.id}>{folder.name}</option>
          ))}
        </select>
      </label>
      <label>
        Tags
        <select value={tagId} onChange={(event) => onTagChange(event.target.value)}>
          <option value="all">All tags</option>
          {tags.map((tag) => (
            <option value={tag.id} key={tag.id}>{tag.name}</option>
          ))}
        </select>
      </label>
      <label>
        Theme
        <select
          value={theme}
          onChange={(event) => onThemeChange(event.target.value)}
          disabled={isLoadingThemes}
        >
          {themes.map((item) => (
            <option value={item.id} key={item.id}>{item.name}</option>
          ))}
        </select>
      </label>
      <button
        className="primary-action"
        type="button"
        onClick={onContinue}
        disabled={isLoadingThemes || isPreparing || isPublishing}
      >
        {isPreparing ? <Loader2 className="spin" size={16} /> : null}
        Continue
      </button>
    </div>
  );
}
