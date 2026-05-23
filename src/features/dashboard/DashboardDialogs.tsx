import type { FolderRecord, NoteRecord } from "../../api/types";
import { AddFolderDialog, RenameFolderDialog } from "../folders/FolderDialogs";
import { AddNoteDialog } from "../notes/AddNoteDialog";

type FolderUpdateResult = { ok: true } | { ok: false; error: string };

type DashboardDialogsProps = {
  isAddOpen: boolean;
  folders: FolderRecord[];
  selectedFolderId: string | "all";
  onCloseAdd: () => void;
  onNoteCreated: (note: NoteRecord, shouldEdit: boolean) => Promise<void>;
  onNoteError: (message: string | null) => void;
  isFolderOpen: boolean;
  onCloseFolder: () => void;
  onFolderCreated: (folder: FolderRecord) => Promise<void>;
  onFolderError: (message: string | null) => void;
  renamingFolder: FolderRecord | null;
  onCloseRenameFolder: () => void;
  onRenameFolder: (name: string) => Promise<FolderUpdateResult>;
};

export function DashboardDialogs({
  isAddOpen,
  folders,
  selectedFolderId,
  onCloseAdd,
  onNoteCreated,
  onNoteError,
  isFolderOpen,
  onCloseFolder,
  onFolderCreated,
  onFolderError,
  renamingFolder,
  onCloseRenameFolder,
  onRenameFolder
}: DashboardDialogsProps) {
  return (
    <>
      {isAddOpen && (
        <AddNoteDialog
          folders={folders}
          selectedFolderId={selectedFolderId}
          onClose={onCloseAdd}
          onCreated={onNoteCreated}
          onError={onNoteError}
        />
      )}
      {isFolderOpen && (
        <AddFolderDialog
          onClose={onCloseFolder}
          onCreated={onFolderCreated}
          onError={onFolderError}
        />
      )}
      {renamingFolder && (
        <RenameFolderDialog
          folder={renamingFolder}
          onClose={onCloseRenameFolder}
          onRename={onRenameFolder}
        />
      )}
    </>
  );
}
