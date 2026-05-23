import { ChevronLeft, Database, Folder, History, Loader2, LogOut, Settings, User, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../api/client";
import type { FolderRecord, StorageCapacityRecord, StorageSettingsRecord, UserRecord } from "../../api/types";
import { TypewriterText } from "../../components/ui/TypewriterText";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { formatSettingsDate } from "../../utils/format";
import { DatabaseSwitchModal } from "./DatabaseSwitchModal";

export function SettingsScreen({
  currentUser,
  storageCapacity,
  onBack,
  onSignOut,
  onOpenProfile,
  onOpenSettings,
  onFoldersRestored,
  onDatabaseSwitched
}: {
  currentUser: UserRecord;
  storageCapacity: StorageCapacityRecord | null;
  onBack: () => void;
  onSignOut: () => void;
  onOpenProfile: (profileId?: string | "all") => void;
  onOpenSettings: () => void;
  onFoldersRestored: () => void | Promise<void>;
  onDatabaseSwitched: () => void;
}) {
  const [archivedFolders, setArchivedFolders] = useState<FolderRecord[]>([]);
  const [storageSettings, setStorageSettings] = useState<StorageSettingsRecord | null>(null);
  const [isLoadingArchivedFolders, setIsLoadingArchivedFolders] = useState(true);
  const [isLoadingStorageSettings, setIsLoadingStorageSettings] = useState(true);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [restoringFolderId, setRestoringFolderId] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadArchivedFolders();
    void loadStorageSettings();
  }, []);

  useEffect(() => {
    if (!isAccountOpen) return;

    function closeAccountMenu(event: PointerEvent) {
      if (
        event.target instanceof Node
        && accountMenuRef.current
        && !accountMenuRef.current.contains(event.target)
      ) {
        setIsAccountOpen(false);
      }
    }

    function closeAccountMenuOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeAccountMenu);
    document.addEventListener("keydown", closeAccountMenuOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeAccountMenu);
      document.removeEventListener("keydown", closeAccountMenuOnEscape);
    };
  }, [isAccountOpen]);

  async function loadArchivedFolders() {
    setIsLoadingArchivedFolders(true);
    setSettingsError(null);
    try {
      const items = await apiFetch<FolderRecord[]>("/api/folders?include_archived=true");
      setArchivedFolders(items.filter((folder) => Boolean(folder.archived_at)));
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Could not load archived folders.");
    } finally {
      setIsLoadingArchivedFolders(false);
    }
  }

  async function loadStorageSettings() {
    setIsLoadingStorageSettings(true);
    try {
      const settings = await apiFetch<StorageSettingsRecord>("/api/settings/storage");
      setStorageSettings(settings);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Could not load database settings.");
    } finally {
      setIsLoadingStorageSettings(false);
    }
  }

  async function restoreFolder(folder: FolderRecord) {
    setRestoringFolderId(folder.id);
    setSettingsError(null);
    setSettingsMessage(null);
    try {
      const restoredFolder = await apiFetch<FolderRecord>(`/api/folders/${folder.id}/restore`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setArchivedFolders((items) => items.filter((item) => item.id !== folder.id));
      setSettingsMessage(`Restored "${restoredFolder.name}".`);
      await onFoldersRestored();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Could not restore this folder.");
    } finally {
      setRestoringFolderId(null);
    }
  }

  const databasePath = storageSettings?.database_path ?? `${storageCapacity?.data_dir ?? "data"}/mia.db`;
  const databaseLabel = databasePath.replace(/\/$/, "").split("/").slice(-2).join("/");

  return (
    <>
      <header className="toolbar profile-toolbar settings-toolbar">
        <div className="profile-toolbar-left">
          <button className="back-square-button" onClick={onBack} aria-label="Back to notes">
            <ChevronLeft size={16} />
          </button>
          <div className="breadcrumb settings-breadcrumb">
            <span>Settings</span>
          </div>
        </div>
        <div className="toolbar-actions">
          <div className="account-menu profile-account-menu" ref={accountMenuRef}>
            <button
              className="account-avatar-button"
              type="button"
              aria-expanded={isAccountOpen}
              aria-haspopup="menu"
              onClick={() => setIsAccountOpen((value) => !value)}
            >
              <UserAvatar user={currentUser} className="profile-toolbar-avatar" />
            </button>
            {isAccountOpen && (
              <div className="account-popover" role="menu">
                <div className="account-popover-header">
                  <UserAvatar user={currentUser} className="account-popover-avatar" />
                  <TypewriterText text={currentUser.name} />
                </div>
                <div className="account-popover-group">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountOpen(false);
                      onOpenProfile(currentUser.id);
                    }}
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountOpen(false);
                      onOpenProfile("all");
                    }}
                  >
                    <Users size={16} />
                    <span>Users</span>
                  </button>
                  {currentUser.is_admin && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsAccountOpen(false);
                        onOpenSettings();
                      }}
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                  )}
                </div>
                <div className="account-popover-group">
                  <button
                    className="danger"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountOpen(false);
                      onSignOut();
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <section className="settings-surface">
        <div className="settings-content">
          <h1>Settings</h1>
          {settingsError && (
            <div className="dashboard-notice settings-notice" role="alert">
              <span>{settingsError}</span>
              <button type="button" aria-label="Dismiss" onClick={() => setSettingsError(null)}>
                <X size={16} />
              </button>
            </div>
          )}
          {settingsMessage && (
            <div className="dashboard-notice success settings-notice" role="status">
              <span>{settingsMessage}</span>
              <button type="button" aria-label="Dismiss" onClick={() => setSettingsMessage(null)}>
                <X size={16} />
              </button>
            </div>
          )}
          <section className="settings-card settings-storage-card" aria-labelledby="settings-storage-title">
            <div className="settings-card-intro">
              <h2 id="settings-storage-title">Switch database</h2>
              <p>
                Each database has its own notes, folders, users, settings, and agent activity. Choose the database you
                want this instance to use.
              </p>
            </div>
            <div className="settings-storage-panel">
              <Database size={24} />
              <span>
                <strong>{isLoadingStorageSettings ? "Loading database..." : databaseLabel}</strong>
                <small>Current database</small>
              </span>
              <button
                className="settings-text-action"
                type="button"
                onClick={() => setIsDatabaseModalOpen(true)}
              >
                Change database
              </button>
            </div>
          </section>
          <section className="settings-card settings-restore-card" aria-labelledby="settings-restore-title">
            <div className="settings-card-intro">
              <h2 id="settings-restore-title">Restore folders</h2>
              <p>
                Restore folders that were removed from the sidebar. Notes and source files are moved back from the
                archive.
              </p>
            </div>
            {isLoadingArchivedFolders ? (
              <div className="settings-empty-state settings-restore-empty">
                <Loader2 className="spin" size={24} />
                Loading archived folders...
              </div>
            ) : archivedFolders.length === 0 ? (
              <div className="settings-empty-state settings-restore-empty">
                <History size={24} />
                No archived folders yet.
              </div>
            ) : (
              <div className="restore-list">
                {archivedFolders.map((folder) => (
                  <div className="restore-row" key={folder.id}>
                    <Folder size={24} />
                    <div className="restore-row-copy">
                      <strong>{folder.name}</strong>
                      <span>{folder.path ?? `Archived on ${formatSettingsDate(folder.archived_at)}`}</span>
                    </div>
                    <button
                      className="secondary-action-button restore-action"
                      type="button"
                      disabled={restoringFolderId === folder.id}
                      onClick={() => void restoreFolder(folder)}
                    >
                      {restoringFolderId === folder.id ? <Loader2 className="spin" size={15} /> : <History size={15} />}
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
      {isDatabaseModalOpen && storageSettings && (
        <DatabaseSwitchModal
          storageSettings={storageSettings}
          onClose={() => setIsDatabaseModalOpen(false)}
          onSettingsChanged={setStorageSettings}
          onDatabaseSwitched={onDatabaseSwitched}
        />
      )}
    </>
  );
}

