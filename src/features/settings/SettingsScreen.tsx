import { Copy, Folder, History, Loader2, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiBase, apiFetch } from "../../api/client";
import type {
  FolderRecord,
  ServiceApiKeyRecord,
  StorageCapacityRecord,
  StorageSettingsRecord,
  UserRecord
} from "../../api/types";
import { ScreenToolbar } from "../../components/layout/ScreenToolbar";
import { FolderIcon } from "../../components/icons/FolderIcon";
import { formatSettingsDate } from "../../utils/format";
import { DatabaseSwitchModal } from "./DatabaseSwitchModal";

function ApiKeyLockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17 10V8C17 5.23858 14.7614 3 12 3C9.23858 3 7 5.23858 7 8V10M12 14.5V16.5M8.8 21H15.2C16.8802 21 17.7202 21 18.362 20.673C18.9265 20.3854 19.3854 19.9265 19.673 19.362C20 18.7202 20 17.8802 20 16.2V14.8C20 13.1198 20 12.2798 19.673 11.638C19.3854 11.0735 18.9265 10.6146 18.362 10.327C17.7202 10 16.8802 10 15.2 10H8.8C7.11984 10 6.27976 10 5.63803 10.327C5.07354 10.6146 4.6146 11.0735 4.32698 11.638C4 12.2798 4 13.1198 4 14.8V16.2C4 17.8802 4 18.7202 4.32698 19.362C4.6146 19.9265 5.07354 20.3854 5.63803 20.673C6.27976 21 7.11984 21 8.8 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function apiEnvironmentUrl() {
  if (apiBase) {
    if (typeof window === "undefined") {
      return apiBase.replace(/\/$/, "");
    }
    return new URL(apiBase, window.location.origin).href.replace(/\/$/, "");
  }
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8200";
  }
  if (window.location.port === "8201") {
    return `${window.location.protocol}//${window.location.hostname}:8200`;
  }
  return window.location.origin;
}

function compactFolderPath(path: string) {
  const cleanPath = path.replace(/[\\/]+$/, "");
  const parts = cleanPath.split(/[\\/]+/).filter(Boolean);
  return parts.length > 3 ? parts.slice(-3).join("/") : cleanPath || path;
}

