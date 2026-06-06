import { ArrowRight, Copy, Folder, History, KeyRound, Link, Loader2, Server, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiBase, apiFetch } from "../../api/client";
import type {
  FolderRecord,
  ShareSettingsRecord,
  SkillInstallRecord,
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

type SettingsSectionId = "workspaces" | "admin-users" | "api-key" | "mcp-server" | "restore-folders" | "domain";

const SETTINGS_SECTIONS: Array<{ id: SettingsSectionId; label: string }> = [
  { id: "workspaces", label: "Workspaces" },
  { id: "admin-users", label: "Admin users" },
  { id: "api-key", label: "API Key" },
  { id: "mcp-server", label: "MCP Server" },
  { id: "restore-folders", label: "Restore folders" },
  { id: "domain", label: "Domain" }
];

export function SettingsScreen({
  users,
  currentUser,
  storageCapacity,
  workspaceName,
  storageSettings: dashboardStorageSettings,
  onBack,
  onSignOut,
  onOpenProfile,
  onOpenSettings,
  onFoldersRestored,
  onSwitchWorkspace
}: {
  users: UserRecord[];
  currentUser: UserRecord;
  storageCapacity: StorageCapacityRecord | null;
  workspaceName: string;
  storageSettings: StorageSettingsRecord | null;
  onBack: () => void;
  onSignOut: () => void;
  onOpenProfile: (profileId?: string | "all") => void;
  onOpenSettings: () => void;
  onFoldersRestored: () => void | Promise<void>;
  onSwitchWorkspace: (locationId: string) => Promise<void>;
}) {
  const [archivedFolders, setArchivedFolders] = useState<FolderRecord[]>([]);
  const [storageSettings, setStorageSettings] = useState<StorageSettingsRecord | null>(
    dashboardStorageSettings
  );
  const [isLoadingArchivedFolders, setIsLoadingArchivedFolders] = useState(true);
  const [isLoadingStorageSettings, setIsLoadingStorageSettings] = useState(true);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [restoringFolderId, setRestoringFolderId] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [skillInstallUrl, setSkillInstallUrl] = useState("");
  const [skillInstallCommand, setSkillInstallCommand] = useState("");
  const [isCreatingApiToken, setIsCreatingApiToken] = useState(false);
  const [workspaceUrl, setWorkspaceUrl] = useState("");
  const [isLoadingShareSettings, setIsLoadingShareSettings] = useState(true);
  const [isSavingShareSettings, setIsSavingShareSettings] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("workspaces");

  useEffect(() => {
    void loadArchivedFolders();
    void loadStorageSettings();
    void loadShareSettings();
  }, []);

  useEffect(() => {
    if (dashboardStorageSettings) {
      setStorageSettings(dashboardStorageSettings);
    }
  }, [dashboardStorageSettings]);

  useEffect(() => {
    if (!settingsMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSettingsMessage(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [settingsMessage]);

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

  async function switchWorkspace(locationId: string) {
    await onSwitchWorkspace(locationId);
    await loadStorageSettings();
    setIsDatabaseModalOpen(false);
  }

  async function loadShareSettings() {
    setIsLoadingShareSettings(true);
    try {
      const settings = await apiFetch<ShareSettingsRecord>("/api/settings/share");
      setWorkspaceUrl(settings.workspace_url ?? "");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Could not load sharing settings.");
    } finally {
      setIsLoadingShareSettings(false);
    }
  }

  async function saveShareSettings() {
    setIsSavingShareSettings(true);
    setSettingsError(null);
    setSettingsMessage(null);
    try {
      const settings = await apiFetch<ShareSettingsRecord>("/api/settings/share", {
        method: "PATCH",
        body: JSON.stringify({ workspace_url: workspaceUrl })
      });
      setWorkspaceUrl(settings.workspace_url ?? "");
      setSettingsMessage("Workspace address saved.");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Could not save the workspace address.");
    } finally {
      setIsSavingShareSettings(false);
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
      const message = error instanceof Error ? error.message : "Could not restore this folder.";
      if (message === "Archived folder no longer exists in the filesystem") {
        setArchivedFolders((items) => items.filter((item) => item.id !== folder.id));
      }
      setSettingsError(message);
    } finally {
      setRestoringFolderId(null);
    }
  }

  async function generateInstallUrl() {
    setIsCreatingApiToken(true);
    setSettingsError(null);
    setSettingsMessage(null);
    setSkillInstallUrl("");
    setSkillInstallCommand("");
    try {
      const installer = await apiFetch<SkillInstallRecord>("/api/install/skill", {
        method: "POST",
        body: JSON.stringify({
          api_url: apiEnvironmentUrl(),
          client_name: "Codex"
        })
      });
      setSkillInstallUrl(installer.install_url);
      setSkillInstallCommand(installer.command);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Could not generate the install URL.");
    } finally {
      setIsCreatingApiToken(false);
    }
  }

  async function copyInstallCommand() {
    if (!skillInstallCommand) {
      return;
    }
    await navigator.clipboard?.writeText(skillInstallCommand);
  }

  const currentFolderPath = storageSettings?.data_dir ?? storageCapacity?.data_dir ?? "data";
  const activeStorageLocation = storageSettings?.locations.find((location) => location.is_active);
  const currentFolderLabel = activeStorageLocation?.name
    ?? currentFolderPath.replace(/[\\/]+$/, "").split(/[\\/]+/).pop()
    ?? currentFolderPath;
  const currentFolderDescription = `Current workspace: ${compactFolderPath(currentFolderPath)}`;
  const adminUsers = users.filter((user) => user.is_admin);
  const visibleSettingsSections = currentUser.is_admin
    ? SETTINGS_SECTIONS
    : SETTINGS_SECTIONS.filter((section) => section.id === "workspaces" || section.id === "restore-folders");

  useEffect(() => {
    if (currentUser.is_admin || activeSection === "workspaces" || activeSection === "restore-folders") {
      return;
    }
    setActiveSection("workspaces");
  }, [activeSection, currentUser.is_admin]);

  return (
    <>
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-title">Settings</div>
          <nav className="settings-nav" aria-label="Settings navigation">
            {visibleSettingsSections.map((section) => (
              <button
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? "active" : ""}`}
                type="button"
                onClick={() => setActiveSection(section.id)}
              >
                <ArrowRight size={18} />
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
        </aside>
        <div className="settings-main">
          <ScreenToolbar
            className="settings-toolbar"
            workspaceName={workspaceName}
            storageSettings={storageSettings}
            breadcrumbItems={[{ label: "Settings", current: true }]}
            currentUser={currentUser}
            onBack={onBack}
            onOpenProfile={() => onOpenProfile(currentUser.id)}
            onOpenUsers={() => onOpenProfile("all")}
            onOpenSettings={onOpenSettings}
            onSignOut={onSignOut}
            onSwitchWorkspace={onSwitchWorkspace}
            showWorkspaceBreadcrumb={false}
          />
          <section className="settings-surface">
            <div className="settings-content">
              <h1>Settings</h1>
              {settingsError && (
                <div className="dashboard-notice dashboard-toast-notice settings-notice" role="alert">
                  <span>{settingsError}</span>
                  <button type="button" aria-label="Dismiss" onClick={() => setSettingsError(null)}>
                    <X size={16} />
                  </button>
                </div>
              )}
              {settingsMessage && (
                <div className="dashboard-notice success dashboard-toast-notice settings-notice" role="status">
                  <span>{settingsMessage}</span>
                  <button type="button" aria-label="Dismiss" onClick={() => setSettingsMessage(null)}>
                    <X size={16} />
                  </button>
                </div>
              )}
              {activeSection === "workspaces" && (
                <section className="settings-card settings-storage-card" aria-labelledby="settings-storage-title">
                  <div className="settings-card-intro">
                    <h2 id="settings-storage-title">Workspaces</h2>
                    <p>
                      Each workspace has its own notes, folders, sources, publishing history, and console activity.
                    </p>
                  </div>
                  <div className="settings-storage-panel">
                    <FolderIcon size={24} />
                    <span>
                      <strong>{isLoadingStorageSettings ? "Loading workspace..." : currentFolderLabel}</strong>
                      <small>{isLoadingStorageSettings ? "Current workspace" : currentFolderDescription}</small>
                    </span>
                    <button
                      className="settings-text-action"
                      type="button"
                      onClick={() => setIsDatabaseModalOpen(true)}
                    >
                      Change workspace
                    </button>
                  </div>
                </section>
              )}
              {currentUser.is_admin && activeSection === "admin-users" && (
                <section className="settings-card settings-team-card" aria-labelledby="settings-team-title">
                  <div className="settings-card-intro">
                    <h2 id="settings-team-title">Admin users</h2>
                    <p>These people can manage users, settings, API keys, and workspaces.</p>
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
              {currentUser.is_admin && activeSection === "domain" && (
                <section className="settings-card settings-share-card" aria-labelledby="settings-share-title">
                  <div className="settings-card-intro">
                    <h2 id="settings-share-title">Domain</h2>
                    <p>Mianotes uses this domain when it creates share links for notes.</p>
                  </div>
                  <div className="settings-api-panel settings-share-panel">
                    <label className="settings-api-field">
                      <span className="sr-only">Domain</span>
                      <span className="settings-api-input-shell">
                        <span className="settings-api-icon-shell">
                          <Link size={22} />
                        </span>
                        <input
                          type="url"
                          value={workspaceUrl}
                          disabled={isLoadingShareSettings}
                          placeholder="https://notes.yourdomain.com"
                          onChange={(event) => setWorkspaceUrl(event.currentTarget.value)}
                        />
                      </span>
                      <small>Use the domain your team and guests will use to view shared notes.</small>
                    </label>
                    <button
                      className="settings-api-action"
                      type="button"
                      disabled={isSavingShareSettings || isLoadingShareSettings}
                      onClick={() => void saveShareSettings()}
                    >
                      Save address
                    </button>
                  </div>
                </section>
              )}
              {currentUser.is_admin && activeSection === "api-key" && (
                <section className="settings-card settings-api-card" aria-labelledby="settings-api-title">
                  <div className="settings-card-intro">
                    <h2 id="settings-api-title">API Key</h2>
                    <p>
                      Connect this computer to a Mianotes server by generating a one-time install URL and running it on
                      the machine where you use Claude Code, Codex, or another AI tool.
                    </p>
                  </div>
                  <div className="settings-api-panel">
                    <label className="settings-api-field">
                      <span className="sr-only">Install script URL</span>
                      <span className="settings-api-input-shell">
                        <span className="settings-api-icon-shell">
                          <ApiKeyLockIcon />
                        </span>
                        <input
                          readOnly
                          aria-disabled="true"
                          type="text"
                          value={skillInstallUrl}
                          placeholder="Install URL"
                          onFocus={(event) => event.currentTarget.select()}
                        />
                      </span>
                    </label>
                    <button
                      className="settings-api-action"
                      type="button"
                      disabled={isCreatingApiToken}
                      onClick={() => void generateInstallUrl()}
                    >
                      Generate URL
                    </button>
                  </div>
                  {skillInstallCommand ? (
                    <div className="settings-api-created">
                      <h3>Install script</h3>
                      <p>
                        Run this command on the computer where you use your AI tool. The link expires in 24 hours and can
                        be used once. The script writes API environment variables to <code>~/.mianotes/env</code> and
                        installs <code>SKILL.md</code> for Claude Code and Codex without displaying your API key.
                      </p>
                      <div className="settings-api-code-block">
                        <pre aria-label={skillInstallCommand}>
                          <code>{skillInstallCommand}</code>
                        </pre>
                        <button
                          type="button"
                          aria-label="Copy install command"
                          title="Copy install command"
                          onClick={() => void copyInstallCommand()}
                        >
                          <Copy size={18} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              )}
              {currentUser.is_admin && activeSection === "mcp-server" && (
                <section className="settings-card settings-api-card" aria-labelledby="settings-mcp-title">
                  <div className="settings-card-intro">
                    <h2 id="settings-mcp-title">MCP Server</h2>
                    <p>
                      Use the Mianotes MCP server to let Codex, Claude Code, and other compatible tools search and save
                      notes through Mianotes.
                    </p>
                  </div>
                  <div className="settings-storage-panel settings-mcp-panel">
                    <Server size={24} />
                    <span>
                      <strong>mianotes-mcp</strong>
                      <small>
                        Package installs can run this command directly. Source installs can use the virtualenv entrypoint.
                      </small>
                    </span>
                  </div>
                  <div className="settings-storage-panel settings-mcp-panel">
                    <KeyRound size={24} />
                    <span>
                      <strong>Environment is loaded automatically</strong>
                      <small>The MCP entrypoint reads the Mianotes environment before any tool runs.</small>
                    </span>
                  </div>
                </section>
              )}
              {activeSection === "restore-folders" && (
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
                            {restoringFolderId === folder.id
                              ? <Loader2 className="spin" size={15} />
                              : <History size={15} />}
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </section>
        </div>
      </div>
      {isDatabaseModalOpen && storageSettings && (
        <DatabaseSwitchModal
          storageSettings={storageSettings}
          onClose={() => setIsDatabaseModalOpen(false)}
          onSettingsChanged={setStorageSettings}
          onSwitchWorkspace={switchWorkspace}
        />
      )}
    </>
  );
}
