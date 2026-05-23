import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch, versionedMediaPath } from "../../api/client";
import type { FolderRecord, NoteRecord, ProfileDraft, UserRecord } from "../../api/types";
import { randomAvatarTone } from "../../components/ui/UserAvatar";
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
          />
        )}
      </div>
    </>
  );
}
