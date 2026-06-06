import { ArrowRight, Copy, Folder, HardDrive, History, Info, Link, Loader2, Users, X } from "lucide-react";
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
import { formatSettingsDate, formatStorageSize, mianotesStoragePercent } from "../../utils/format";
import { WorkspaceSwitchPanel } from "./WorkspaceSwitchPanel";

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

type SettingsSectionId = "workspaces" | "admin-users" | "api-key" | "restore-folders" | "domain" | "storage";

const SETTINGS_SECTIONS: Array<{ id: SettingsSectionId; label: string }> = [
  { id: "workspaces", label: "Workspaces" },
  { id: "admin-users", label: "Admin users" },
  { id: "api-key", label: "Connect AI tools" },
  { id: "restore-folders", label: "Restore folders" },
  { id: "domain", label: "Custom Domain" },
  { id: "storage", label: "Storage" }
];

function formatStoragePercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0%";
  }
  if (value < 0.1) {
    return "<0.1%";
  }
  if (value < 10) {
    return `${value.toFixed(1)}%`;
  }
  return `${Math.round(value)}%`;
}

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
  const [restoringFolderId, setRestoringFolderId] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
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
    setSkillInstallCommand("");
    try {
      const installer = await apiFetch<SkillInstallRecord>("/api/install/skill", {
        method: "POST",
        body: JSON.stringify({
          api_url: apiEnvironmentUrl(),
          client_name: "Codex"
        })
      });
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

  const adminUsers = users.filter((user) => user.is_admin);
  const visibleSettingsSections = currentUser.is_admin
    ? SETTINGS_SECTIONS
    : SETTINGS_SECTIONS.filter((section) => section.id === "workspaces" || section.id === "restore-folders");
  const storageUsagePercent = mianotesStoragePercent(storageCapacity);
  const storageProgressWidth = storageCapacity
    ? Math.min(Math.max(storageUsagePercent, storageCapacity.data_size_bytes > 0 ? 1 : 0), 100)
    : 0;

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
                  {isLoadingStorageSettings || !storageSettings ? (
                    <div className="settings-empty-state settings-storage-loading">
                      <Loader2 className="spin" size={24} />
                      Loading workspaces...
                    </div>
                  ) : (
                    <WorkspaceSwitchPanel
                      storageSettings={storageSettings}
                      onSettingsChanged={setStorageSettings}
                      onSwitchWorkspace={switchWorkspace}
                    />
                  )}
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
                    <h2 id="settings-share-title">Custom Domain</h2>
                    <p>Mianotes uses this domain when it creates share links for notes.</p>
                  </div>
                  <div className="settings-api-panel settings-share-panel">
                    <label className="settings-api-field">
                      <span className="sr-only">Custom Domain</span>
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
              {currentUser.is_admin && activeSection === "storage" && (
                <section className="settings-card settings-storage-usage-card" aria-labelledby="settings-storage-usage-title">
                  <div className="settings-card-intro">
                    <h2 id="settings-storage-usage-title">Storage</h2>
                    <p>
                      Mianotes scans its data directory and compares that size with the disk space reported by the
                      system.
                    </p>
                  </div>
                  {storageCapacity ? (
                    <div className="settings-storage-usage-body">
                      <div className="settings-storage-summary">
                        <div className="settings-storage-primary">
                          <span className="settings-storage-icon">
                            <HardDrive size={23} />
                          </span>
                          <span>
                            <small>Mianotes data</small>
                            <strong>{formatStorageSize(storageCapacity.data_size_bytes ?? 0)}</strong>
                          </span>
                        </div>
                        <div className="settings-storage-secondary">
                          <small>Disk space free</small>
                          <strong>{formatStorageSize(storageCapacity.free_bytes ?? 0)}</strong>
                        </div>
                      </div>
                      <div className="settings-storage-progress" aria-label="Mianotes storage usage">
                        <div className="settings-storage-progress-track">
                          <div
                            className="settings-storage-progress-fill"
                            style={{ width: `${storageProgressWidth}%` }}
                          />
                        </div>
                        <span>{formatStoragePercent(storageUsagePercent)} of this disk is used by Mianotes data.</span>
                      </div>
                      <dl className="settings-storage-details">
                        <div>
                          <dt>Data directory</dt>
                          <dd>{storageCapacity.data_dir}</dd>
                        </div>
                        <div>
                          <dt>Included files</dt>
                          <dd>Workspace databases, Markdown notes, source files, generated HTML, and cache data.</dd>
                        </div>
                        <div>
                          <dt>Disk capacity</dt>
                          <dd>{formatStorageSize(storageCapacity.total_bytes ?? 0)}</dd>
                        </div>
                        <div>
                          <dt>Last checked</dt>
                          <dd>{formatSettingsDate(storageCapacity.refreshed_at)}</dd>
                        </div>
                      </dl>
                    </div>
                  ) : (
                    <div className="settings-empty-state settings-storage-loading">
                      <Loader2 className="spin" size={24} />
                      Checking storage...
                    </div>
                  )}
                </section>
              )}
              {currentUser.is_admin && activeSection === "api-key" && (
                <section className="settings-card settings-api-card" aria-labelledby="settings-api-title">
                  <div className="settings-card-intro">
                    <h2 id="settings-api-title">Connect AI tools</h2>
                    <p>
                      Mianotes uses an API key so tools like Codex and Claude Code can search and save notes.
                    </p>
                    <p>
                      For security, Mianotes does not show the key in the browser. Instead, it creates a one-time
                      install link. Run the install command on the computer where you use your AI tool, and Mianotes
                      will save the key there automatically.
                    </p>
                  </div>
                  <div className="settings-api-install-panel">
                    <button
                      className="settings-api-action"
                      type="button"
                      disabled={isCreatingApiToken}
                      onClick={() => void generateInstallUrl()}
                    >
                      Generate install link
                    </button>
                  </div>
                  {skillInstallCommand ? (
                    <div className="settings-api-created">
                      <h3>Install script</h3>
                      <p>
                        Run this command on the computer where you use Codex, Claude Code, or another AI tool.
                      </p>
                      <p>
                        This command uses a one-time link. It expires in 24 hours and can only be used once. It saves
                        the Mianotes API key to <code>~/.mianotes/env</code> and installs the Mianotes skill files. The
                        key is not displayed in the browser.
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
                  <div className="settings-api-callout">
                    <h3>
                      <Info size={16} />
                      Why can't I see the key?
                    </h3>
                    <p>
                      API keys are secret. Showing them in the browser makes them easier to copy accidentally, share, or
                      leak. Mianotes installs the key directly into your local environment instead.
                    </p>
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
    </>
  );
}
