import type { FolderRecord, NoteRecord, ProfileDraft, UserRecord } from "../../api/types";
import { ProfileSummaryCard } from "./ProfileSummaryCard";
import { profileTags, userDisplayRole } from "./profileUtils";

export function SingleProfileView({
  user,
  notes,
  folders,
  isEditing,
  draft,
  onDraftChange,
  canUploadPhoto,
  isUploadingPhoto,
  onPhotoUpload,
  onSelectTag
}: {
  user: UserRecord;
  notes: NoteRecord[];
  folders: FolderRecord[];
  isEditing: boolean;
  draft: ProfileDraft;
  onDraftChange: (draft: ProfileDraft) => void;
  canUploadPhoto: boolean;
  isUploadingPhoto: boolean;
  onPhotoUpload: (file: File) => void;
  onSelectTag: (userId: string, tagSlug: string) => void;
}) {
  const tags = profileTags(user, notes, folders);

  function setDraftField(field: keyof ProfileDraft, value: string) {
    onDraftChange({ ...draft, [field]: value });
  }

  return (
    <div className="profile-layout">
      <ProfileSummaryCard
        user={user}
        notes={notes}
        folders={folders}
        canUploadPhoto={canUploadPhoto}
        isUploadingPhoto={isUploadingPhoto}
        onPhotoUpload={onPhotoUpload}
      />
      <div className="profile-detail-column">
        <section className="profile-info-card">
          <header>
            <h2>Personal Information</h2>
          </header>
          {isEditing ? (
            <div className="profile-info-grid editable">
              <label>
                <span>Full name</span>
                <input value={draft.name} onChange={(event) => setDraftField("name", event.target.value)} />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={draft.email} onChange={(event) => setDraftField("email", event.target.value)} />
              </label>
              <label>
                <span>Phone</span>
                <input value={draft.phone} onChange={(event) => setDraftField("phone", event.target.value)} />
              </label>
              <label>
                <span>Job title</span>
                <input value={draft.role} onChange={(event) => setDraftField("role", event.target.value)} />
              </label>
            </div>
          ) : (
            <div className="profile-info-grid">
              <div>
                <span>Full name</span>
                <strong>{user.name}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{user.phone?.trim() || "Not set"}</strong>
              </div>
              <div>
                <span>Job title</span>
                <strong>{userDisplayRole(user)}</strong>
              </div>
            </div>
          )}
        </section>
        <section className="profile-info-card">
          <header>
            <h2>Tags</h2>
          </header>
          <div className="profile-tags">
            {tags.length > 0 ? (
              tags.slice(0, 12).map((tag) => (
                <button
                  className="tag-pill profile-tag-button"
                  key={tag.id}
                  type="button"
                  onClick={() => onSelectTag(user.id, tag.slug)}
                >
                  {tag.name}
                </button>
              ))
            ) : (
              <p>No tags yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
