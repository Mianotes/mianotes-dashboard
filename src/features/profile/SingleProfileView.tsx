import { Edit3, MoreVertical } from "lucide-react";
import { useRef, useState } from "react";
import type { FolderRecord, NoteRecord, ProfileDraft, UserRecord } from "../../api/types";
import { useOutsideAndEscape } from "../../hooks/useOutsideAndEscape";
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
  canEditProfile,
  onEditProfile,
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
  canEditProfile: boolean;
  onEditProfile: () => void;
  onSelectTag: (userId: string, tagSlug: string) => void;
}) {
  const tags = profileTags(user, notes, folders);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useOutsideAndEscape(isMenuOpen, menuRef, () => setIsMenuOpen(false));

  function setDraftField(field: keyof ProfileDraft, value: string) {
    onDraftChange({ ...draft, [field]: value });
  }

  const menu = canEditProfile && !isEditing ? (
    <div className="profile-card-menu single-profile-menu" ref={menuRef}>
      <button
        className="profile-card-menu-button"
        type="button"
        aria-label={`Open actions for ${user.name}`}
        aria-expanded={isMenuOpen}
        onClick={(event) => {
          event.stopPropagation();
          setIsMenuOpen((current) => !current);
        }}
      >
        <MoreVertical size={17} />
      </button>
      {isMenuOpen ? (
        <div className="profile-card-menu-popover" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              setIsMenuOpen(false);
              onEditProfile();
            }}
          >
            <Edit3 size={15} />
            Edit
          </button>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="profile-layout">
      <ProfileSummaryCard
        user={user}
        notes={notes}
        folders={folders}
        canUploadPhoto={canUploadPhoto}
        isUploadingPhoto={isUploadingPhoto}
        menu={menu}
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
