import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { apiFetch } from "../../api/client";
import type {
  StorageLocationRecord,
  StorageSettingsRecord
} from "../../api/types";
import { FolderIcon } from "../../components/icons/FolderIcon";
import { Modal, ModalActions } from "../../components/ui/Modal";

const COMPATIBLE_MARKDOWN_IMPORT_MESSAGE =
  "This folder contains compatible Markdown notes, but no workspace database was found. Import the notes and create a new Mianotes database for this workspace?";

type DatabaseSwitchModalProps = {
  storageSettings: StorageSettingsRecord;
  onClose: () => void;
  onSettingsChanged: (settings: StorageSettingsRecord) => void;
  onSwitchWorkspace: (locationId: string) => Promise<void>;
};

export function DatabaseSwitchModal({
  storageSettings,
  onClose,
  onSettingsChanged,
  onSwitchWorkspace
}: DatabaseSwitchModalProps) {
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
    <Modal className="folder-modal database-modal" labelledBy="database-switch-title" onClose={onClose}>
        <div className="folder-modal-header database-modal-header">
          <div>
            <h2 id="database-switch-title">Change workspace</h2>
            <p>
              Each workspace has its own notes, folders, sources, publishing history, and console activity.
            </p>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="folder-modal-body database-modal-body">
          {error && <div className="modal-notice danger">{error}</div>}
          <DatabaseLocationGroup title="Current workspace">
            {activeLocation && (
              <DatabaseLocationButton
                location={activeLocation}
                selected={false}
                badge="Current workspace"
              />
            )}
          </DatabaseLocationGroup>
          {isCreateFormOpen ? (
            <DatabaseLocationGroup title="Create workspace">
              <div className={`database-create-card ${canCreateWorkspace ? "selected" : ""}`}>
                <div className="database-create-icon">
                  <FolderIcon size={22} />
                </div>
                <div className="database-create-fields">
                  <label className="database-path-field">
                    <span>Workspace name</span>
                    <input
                      value={folderName}
                      onChange={(event) => {
                        setFolderName(event.target.value);
                        setSelectedLocationId("");
                      }}
                    />
                  </label>
                  <label className="database-path-field">
                    <span>Workspace path</span>
                    <input
                      id="database-folder-path"
                      value={folderPath}
                      placeholder="/path/to/folder"
                      onChange={(event) => {
                        setFolderPath(event.target.value);
                        setSelectedLocationId("");
                      }}
                    />
                    <small>Mianotes will keep private data in a hidden .mianotes folder inside this workspace.</small>
                  </label>
                  <button
                    className="primary-button database-create-button"
                    type="button"
                    disabled={!canCreateWorkspace || isSubmitting}
                    onClick={() => void createWorkspaceLocation()}
                  >
                    {isSubmitting ? <Loader2 className="spin" size={16} /> : <FolderIcon size={16} />}
                    Create workspace
                  </button>
                </div>
              </div>
            </DatabaseLocationGroup>
          ) : (
            <DatabaseLocationGroup title="Available workspaces">
              {availableLocations.length > 0 ? (
                <div className="database-location-scroll">
                  {availableLocations.map((location) => (
                    <DatabaseLocationButton
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
                <div className="database-empty-state">
                  <FolderIcon size={38} />
                  <strong>No other workspaces were found.</strong>
                  <span>Create a workspace to add another knowledge area.</span>
                </div>
              )}
              <button
                className="database-create-link"
                type="button"
                onClick={() => {
                  setError(null);
                  setSelectedLocationId("");
                  setFolderName("");
                  setFolderPath("");
                  setIsCreateFormOpen(true);
                }}
              >
                <Plus size={14} />
                Create a workspace
              </button>
            </DatabaseLocationGroup>
          )}
        </div>
        <ModalActions
          className="database-modal-actions"
          onCancel={onClose}
          onPrimary={showSwitchAction ? () => void switchSelectedWorkspace() : undefined}
          primaryClassName="database-switch-button"
          primaryDisabled={!canSwitchWorkspace || isSubmitting}
          primaryIcon={showSwitchAction ? (
            isSubmitting ? <Loader2 className="spin" size={16} /> : <FolderIcon size={16} />
          ) : undefined}
          primaryLabel={showSwitchAction ? "Change workspace" : undefined}
        />
    </Modal>
  );
}

function DatabaseLocationGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="database-location-group">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function DatabaseLocationButton({
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
      className={`database-location-row ${selected ? "selected" : ""} ${isInteractive ? "" : "read-only"}`}
      type="button"
      disabled={!isInteractive}
      onClick={onSelect}
    >
      <span
        className={`database-radio ${selected ? "selected" : ""} ${isInteractive ? "" : "database-radio-hidden"}`}
        aria-hidden={!isInteractive}
      />
      <FolderIcon size={26} />
      <span className="database-location-copy">
        <strong>{location.name}</strong>
        <small>{compactFolderPath(location.folder_path)}</small>
        {!location.database_exists ? (
          <small>Mianotes will create private data when selected.</small>
        ) : (
          <small>{databaseStatsText(location)}</small>
        )}
      </span>
      {badge ? <span className="database-current-badge">{badge}</span> : null}
    </button>
  );
}

function compactFolderPath(path: string) {
  const parts = path.split("/");
  return parts.length > 3 ? parts.slice(-3).join("/") : path;
}

function databaseStatsText(location: StorageLocationRecord) {
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
