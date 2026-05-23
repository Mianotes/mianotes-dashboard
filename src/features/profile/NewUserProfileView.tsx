import type { ProfileDraft } from "../../api/types";
import type { AvatarTone } from "../../components/ui/UserAvatar";
import { userInitials } from "../../components/ui/UserAvatar";

export function NewUserProfileView({
  draft,
  onDraftChange,
  avatarToneName
}: {
  draft: ProfileDraft;
  onDraftChange: (draft: ProfileDraft) => void;
  avatarToneName: AvatarTone;
}) {
  function setDraftField(field: keyof ProfileDraft, value: string) {
    onDraftChange({ ...draft, [field]: value });
  }

  const previewName = draft.name.trim() || "Full Name";
  const previewRole = draft.role.trim() || "Job Title";
  const previewEmail = draft.email.trim() || "Email";

  return (
    <div className="profile-layout">
      <article className="profile-card">
        <div className="profile-avatar-wrap">
          <span className={`avatar avatar-${avatarToneName} profile-avatar`}>
            {userInitials(previewName)}
          </span>
        </div>
        <h2>{previewName}</h2>
        <p>{previewRole}</p>
        <span>{previewEmail}</span>
        <div className="profile-stats" aria-label="New user stats">
          <div>
            <span className="number">0</span>
            <span>Notes</span>
          </div>
          <div>
            <span className="number">0</span>
            <span>Tags</span>
          </div>
          <div>
            <span className="number">0</span>
            <span>Folders</span>
          </div>
        </div>
      </article>

      <div className="profile-detail-column">
        <section className="profile-info-card">
          <header>
            <h2>Personal Information</h2>
          </header>
          <div className="profile-info-grid editable">
            <label>
              <span>Full name</span>
              <input
                value={draft.name}
                onChange={(event) => setDraftField("name", event.target.value)}
                autoFocus
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) => setDraftField("email", event.target.value)}
              />
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
        </section>

        <section className="profile-info-card">
          <header>
            <h2>Tags</h2>
          </header>
          <div className="profile-tags">
            <p>No tags yet.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
