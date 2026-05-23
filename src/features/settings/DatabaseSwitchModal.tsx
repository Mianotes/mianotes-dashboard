import { Database, Folder, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { apiFetch } from "../../api/client";
import type {
  StorageLocationRecord,
  StorageSettingsRecord,
  StorageSwitchResponse
} from "../../api/types";

type DatabaseSwitchModalProps = {
  storageSettings: StorageSettingsRecord;
  onClose: () => void;
  onSettingsChanged: (settings: StorageSettingsRecord) => void;
  onDatabaseSwitched: () => void;
};

export function DatabaseSwitchModal({
  storageSettings,
  onClose,
  onSettingsChanged,
  onDatabaseSwitched
}: DatabaseSwitchModalProps) {
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeLocation = storageSettings.locations.find((location) => location.is_active)
    ?? storageSettings.locations[0];
  const availableLocations = storageSettings.locations.filter((location) => !location.is_active);
  const selectedLocation = availableLocations.find((location) => location.id === selectedLocationId);
  const trimmedDatabaseName = databaseName.trim();
  const trimmedFolderPath = folderPath.trim();
  const canCreateDatabase = Boolean(trimmedDatabaseName && trimmedFolderPath);
  const canSwitchDatabase = Boolean(selectedLocation && !selectedLocation.is_active);
  const showSwitchAction = Boolean(selectedLocation && !isCreateFormOpen);

  async function createDatabaseLocation() {
    if (!canCreateDatabase || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const nextSettings = await apiFetch<StorageSettingsRecord>("/api/settings/storage/locations", {
        method: "POST",
        body: JSON.stringify({ name: trimmedDatabaseName, folder_path: trimmedFolderPath })
      });
      onSettingsChanged(nextSettings);
      const createdLocation = [...nextSettings.locations].reverse().find(
        (location) => location.folder_path === trimmedFolderPath || location.name === trimmedDatabaseName
      ) ?? nextSettings.locations[nextSettings.locations.length - 1];
      setSelectedLocationId(createdLocation?.id ?? "");
      setDatabaseName("");
      setFolderPath("");
      setIsCreateFormOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create database.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function switchSelectedDatabase() {
    if (!canSwitchDatabase || isSubmitting || !selectedLocation) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch<StorageSwitchResponse>("/api/settings/storage/active", {
        method: "PATCH",
        body: JSON.stringify({ location_id: selectedLocation.id })
      });
      onDatabaseSwitched();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not switch database.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal folder-modal database-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="database-switch-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="folder-modal-header database-modal-header">
          <div>
            <h2 id="database-switch-title">Switch database</h2>
            <p>
              Each database has its own notes, folders, users, settings, and agent activity. Choose a database or
              create a new one.
            </p>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="folder-modal-body database-modal-body">
          {error && <div className="modal-notice danger">{error}</div>}
          <DatabaseLocationGroup title="Current database">
            {activeLocation && (
              <DatabaseLocationButton
                location={activeLocation}
                selected={false}
                badge="Current database"
              />
            )}
          </DatabaseLocationGroup>
          {isCreateFormOpen ? (
            <DatabaseLocationGroup title="Create Database">
              <div className={`database-create-card ${canCreateDatabase ? "selected" : ""}`}>
                <div className="database-create-icon">
                  <Folder size={22} />
                </div>
                <div className="database-create-fields">
                  <label className="database-path-field">
                    <span>Name</span>
                    <input
                      value={databaseName}
                      onChange={(event) => {
                        setDatabaseName(event.target.value);
                        setSelectedLocationId("");
                      }}
                    />
                  </label>
                  <label className="database-path-field">
                    <span>Folder path</span>
                    <input
                      id="database-folder-path"
                      value={folderPath}
                      placeholder="/path/to/folder"
                      onChange={(event) => {
                        setFolderPath(event.target.value);
                        setSelectedLocationId("");
                      }}
                    />
                    <small>Mianotes will create mia.db in the selected folder.</small>
                  </label>
                  <button
                    className="primary-button database-create-button"
                    type="button"
                    disabled={!canCreateDatabase || isSubmitting}
                    onClick={() => void createDatabaseLocation()}
                  >
                    {isSubmitting ? <Loader2 className="spin" size={16} /> : <Database size={16} />}
                    Create database
                  </button>
                </div>
              </div>
            </DatabaseLocationGroup>
          ) : (
            <DatabaseLocationGroup title="Available databases">
              {availableLocations.length > 0 ? (
                availableLocations.map((location) => (
                  <DatabaseLocationButton
                    key={location.id}
                    location={location}
                    selected={selectedLocationId === location.id}
                    onSelect={() => {
                      setFolderPath("");
                      setDatabaseName("");
                      setSelectedLocationId(location.id);
                    }}
                  />
                ))
              ) : (
                <div className="database-empty-state">
                  <Folder size={38} />
                  <strong>No other databases were found.</strong>
                  <span>Create a database to add another workspace.</span>
                </div>
              )}
              <button
                className="database-create-link"
                type="button"
                onClick={() => {
                  setError(null);
                  setSelectedLocationId("");
                  setDatabaseName("");
                  setFolderPath("");
                  setIsCreateFormOpen(true);
                }}
              >
                <Plus size={14} />
                Create a database
              </button>
            </DatabaseLocationGroup>
          )}
        </div>
        <div className="folder-modal-actions database-modal-actions">
          <button className="secondary-action-button" type="button" onClick={onClose}>
            Cancel
          </button>
          {showSwitchAction && (
            <button
              className="primary-button database-switch-button"
              type="button"
              disabled={!canSwitchDatabase || isSubmitting}
              onClick={() => void switchSelectedDatabase()}
            >
              {isSubmitting ? <Loader2 className="spin" size={16} /> : <Database size={16} />}
              Switch database
            </button>
          )}
        </div>
      </section>
    </div>
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
      <Database size={26} />
      <span className="database-location-copy">
        <strong>{location.name}</strong>
        <small>{compactDatabasePath(location.database_path)}</small>
        {!location.database_exists ? (
          <small>mia.db does not exist yet. Mianotes will create it when selected.</small>
        ) : (
          <small>{databaseStatsText(location)}</small>
        )}
      </span>
      {badge ? <span className="database-current-badge">{badge}</span> : null}
    </button>
  );
}

function compactDatabasePath(path: string) {
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
