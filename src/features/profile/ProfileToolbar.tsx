import {
  ChevronDown,
  Edit3,
  Loader2,
  User
} from "lucide-react";
import type { StorageSettingsRecord, UserRecord } from "../../api/types";
import { ScreenToolbar } from "../../components/layout/ScreenToolbar";

export function ProfileToolbar({
  users,
  currentUser,
  workspaceName,
  storageSettings,
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
  onOpenSettings,
  onSwitchWorkspace
}: {
  users: UserRecord[];
  currentUser: UserRecord;
  workspaceName: string;
  storageSettings: StorageSettingsRecord | null;
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
  onSwitchWorkspace: (locationId: string) => Promise<void>;
}) {
  return (
    <ScreenToolbar
      workspaceName={workspaceName}
      storageSettings={storageSettings}
      breadcrumbItems={[{ label: "Users" }, { label: toolbarName, current: true }]}
      currentUser={currentUser}
      onBack={onBack}
      onOpenProfile={() => onSelectUser(currentUser.id)}
      onOpenUsers={() => onSelectUser("all")}
      onOpenSettings={onOpenSettings}
      onSignOut={onSignOut}
      onSwitchWorkspace={onSwitchWorkspace}
    >
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
    </ScreenToolbar>
  );
}
