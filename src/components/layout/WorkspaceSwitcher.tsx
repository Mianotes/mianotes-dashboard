import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { StorageSettingsRecord } from "../../api/types";
import { useOutsideAndEscape } from "../../hooks/useOutsideAndEscape";
import { FolderIcon } from "../icons/FolderIcon";

type WorkspaceSwitcherProps = {
  storageSettings: StorageSettingsRecord | null;
  onSwitchWorkspace: (locationId: string) => Promise<void>;
  icon?: ReactNode;
  className?: string;
};

export function WorkspaceSwitcher({
  storageSettings,
  onSwitchWorkspace,
  icon,
  className
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [switchingLocationId, setSwitchingLocationId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeWorkspace = storageSettings?.locations.find((location) => location.is_active);
  const locations = storageSettings?.locations ?? [];

  useOutsideAndEscape(isOpen, menuRef, () => setIsOpen(false));

  async function switchTo(locationId: string) {
    if (locationId === activeWorkspace?.id || switchingLocationId) {
      return;
    }
    setSwitchingLocationId(locationId);
    try {
      await onSwitchWorkspace(locationId);
      setIsOpen(false);
    } finally {
      setSwitchingLocationId(null);
    }
  }

  return (
    <div className={["workspace-switcher", className].filter(Boolean).join(" ")} ref={menuRef}>
      <button
        className="workspace-switcher-button"
        type="button"
        aria-label={`Switch workspace${activeWorkspace ? ` from ${activeWorkspace.name}` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        disabled={!storageSettings || locations.length === 0}
        onClick={() => setIsOpen((value) => !value)}
      >
        {icon ?? <FolderIcon size={18} />}
      </button>
      {isOpen && (
        <div className="workspace-switcher-popover" role="menu">
          <div className="workspace-switcher-title">Workspaces</div>
          {locations.map((location) => {
            const isActive = location.id === activeWorkspace?.id;
            const isSwitching = switchingLocationId === location.id;
            return (
              <button
                key={location.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                disabled={isActive || Boolean(switchingLocationId)}
                onClick={() => void switchTo(location.id)}
              >
                {isSwitching ? <Loader2 className="spin" size={16} /> : <FolderIcon size={16} />}
                <span>
                  <strong>{location.name}</strong>
                  <small>{compactWorkspacePath(location.folder_path)}</small>
                </span>
                {isActive ? <em>Current</em> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function compactWorkspacePath(path: string) {
  const parts = path.split(/[\\/]+/);
  return parts.length > 3 ? parts.slice(-3).join("/") : path;
}
