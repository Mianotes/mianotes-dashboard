import { ChevronLeft } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { StorageSettingsRecord, UserRecord } from "../../api/types";
import { useOutsideAndEscape } from "../../hooks/useOutsideAndEscape";
import { AccountMenu } from "./AccountMenu";
import { Breadcrumb } from "./Breadcrumb";
import type { BreadcrumbItem } from "./Breadcrumb";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

type ScreenToolbarProps = {
  workspaceName: string;
  storageSettings: StorageSettingsRecord | null;
  breadcrumbItems: BreadcrumbItem[];
  currentUser: UserRecord;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenUsers: () => void;
  onSignOut: () => void;
  backLabel?: string;
  children?: ReactNode;
  className?: string;
  onOpenSettings?: () => void;
  onSwitchWorkspace: (locationId: string) => Promise<void>;
};

export function ScreenToolbar({
  workspaceName,
  storageSettings,
  breadcrumbItems,
  currentUser,
  onBack,
  onOpenProfile,
  onOpenUsers,
  onSignOut,
  backLabel = "Back to notes",
  children,
  className,
  onOpenSettings,
  onSwitchWorkspace
}: ScreenToolbarProps) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const classNames = ["toolbar", "profile-toolbar", className].filter(Boolean).join(" ");
  const closeAccountMenu = useCallback(() => setIsAccountOpen(false), []);

  useOutsideAndEscape(isAccountOpen, accountMenuRef, closeAccountMenu);

  function runAccountAction(action: () => void) {
    closeAccountMenu();
    action();
  }

  return (
    <header className={classNames}>
      <div className="profile-toolbar-left">
        <button className="back-square-button" type="button" onClick={onBack} aria-label={backLabel}>
          <ChevronLeft size={16} />
        </button>
        <WorkspaceSwitcher
          storageSettings={storageSettings}
          onSwitchWorkspace={onSwitchWorkspace}
        />
        <Breadcrumb items={[{ label: workspaceName }, ...breadcrumbItems]} />
      </div>
      <div className="toolbar-actions">
        {children}
        <AccountMenu
          className="profile-account-menu"
          avatarClassName="profile-toolbar-avatar"
          currentUser={currentUser}
          isOpen={isAccountOpen}
          menuRef={accountMenuRef}
          onToggle={() => setIsAccountOpen((value) => !value)}
          onOpenProfile={() => runAccountAction(onOpenProfile)}
          onOpenUsers={() => runAccountAction(onOpenUsers)}
          onOpenSettings={onOpenSettings ? () => runAccountAction(onOpenSettings) : undefined}
          onSignOut={() => runAccountAction(onSignOut)}
        />
      </div>
    </header>
  );
}
