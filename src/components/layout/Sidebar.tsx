import { Activity, Edit3, MoreVertical, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, DragEvent, RefCallback } from "react";
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
  const activeMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const activePopoverRef = useRef<HTMLDivElement | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<{ top: number; left: number } | null>(null);
  const canManageFolder = (folder: FolderRecord) => currentUser.is_admin || folder.user_id === currentUser.id;
  const activeMenuFolder = openFolderMenuId
    ? folders.find((folder) => folder.id === openFolderMenuId) ?? null
    : null;
  const canManageActiveMenuFolder = activeMenuFolder ? canManageFolder(activeMenuFolder) : false;

  const placeFolderMenu = (button: HTMLButtonElement) => {
    const buttonRect = button.getBoundingClientRect();
    const popoverRect = activePopoverRef.current?.getBoundingClientRect();
    const menuWidth = popoverRect?.width ?? 168;
    const menuHeight = popoverRect?.height ?? 156;
    const margin = 12;
    const gap = 8;
    const left = Math.min(
      window.innerWidth - menuWidth - margin,
      Math.max(margin, buttonRect.right - menuWidth)
    );
    const belowTop = buttonRect.bottom + gap;
    const top = belowTop + menuHeight > window.innerHeight - margin
      ? Math.max(margin, buttonRect.top - menuHeight - gap)
      : belowTop;

    setMenuPlacement({ top, left });
  };

  useLayoutEffect(() => {
    if (!openFolderMenuId || !activeMenuButtonRef.current) {
      setMenuPlacement(null);
      return;
    }

    placeFolderMenu(activeMenuButtonRef.current);
  }, [openFolderMenuId]);

  useEffect(() => {
    if (!openFolderMenuId) return;

    const updatePlacement = () => {
      if (activeMenuButtonRef.current) {
        placeFolderMenu(activeMenuButtonRef.current);
      }
    };

    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [openFolderMenuId]);

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
          const draggingClass = draggedFolderId === folder.id ? " dragging" : "";

          return (
            <div
              key={folder.id}
              className={`nav-item folder-nav-item ${selectedFolderId === folder.id ? "active" : ""}${dropClass}${draggingClass}`}
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
                  ref={openFolderMenuId === folder.id ? activeMenuButtonRef : undefined}
                  onClick={(event) => {
                    activeMenuButtonRef.current = event.currentTarget;
                    placeFolderMenu(event.currentTarget);
                    onToggleFolderMenu(folder.id);
                  }}
                >
                  <MoreVertical size={17} />
                </button>
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

      {activeMenuFolder && menuPlacement && typeof document !== "undefined" && createPortal(
        <div
          className="folder-actions-popover folder-actions-popover-floating"
          ref={activePopoverRef}
          role="menu"
          style={{
            "--folder-menu-top": `${menuPlacement.top}px`,
            "--folder-menu-left": `${menuPlacement.left}px`
          } as CSSProperties}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            disabled={!canManageActiveMenuFolder}
            title={canManageActiveMenuFolder ? undefined : folderPermissionMessage("change")}
            onClick={() => onUpdateFolder(activeMenuFolder, { is_pinned: !activeMenuFolder.is_pinned })}
          >
            <PinIcon size={15} />
            {activeMenuFolder.is_pinned ? "Unpin" : "Pin to top"}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canManageActiveMenuFolder}
            title={canManageActiveMenuFolder ? undefined : folderPermissionMessage("rename")}
            onClick={() => onRenameFolder(activeMenuFolder)}
          >
            <Edit3 size={15} />
            Rename
          </button>
          <div className="note-actions-divider" />
          <button
            className="danger-action"
            type="button"
            role="menuitem"
            disabled={!canManageActiveMenuFolder}
            title={canManageActiveMenuFolder ? undefined : folderPermissionMessage("delete")}
            onClick={() => onDeleteFolder(activeMenuFolder)}
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>,
        document.body
      )}
    </aside>
  );
}