export function SettingsScreen({
  users,
  currentUser,
  storageCapacity,
  onBack,
  onSignOut,
  onOpenProfile,
  onOpenSettings,
  onFoldersRestored,
  onDatabaseSwitched
}: {
  users: UserRecord[];
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
  const [apiToken, setApiToken] = useState("");
  const [isCreatingApiToken, setIsCreatingApiToken] = useState(false);

  useEffect(() => {
    void loadArchivedFolders();
    void loadStorageSettings();
  }, []);

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
      setSettingsError(error instanceof Error ? error.message : "Could not load folder settings.");
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

  async function createApiToken() {
    setIsCreatingApiToken(true);
    setSettingsError(null);
    setSettingsMessage(null);
    setApiToken("");
    try {
      const createdToken = await apiFetch<ServiceApiKeyRecord>("/api/settings/api-key", {
        method: "POST",
        body: JSON.stringify({})
      });
      setApiToken(createdToken.token);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Could not create an API key.");
    } finally {
      setIsCreatingApiToken(false);
    }
  }

  async function copyApiEnvironment() {
    if (!apiToken) {
      return;
    }
    await navigator.clipboard?.writeText(apiEnvironmentSnippet);
  }

  const currentFolderPath = storageSettings?.data_dir ?? storageCapacity?.data_dir ?? "data";
  const activeStorageLocation = storageSettings?.locations.find((location) => location.is_active);
  const currentFolderLabel = activeStorageLocation?.name
    ?? currentFolderPath.replace(/[\\/]+$/, "").split(/[\\/]+/).pop()
    ?? currentFolderPath;
  const currentFolderDescription = `Current folder: ${compactFolderPath(currentFolderPath)}`;
  const adminUsers = users.filter((user) => user.is_admin);
  const apiEnvironmentSnippet = [
    `MIANOTES_API_URL="${apiEnvironmentUrl()}"`,
    `MIANOTES_API_KEY="${apiToken}"`
  ].join("\n");

  return (
    <>
      <ScreenToolbar
        className="settings-toolbar"
        breadcrumbItems={[{ label: "Settings", current: true }]}
        currentUser={currentUser}
        onBack={onBack}
        onOpenProfile={() => onOpenProfile(currentUser.id)}
        onOpenUsers={() => onOpenProfile("all")}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
      />
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
              <h2 id="settings-storage-title">Switch folder</h2>
              <p>
                Each folder has its own notes, users, settings, and agent activity. Choose the folder you want this
                instance to use.
              </p>
            </div>
            <div className="settings-storage-panel">
              <FolderIcon size={24} />
              <span>
                <strong>{isLoadingStorageSettings ? "Loading folder..." : currentFolderLabel}</strong>
                <small>{isLoadingStorageSettings ? "Current folder" : currentFolderDescription}</small>
              </span>
              <button
                className="settings-text-action"
                type="button"
                onClick={() => setIsDatabaseModalOpen(true)}
              >
              Change folder
              </button>
            </div>
          </section>
          {currentUser.is_admin && (
            <section className="settings-card settings-team-card" aria-labelledby="settings-team-title">
              <div className="settings-card-intro">
                <h2 id="settings-team-title">Team access</h2>
                <p>
                  These people can manage users, settings, API keys, and workspace folders.
                </p>
              </div>
              <div className="settings-team-list" aria-label="Workspace admins">
                {adminUsers.map((admin) => (
                  <div className="settings-team-row" key={admin.id}>
                    <Users size={24} />
                    <span>
                      <strong>{admin.name}</strong>
                      <small>{admin.email}</small>
                    </span>
                  </div>
                ))}
              </div>
              <p className="settings-team-help">
                You can make other people admins on the{" "}
                <button type="button" onClick={() => onOpenProfile("all")}>Users</button>{" "}
                screen.
              </p>
            </section>
          )}
          {currentUser.is_admin && (
            <section className="settings-card settings-api-card" aria-labelledby="settings-api-title">
              <div className="settings-card-intro">
                <h2 id="settings-api-title">Create API Key</h2>
                <p>
                  Generate a secure API key so your agents, apps, and external tools can connect to Mia. This key works
                  across all your Mianotes folders.
                </p>
              </div>
              <div className="settings-api-panel">
                <label className="settings-api-field">
                  <span className="sr-only">API key</span>
                  <span className="settings-api-input-shell">
                    <span className="settings-api-icon-shell">
                      <ApiKeyLockIcon />
                    </span>
                    <input
                      readOnly
                      aria-disabled="true"
                      type="text"
                      value={apiToken}
                      placeholder="API key"
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  </span>
                </label>
                <button
                  className="settings-api-action"
                  type="button"
                  disabled={isCreatingApiToken}
                  onClick={() => void createApiToken()}
                >
                  {isCreatingApiToken ? <Loader2 className="spin" size={18} /> : null}
                  Create API Key
                </button>
              </div>
              {apiToken ? (
                <div className="settings-api-created">
                  <h3>Mia is ready</h3>
                  <p>
                    Mianotes saved the API key automatically. Trusted local agents can now connect to Mia.
                  </p>
                  <details className="settings-api-advanced">
                    <summary>Manual setup</summary>
                    <p>
                      Use these details only when setting up a tool that cannot read the Mianotes service environment.
                    </p>
                    <div className="settings-api-code-block">
                      <pre aria-label={apiEnvironmentSnippet}>
                        <code>
                          <span className="shell-variable">MIANOTES_API_URL</span>=
                          <span className="shell-value">"{apiEnvironmentUrl()}"</span>
                          {"\n"}
                          <span className="shell-variable">MIANOTES_API_KEY</span>=
                          <span className="shell-value">"{apiToken}"</span>
                        </code>
                      </pre>
                      <button type="button" onClick={() => void copyApiEnvironment()}>
                        <Copy size={16} />
                        Copy
                      </button>
                    </div>
                  </details>
                  <p className="settings-api-private-note">
                    Keep this token private. You will not be able to see it again.
                  </p>
                </div>
              ) : null}
            </section>
          )}
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
