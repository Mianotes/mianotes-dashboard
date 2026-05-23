import { LogOut, Settings, User, Users } from "lucide-react";
import type { Ref } from "react";
import type { UserRecord } from "../../api/types";
import { TypewriterText } from "../ui/TypewriterText";
import { UserAvatar } from "../ui/UserAvatar";

type AccountMenuProps = {
  currentUser: UserRecord;
  isOpen: boolean;
  menuRef: Ref<HTMLDivElement>;
  className?: string;
  avatarClassName?: string;
  onToggle: () => void;
  onOpenProfile: () => void;
  onOpenUsers: () => void;
  onOpenSettings?: () => void;
  onSignOut: () => void;
};

export function AccountMenu({
  currentUser,
  isOpen,
  menuRef,
  className,
  avatarClassName,
  onToggle,
  onOpenProfile,
  onOpenUsers,
  onOpenSettings,
  onSignOut
}: AccountMenuProps) {
  const classNames = ["account-menu", className].filter(Boolean).join(" ");

  return (
    <div className={classNames} ref={menuRef}>
      <button
        className="account-avatar-button"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={onToggle}
      >
        <UserAvatar user={currentUser} className={avatarClassName} />
      </button>
      {isOpen && (
        <div className="account-popover" role="menu">
          <div className="account-popover-header">
            <UserAvatar user={currentUser} className="account-popover-avatar" />
            <TypewriterText text={currentUser.name} />
          </div>
          <div className="account-popover-group">
            <button type="button" role="menuitem" onClick={onOpenProfile}>
              <User size={16} />
              <span>Profile</span>
            </button>
            <button type="button" role="menuitem" onClick={onOpenUsers}>
              <Users size={16} />
              <span>Users</span>
            </button>
            {currentUser.is_admin && onOpenSettings ? (
              <button type="button" role="menuitem" onClick={onOpenSettings}>
                <Settings size={16} />
                <span>Settings</span>
              </button>
            ) : null}
          </div>
          <div className="account-popover-group">
            <button className="danger" type="button" role="menuitem" onClick={onSignOut}>
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
