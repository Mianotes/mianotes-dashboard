import {
  ChevronDown,
  ChevronLeft,
  Edit3,
  Loader2,
  User
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { UserRecord } from "../../api/types";
import { AccountMenu } from "../../components/layout/AccountMenu";
import { Breadcrumb } from "../../components/layout/Breadcrumb";

export function ProfileToolbar({
  users,
  currentUser,
  selectedUserId,
  selectedUser,
  toolbarName,
  isAddingUser,
  isEditing,
  isSaving,
  canEditSelectedUser,
  onBack,
  onCancelEditing,
  onSaveNewUser,
  onSaveProfile,
  onStartAddingUser,
  onStartEditing,
  onSelectUser,
  onSignOut,
  onOpenSettings
}: {
  users: UserRecord[];
  currentUser: UserRecord;
  selectedUserId: string | "all";
  selectedUser: UserRecord | null;
  toolbarName: string;
  isAddingUser: boolean;
  isEditing: boolean;
  isSaving: boolean;
  canEditSelectedUser: boolean;
  onBack: () => void;
  onCancelEditing: () => void;
  onSaveNewUser: () => void;
  onSaveProfile: () => void;
  onStartAddingUser: () => void;
  onStartEditing: () => void;
  onSelectUser: (userId: string | "all") => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
}) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <header className="toolbar profile-toolbar">
      <div className="profile-toolbar-left">
        <button className="back-square-button" onClick={onBack} aria-label="Back to notes">
          <ChevronLeft size={16} />
        </button>
        <Breadcrumb items={[{ label: "Users" }, { label: toolbarName, current: true }]} />
      </div>
      <div className="toolbar-actions">
        {isAddingUser ? (
          <>
            <button
              className="primary-button compact save-profile-button"
              type="button"
              disabled={isSaving}
              onClick={onSaveNewUser}
            >
              {isSaving ? <Loader2 className="spin" size={15} /> : null}
              Save
            </button>
            <button className="text-button compact" type="button" onClick={onCancelEditing}>
              Cancel
            </button>
          </>
        ) : selectedUser && canEditSelectedUser && (
          isEditing ? (
            <>
              <button
                className="primary-button compact save-profile-button"
                type="button"
                disabled={isSaving}
                onClick={onSaveProfile}
              >
                {isSaving ? <Loader2 className="spin" size={15} /> : null}
                Save
              </button>
              <button className="text-button compact" type="button" onClick={onCancelEditing}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {currentUser.is_admin && (
                <button className="primary-button compact add-user-button" type="button" onClick={onStartAddingUser}>
                  Add User
                </button>
              )}
              <button className="secondary-action-button" type="button" onClick={onStartEditing}>
                <Edit3 size={16} />
                Edit
              </button>
            </>
          )
        )}
        {!isAddingUser && (!selectedUser || !canEditSelectedUser) && currentUser.is_admin && (
          <button className="primary-button compact add-user-button" type="button" onClick={onStartAddingUser}>
            Add User
          </button>
        )}
        <label className="select-button user-select-button profile-user-select">
          <User className="select-button-icon" size={16} />
          <span className="select-button-label">{toolbarName}</span>
          <select
            value={selectedUserId}
            onChange={(event) => onSelectUser(event.target.value)}
            disabled={isAddingUser}
          >
            <option value="all">All users</option>
            {users.map((person) => (
              <option value={person.id} key={person.id}>{person.name}</option>
            ))}
          </select>
          <ChevronDown className="select-button-chevron" size={12} />
        </label>
        <AccountMenu
          className="profile-account-menu"
          avatarClassName="profile-toolbar-avatar"
          currentUser={currentUser}
          isOpen={isAccountOpen}
          menuRef={accountMenuRef}
          onToggle={() => setIsAccountOpen((value) => !value)}
          onOpenProfile={() => {
            setIsAccountOpen(false);
            onSelectUser(currentUser.id);
          }}
          onOpenUsers={() => {
            setIsAccountOpen(false);
            onSelectUser("all");
          }}
          onOpenSettings={() => {
            setIsAccountOpen(false);
            onOpenSettings();
          }}
          onSignOut={() => {
            setIsAccountOpen(false);
            onSignOut();
          }}
        />
      </div>
    </header>
  );
}
