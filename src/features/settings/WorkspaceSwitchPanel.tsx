import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { apiFetch } from "../../api/client";
import type {
  StorageLocationRecord,
  StorageSettingsRecord
} from "../../api/types";
import { FolderIcon } from "../../components/icons/FolderIcon";

const COMPATIBLE_MARKDOWN_IMPORT_MESSAGE =
  "This folder contains compatible Markdown notes, but no workspace database was found. Import the notes and create a new Mianotes database for this workspace?";

type WorkspaceSwitchPanelProps = {
  storageSettings: StorageSettingsRecord;
  onSettingsChanged: (settings: StorageSettingsRecord) => void;
  onSwitchWorkspace: (locationId: string) => Promise<void>;
};

export function WorkspaceSwitchPanel({
  storageSettings,
  onSettingsChanged,
  onSwitchWorkspace
}: WorkspaceSwitchPanelProps) {
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeLocation = storageSettings.locations.find((location) => location.is_active)
    ?? storageSettings.locations[0];
  const availableLocations = storageSettings.locations.filter((location) => !location.is_active);
  const selectedLocation = availableLocations.find((location) => location.id === selectedLocationId);
  const trimmedFolderName = folderName.trim();
  const trimmedFolderPath = folderPath.trim();
  const canCreateWorkspace = Boolean(trimmedFolderName && trimmedFolderPath);
  const canSwitchWorkspace = Boolean(selectedLocation && !selectedLocation.is_active);
  const showSwitchAction = Boolean(selectedLocation && !isCreateFormOpen);

  function closeCreateForm() {
    setError(null);
    setFolderName("");
    setFolderPath("");
    setIsCreateFormOpen(false);
  }

  async function createWorkspaceLocation() {
    if (!canCreateWorkspace || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const nextSettings = await createWorkspaceRequest();
      onSettingsChanged(nextSettings);
      const createdLocation = [...nextSettings.locations].reverse().find(
        (location) => location.folder_path === trimmedFolderPath || location.name === trimmedFolderName
      ) ?? nextSettings.locations[nextSettings.locations.length - 1];
      setSelectedLocationId(createdLocation?.id ?? "");
      setFolderName("");
      setFolderPath("");
      setIsCreateFormOpen(false);
    } catch (error) {
      if (error instanceof Error && error.message === COMPATIBLE_MARKDOWN_IMPORT_MESSAGE) {
        try {
          const shouldImportMarkdown = window.confirm(COMPATIBLE_MARKDOWN_IMPORT_MESSAGE);
          const nextSettings = await createWorkspaceRequest(shouldImportMarkdown);
          onSettingsChanged(nextSettings);
          const createdLocation = [...nextSettings.locations].reverse().find(
            (location) => location.folder_path === trimmedFolderPath || location.name === trimmedFolderName
          ) ?? nextSettings.locations[nextSettings.locations.length - 1];
          setSelectedLocationId(createdLocation?.id ?? "");
          setFolderName("");
          setFolderPath("");
          setIsCreateFormOpen(false);
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Could not create workspace.");
        }
      } else {
        setError(error instanceof Error ? error.message : "Could not create workspace.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function createWorkspaceRequest(importExistingMarkdown?: boolean) {
    return apiFetch<StorageSettingsRecord>("/api/settings/storage/locations", {
      method: "POST",
      body: JSON.stringify({
        name: trimmedFolderName,
        folder_path: trimmedFolderPath,
        ...(importExistingMarkdown === undefined
          ? {}
          : { import_existing_markdown: importExistingMarkdown })
      })
    });
  }

  async function switchSelectedWorkspace() {
    if (!canSwitchWorkspace || isSubmitting || !selectedLocation) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSwitchWorkspace(selectedLocation.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not change workspace.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="workspace-settings-panel">
      <div className="workspace-settings-body">
        {error && <div className="modal-notice danger">{error}</div>}
        <WorkspaceLocationGroup title="Current workspace">
          {activeLocation && (
            <WorkspaceLocationButton
              location={activeLocation}
              selected={false}
              badge="Current workspace"
            />
          )}
          {!isCreateFormOpen ? (
            <button
              className="secondary-action-button workspace-create-toggle"
              type="button"
              onClick={() => {
                setError(null);
                setSelectedLocationId("");
                setFolderName("");
                setFolderPath("");
                setIsCreateFormOpen(true);
              }}
            >
              <Plus size={15} />
              Create a workspace
            </button>
          ) : null}
        </WorkspaceLocationGroup>
        {isCreateFormOpen ? (
          <WorkspaceLocationGroup title="Create workspace">
            <div className={`workspace-create-card ${canCreateWorkspace ? "selected" : ""}`}>
              <div className="workspace-create-icon">
                <FolderIcon size={22} />
              </div>
              <div className="workspace-create-fields">
                <label className="workspace-path-field">
                  <span>Workspace name</span>
                  <input
                    value={folderName}
                    onChange={(event) => {
                      setFolderName(event.target.value);
                      setSelectedLocationId("");
                    }}
                  />
                </label>
                <label className="workspace-path-field">
                  <span>Workspace path</span>
                  <input
                    id="workspace-folder-path"
                    value={folderPath}
                    placeholder="/path/to/folder"
                    onChange={(event) => {
                      setFolderPath(event.target.value);
                      setSelectedLocationId("");
                    }}
                  />
                </label>
                <div className="workspace-create-actions">
                  <button
                    className="primary-button workspace-create-button"
                    type="button"
                    disabled={!canCreateWorkspace || isSubmitting}
                    onClick={() => void createWorkspaceLocation()}
                  >
                    {isSubmitting ? <Loader2 className="spin" size={16} /> : <FolderIcon size={16} />}
                    Create workspace
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    disabled={isSubmitting}
                    onClick={closeCreateForm}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </WorkspaceLocationGroup>
        ) : (
          <WorkspaceLocationGroup title="Available workspaces">
            {availableLocations.length > 0 ? (
              <div className="workspace-location-scroll">
                {availableLocations.map((location) => (
                  <WorkspaceLocationButton
                    key={location.id}
                    location={location}
                    selected={selectedLocationId === location.id}
                    onSelect={() => {
                      setFolderPath("");
                      setFolderName("");
                      setSelectedLocationId(location.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="workspace-empty-state">
                <FolderIcon size={38} />
                <strong>No other workspaces were found.</strong>
                <span>Create a workspace to add another knowledge area.</span>
              </div>
            )}
          </WorkspaceLocationGroup>
        )}
      </div>
      {showSwitchAction ? (
        <div className="workspace-settings-actions">
          <button
            className="primary-button workspace-switch-button"
            type="button"
            disabled={!canSwitchWorkspace || isSubmitting}
            onClick={() => void switchSelectedWorkspace()}
          >
            {isSubmitting ? <Loader2 className="spin" size={16} /> : <FolderIcon size={16} />}
            Change workspace
          </button>
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceLocationGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="workspace-location-group">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function WorkspaceLocationButton({
  location,
  selected,
  badge,
  onSelect
}: {
  location: StorageLocationRecord;
  selected: boolean;
  badge?: string;
  onSelect?: () => void;
}) {
  const isInteractive = Boolean(onSelect);

  return (
    <button
      className={`workspace-location-row ${selected ? "selected" : ""} ${isInteractive ? "" : "read-only"}`}
      type="button"
      disabled={!isInteractive}
      onClick={onSelect}
    >
      <span
        className={`workspace-radio ${selected ? "selected" : ""} ${isInteractive ? "" : "workspace-radio-hidden"}`}
        aria-hidden={!isInteractive}
      />
      <FolderIcon size={26} />
      <span className="workspace-location-copy">
        <strong>{location.name}</strong>
        <small>{compactFolderPath(location.folder_path)}</small>
        {!location.database_exists ? (
          <small>Mianotes will create private data when selected.</small>
        ) : (
          <small>{workspaceStatsText(location)}</small>
        )}
      </span>
      {badge ? <span className="workspace-current-badge">{badge}</span> : null}
    </button>
  );
}

function compactFolderPath(path: string) {
  const parts = path.split("/");
  return parts.length > 3 ? parts.slice(-3).join("/") : path;
}

function workspaceStatsText(location: StorageLocationRecord) {
  const bits = [];
  if (typeof location.notes_count === "number") {
    bits.push(`${location.notes_count} note${location.notes_count === 1 ? "" : "s"}`);
  }
  if (typeof location.users_count === "number") {
    bits.push(`${location.users_count} user${location.users_count === 1 ? "" : "s"}`);
  }
  if (location.last_updated_at) {
    bits.push(`Last updated ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(location.last_updated_at))}`);
  }
  return bits.join("  •  ") || "Ready to use";
}
