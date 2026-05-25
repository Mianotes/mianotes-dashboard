import { Loader2, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch, versionedMediaPath } from "../../api/client";
import type { FolderRecord, NoteRecord, ProfileDraft, UserRecord } from "../../api/types";
import { randomAvatarTone } from "../../components/ui/UserAvatar";
import { Modal, ModalActions } from "../../components/ui/Modal";
import { AllProfilesView } from "./AllProfilesView";
import { NewUserProfileView } from "./NewUserProfileView";
import { ProfileToolbar } from "./ProfileToolbar";
import { SingleProfileView } from "./SingleProfileView";
import { emptyProfileDraft } from "./profileUtils";

export function ProfileScreen({
  users,
  notes,
  folders,
  currentUser,
  selectedUserId,
  onSelectUser,
  onBack,
  onSignOut,
  onUserUpdated,
  onUserCreated,
  onSelectTag,
  onOpenSettings
}: {
  users: UserRecord[];
  notes: NoteRecord[];
  folders: FolderRecord[];
  currentUser: UserRecord;
  selectedUserId: string | "all";
  onSelectUser: (userId: string | "all") => void;
  onBack: () => void;
  onSignOut: () => void;
  onUserUpdated: (user: UserRecord) => void;
  onUserCreated: (user: UserRecord) => void;
  onSelectTag: (userId: string, tagSlug: string) => void;
  onOpenSettings: () => void;
}) {
  const selectedUser = selectedUserId === "all"
    ? null
    : users.find((user) => user.id === selectedUserId) ?? currentUser;
  const [isAddingUser, setIsAddingUser] = useState(false);
  const toolbarName = isAddingUser ? "New user" : selectedUser?.name ?? "All users";
  const canEditSelectedUser = Boolean(selectedUser && (currentUser.is_admin || selectedUser.id === currentUser.id));
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfileDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [pendingAdminChange, setPendingAdminChange] = useState<{ user: UserRecord; isAdmin: boolean } | null>(null);
  const [isChangingAdmin, setIsChangingAdmin] = useState(false);
  const [pendingPasswordUpdate, setPendingPasswordUpdate] = useState<UserRecord | null>(null);
  const [passwordDraft, setPasswordDraft] = useState({ password: "", confirmation: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [newUserAvatarTone, setNewUserAvatarTone] = useState(() => randomAvatarTone());
  const editSelectedProfileRef = useRef<string | null>(null);

  useEffect(() => {
    const shouldEditSelectedProfile = Boolean(selectedUser?.id && editSelectedProfileRef.current === selectedUser.id);
    editSelectedProfileRef.current = null;
    setIsEditing(shouldEditSelectedProfile);
    setIsAddingUser(false);
    setProfileError(null);
    setDraft({
      name: selectedUser?.name ?? "",
      email: selectedUser?.email ?? "",
      phone: selectedUser?.phone ?? "",
      role: selectedUser?.role ?? ""
    });
  }, [selectedUser?.id]);

  function selectUserForEditing(userId: string) {
    editSelectedProfileRef.current = userId;
    onSelectUser(userId);
  }

  function startAddingUser() {
    setIsAddingUser(true);
    setIsEditing(false);
    setProfileError(null);
    setNewUserAvatarTone(randomAvatarTone());
    setDraft(emptyProfileDraft);
  }

  async function saveNewUser() {
    const nextName = draft.name.trim();
    const nextEmail = draft.email.trim();
    if (!nextName || !nextEmail) {
      setProfileError("Name and email are required.");
      return;
    }

    setIsSaving(true);
    setProfileError(null);
    try {
      const createdUser = await apiFetch<UserRecord>("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: nextName,
          email: nextEmail,
          phone: draft.phone.trim(),
          role: draft.role.trim()
        })
      });
      onUserCreated(createdUser);
      setIsAddingUser(false);
      setDraft(emptyProfileDraft);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not add user");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProfile() {
    if (!selectedUser || !canEditSelectedUser) return;
    const nextName = draft.name.trim();
    const nextEmail = draft.email.trim();
    if (!nextName || !nextEmail) {
      setProfileError("Name and email are required.");
      return;
    }

    setIsSaving(true);
    setProfileError(null);
    try {
      const updatedUser = await apiFetch<UserRecord>(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: nextName,
          email: nextEmail,
          phone: draft.phone.trim(),
          role: draft.role.trim()
        })
      });
      onUserUpdated(updatedUser);
      setIsEditing(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not update profile");
    } finally {
      setIsSaving(false);
    }
  }

  function cancelEditing() {
    setIsAddingUser(false);
    setIsEditing(false);
    setProfileError(null);
    setDraft({
      name: selectedUser?.name ?? "",
      email: selectedUser?.email ?? "",
      phone: selectedUser?.phone ?? "",
      role: selectedUser?.role ?? ""
    });
  }

  async function uploadProfilePhoto(file: File) {
    if (!selectedUser || !canEditSelectedUser) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setProfileError("Profile photos must be JPG or PNG images.");
      return;
    }

    const formData = new FormData();
    formData.append("photo", file);
    setIsUploadingPhoto(true);
    setProfileError(null);
    try {
      const updatedUser = await apiFetch<UserRecord>(`/api/users/${selectedUser.id}/photo`, {
        method: "POST",
        body: formData
      });
      onUserUpdated({
        ...updatedUser,
        photo_url: updatedUser.photo_url ? versionedMediaPath(updatedUser.photo_url) : updatedUser.photo_url
      });
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not upload profile photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function updateAdminRole() {
    if (!pendingAdminChange) return;
    setIsChangingAdmin(true);
    setProfileError(null);
    try {
      const updatedUser = await apiFetch<UserRecord>(`/api/users/${pendingAdminChange.user.id}/admin`, {
        method: "PATCH",
        body: JSON.stringify({ is_admin: pendingAdminChange.isAdmin })
      });
      onUserUpdated(updatedUser);
      setPendingAdminChange(null);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not update admin access");
    } finally {
      setIsChangingAdmin(false);
    }
  }

  function closePasswordModal() {
    setPendingPasswordUpdate(null);
    setPasswordDraft({ password: "", confirmation: "" });
    setPasswordError(null);
  }

  async function updateUserPassword(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!pendingPasswordUpdate) return;
    const password = passwordDraft.password;
    const confirmation = passwordDraft.confirmation;
    if (!password || !confirmation) {
      setPasswordError("Enter and confirm the new password.");
      return;
    }
    if (password !== confirmation) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError(null);
    setProfileError(null);
    try {
      await apiFetch<UserRecord>(`/api/users/${pendingPasswordUpdate.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({
          password,
          password_confirmation: confirmation
        })
      });
      closePasswordModal();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  return (
    <>
      <ProfileToolbar
        users={users}
        currentUser={currentUser}
        selectedUserId={selectedUserId}
        selectedUser={selectedUser}
        toolbarName={toolbarName}
        isAddingUser={isAddingUser}
        isEditing={isEditing}
        isSaving={isSaving}
        canEditSelectedUser={canEditSelectedUser}
        onBack={onBack}
        onCancelEditing={cancelEditing}
        onSaveNewUser={() => void saveNewUser()}
        onSaveProfile={() => void saveProfile()}
        onStartAddingUser={startAddingUser}
        onStartEditing={() => setIsEditing(true)}
        onSelectUser={(userId) => {
          setIsAddingUser(false);
          onSelectUser(userId);
        }}
        onSignOut={onSignOut}
        onOpenSettings={onOpenSettings}
      />

      {profileError && (
        <div className="dashboard-notice" role="alert">
          <span>{profileError}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setProfileError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="profile-surface">
        {isAddingUser ? (
          <NewUserProfileView
            draft={draft}
            onDraftChange={setDraft}
            avatarToneName={newUserAvatarTone}
          />
        ) : selectedUser ? (
          <SingleProfileView
            user={selectedUser}
            notes={notes}
            folders={folders}
            isEditing={isEditing}
            draft={draft}
            onDraftChange={setDraft}
            canUploadPhoto={canEditSelectedUser}
            isUploadingPhoto={isUploadingPhoto}
            onPhotoUpload={uploadProfilePhoto}
            onSelectTag={onSelectTag}
          />
        ) : (
          <AllProfilesView
            users={users}
            notes={notes}
            folders={folders}
            currentUser={currentUser}
            onSelectUser={(userId) => onSelectUser(userId)}
            onEditUser={selectUserForEditing}
            onRequestPasswordUpdate={(user) => setPendingPasswordUpdate(user)}
            onRequestAdminChange={(user, isAdmin) => setPendingAdminChange({ user, isAdmin })}
          />
        )}
      </div>
      {pendingAdminChange && (
        <Modal
          className="folder-modal profile-admin-modal"
          labelledBy="profile-admin-modal-title"
          onClose={() => setPendingAdminChange(null)}
        >
          <div className="folder-modal-header">
            <div>
              <h2 id="profile-admin-modal-title">
                {pendingAdminChange.isAdmin ? "Make admin" : "Remove admin"}
              </h2>
              <p>
                {pendingAdminChange.isAdmin
                  ? `Give ${pendingAdminChange.user.name} admin access to this workspace?`
                  : `Remove admin access from ${pendingAdminChange.user.name}?`}
              </p>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Close"
              onClick={() => setPendingAdminChange(null)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="folder-modal-body">
            <div className="profile-admin-warning">
              <ShieldCheck size={18} />
              <span>Admins can manage users, settings, API keys, and databases.</span>
            </div>
          </div>
          <ModalActions
            cancelDisabled={isChangingAdmin}
            onCancel={() => setPendingAdminChange(null)}
            onPrimary={() => void updateAdminRole()}
            primaryDisabled={isChangingAdmin}
            primaryIcon={isChangingAdmin ? <Loader2 className="spin" size={15} /> : null}
            primaryLabel={pendingAdminChange.isAdmin ? "Make admin" : "Remove admin"}
          />
        </Modal>
      )}
      {pendingPasswordUpdate && (
        <Modal
          as="form"
          className="folder-modal profile-password-modal"
          labelledBy="profile-password-modal-title"
          onClose={closePasswordModal}
          onSubmit={(event) => void updateUserPassword(event)}
        >
          <div className="folder-modal-header">
            <div>
              <h2 id="profile-password-modal-title">Update password</h2>
              <p>
                Set a new password for {pendingPasswordUpdate.name}. They will use it the next time they sign in.
              </p>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Close"
              onClick={closePasswordModal}
            >
              <X size={18} />
            </button>
          </div>
          <div className="folder-modal-body">
            {passwordError && (
              <div className="modal-notice danger" role="alert">
                {passwordError}
              </div>
            )}
            <label className="field-label">
              <span>New password</span>
              <input
                autoFocus
                type="password"
                value={passwordDraft.password}
                onChange={(event) => setPasswordDraft((draft) => ({
                  ...draft,
                  password: event.target.value
                }))}
              />
            </label>
            <label className="field-label">
              <span>Confirm password</span>
              <input
                type="password"
                value={passwordDraft.confirmation}
                onChange={(event) => setPasswordDraft((draft) => ({
                  ...draft,
                  confirmation: event.target.value
                }))}
              />
            </label>
          </div>
          <ModalActions
            cancelDisabled={isUpdatingPassword}
            onCancel={closePasswordModal}
            primaryDisabled={isUpdatingPassword}
            primaryIcon={isUpdatingPassword ? <Loader2 className="spin" size={15} /> : null}
            primaryLabel="Update"
            primaryType="submit"
          />
        </Modal>
      )}
    </>
  );
}
