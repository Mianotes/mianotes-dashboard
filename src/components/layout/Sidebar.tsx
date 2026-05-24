import { Activity, Edit3, MoreVertical, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import type { DragEvent, RefCallback } from "react";
import type { FolderRecord, StorageCapacityRecord, UserRecord, WorkspaceView } from "../../api/types";
import { DashboardIcon } from "../icons/DashboardIcon";
import { FolderIcon } from "../icons/FolderIcon";
import { PinIcon } from "../icons/PinIcon";
import { folderPermissionMessage } from "../../utils/folders";
import { formatStorageSize, mianotesStoragePercent } from "../../utils/format";
import { SidebarSection } from "./SidebarSection";

type SidebarProps = {
  isOpen: boolean;
  workspaceView: WorkspaceView;
  selectedFolderId: string;
  folders: FolderRecord[];
  notesByFolder: Record<string, number>;
  currentUser: UserRecord;
  openFolderMenuId: string | null;
  folderActionsMenuRef: RefCallback<HTMLDivElement>;
  storageCapacity?: StorageCapacityRecord | null;
  onAddNote: () => void;
  onSelectDashboard: () => void;
  onAddFolder: () => void;
  onSelectFolder: (folderId: string) => void;
  onToggleFolderMenu: (folderId: string) => void;
  onRenameFolder: (folder: FolderRecord) => void;
  onUpdateFolder: (folder: FolderRecord, update: Partial<Pick<FolderRecord, "name" | "is_pinned">>) => void;
  onReorderFolders: (folderIds: string[]) => void;
  onDeleteFolder: (folder: FolderRecord) => void;
  onJobs: () => void;
  onPublish: () => void;
};

export function Sidebar({
  isOpen,
  workspaceView,
  selectedFolderId,
  folders,
  notesByFolder,
  currentUser,
  openFolderMenuId,
  folderActionsMenuRef,
  storageCapacity,
  onAddNote,
  onSelectDashboard,
  onAddFolder,
  onSelectFolder,
  onToggleFolderMenu,
  onRenameFolder,
  onUpdateFolder,
  onReorderFolders,
  onDeleteFolder,
  onJobs,
  onPublish
}: SidebarProps) {
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    folderId: string;
    position: "before" | "after";
  } | null>(null);
  const canManageFolder = (folder: FolderRecord) => currentUser.is_admin || folder.user_id === currentUser.id;

  const resetDragState = () => {
    setDraggedFolderId(null);
    setDropTarget(null);
  };

  const reorderFolder = (event: DragEvent<HTMLDivElement>, targetFolder: FolderRecord) => {
    event.preventDefault();
    const draggedId = draggedFolderId ?? event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetFolder.id || targetFolder.is_pinned) {
      resetDragState();
      return;
    }

    const draggableFolderIds = folders
      .filter((folder) => !folder.is_pinned && canManageFolder(folder))
      .map((folder) => folder.id);
    if (!draggableFolderIds.includes(draggedId) || !draggableFolderIds.includes(targetFolder.id)) {
      resetDragState();
      return;
    }

    const remainingFolderIds = draggableFolderIds.filter((folderId) => folderId !== draggedId);
    const targetIndex = remainingFolderIds.indexOf(targetFolder.id);
    if (targetIndex < 0) {
      resetDragState();
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const dropAfterTarget = dropTarget?.folderId === targetFolder.id
      ? dropTarget.position === "after"
      : event.clientY > bounds.top + bounds.height / 2;
    const insertIndex = dropAfterTarget ? targetIndex + 1 : targetIndex;
    const nextFolderIds = [...remainingFolderIds];
    nextFolderIds.splice(insertIndex, 0, draggedId);
    resetDragState();

    if (nextFolderIds.join(":") !== draggableFolderIds.join(":")) {
      onReorderFolders(nextFolderIds);
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
      <button className="add-note-button" onClick={onAddNote}>
        <Plus size={19} />
        <span>Add Note</span>
      </button>

      <nav className="nav-group" aria-label="Dashboard navigation">
        <button
          className={`nav-item ${workspaceView === "notes" && selectedFolderId === "all" ? "active" : ""}`}
          onClick={onSelectDashboard}
        >
          <DashboardIcon size={18} />
          <span>Dashboard</span>
        </button>
        <button
          className={`nav-item ${workspaceView === "jobs" ? "active" : ""}`}
          onClick={onJobs}
        >
          <Activity size={18} />
          <span>Jobs</span>
        </button>
      </nav>

      <SidebarSection
        title="Folders"
        action={<button className="icon-button" aria-label="Add folder" onClick={onAddFolder}><Plus size={15} /></button>}
      >
        {folders.map((folder) => {
          const canManageThisFolder = canManageFolder(folder);
          const canDragThisFolder = canManageThisFolder && !folder.is_pinned;
          const dropClass = dropTarget?.folderId === folder.id
            ? ` drop-${dropTarget.position}`
            : "";
          const folderDisabledTitle = canManageThisFolder
            ? undefined
            : folderPermissionMessage("change");

          return (
            <div
              key={folder.id}
              className={`nav-item folder-nav-item ${selectedFolderId === folder.id ? "active" : ""}${dropClass}`}
              role="button"
              tabIndex={0}
              draggable={canDragThisFolder}
              onDragStart={(event) => {
                if (!canDragThisFolder) {
                  event.preventDefault();
                  return;
                }
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", folder.id);
                setDraggedFolderId(folder.id);
              }}
              onDragOver={(event) => {
                if (!draggedFolderId || folder.is_pinned || !canDragThisFolder) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                const bounds = event.currentTarget.getBoundingClientRect();
                setDropTarget({
                  folderId: folder.id,
                  position: event.clientY > bounds.top + bounds.height / 2 ? "after" : "before"
                });
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setDropTarget((current) => (
                  current?.folderId === folder.id ? null : current
                ));
              }}
              onDrop={(event) => reorderFolder(event, folder)}
              onDragEnd={resetDragState}
              onClick={() => onSelectFolder(folder.id)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onSelectFolder(folder.id);
              }}
            >
              {folder.is_pinned ? <PinIcon size={18} /> : <FolderIcon size={18} />}
              <span>{folder.name}</span>
              <div
                className="folder-actions-menu"
                ref={openFolderMenuId === folder.id ? folderActionsMenuRef : undefined}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <small className="folder-note-count">{notesByFolder[folder.id] ?? 0}</small>
                <button
                  className="folder-more-button"
                  type="button"
                  aria-label={`Folder actions for ${folder.name}`}
                  aria-expanded={openFolderMenuId === folder.id}
                  onClick={() => onToggleFolderMenu(folder.id)}
                >
                  <MoreVertical size={17} />
                </button>
                {openFolderMenuId === folder.id && (
                  <div className="folder-actions-popover" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!canManageThisFolder}
                      title={folderDisabledTitle}
                      onClick={() => onUpdateFolder(folder, { is_pinned: !folder.is_pinned })}
                    >
                      <PinIcon size={15} />
                      {folder.is_pinned ? "Unpin" : "Pin to top"}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!canManageThisFolder}
                      title={canManageThisFolder ? undefined : folderPermissionMessage("rename")}
                      onClick={() => onRenameFolder(folder)}
                    >
                      <Edit3 size={15} />
                      Rename
                    </button>
                    <div className="note-actions-divider" />
                    <button
                      className="danger-action"
                      type="button"
                      role="menuitem"
                      disabled={!canManageThisFolder}
                      title={canManageThisFolder ? undefined : folderPermissionMessage("delete")}
                      onClick={() => onDeleteFolder(folder)}
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </SidebarSection>

      <div className="storage-meter">
        <div>
          <span>Storage</span>
          <strong>{storageCapacity ? `${formatStorageSize(storageCapacity.data_size_bytes ?? 0)} used` : "Checking..."}</strong>
        </div>
        <div className="meter-track">
          <div
            className="meter-fill"
            style={{ width: `${Math.min(Math.max(mianotesStoragePercent(storageCapacity ?? null), 2), 100)}%` }}
          />
        </div>
      </div>

      <div className="sidebar-publish">
        <button className="sidebar-publish-button" type="button" onClick={onPublish}>
          <Upload size={17} />
          <span>Publish</span>
        </button>
      </div>
    </aside>
  );
}
