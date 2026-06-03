import { Camera, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { UserProfileSummaryRecord, UserRecord } from "../../api/types";
import { UserAvatar } from "../../components/ui/UserAvatar";
import { profileStatsFromSummary, userDisplayRole } from "./profileUtils";

export function ProfileSummaryCard({
  user,
  summary,
  compact = false,
  canUploadPhoto = false,
  isUploadingPhoto = false,
  menu,
  onPhotoUpload
}: {
  user: UserRecord;
  summary?: UserProfileSummaryRecord;
  compact?: boolean;
  canUploadPhoto?: boolean;
  isUploadingPhoto?: boolean;
  menu?: ReactNode;
  onPhotoUpload?: (file: File) => void;
}) {
  const stats = profileStatsFromSummary(summary);

  return (
    <article className={`profile-card${compact ? " compact" : ""}${menu ? " has-menu" : ""}`}>
      {menu}
      <div className="profile-avatar-wrap">
        <UserAvatar user={user} className="profile-avatar" />
        {canUploadPhoto && (
          <label className="profile-avatar-upload" aria-label="Upload profile photo">
            {isUploadingPhoto ? <Loader2 className="spin" size={15} /> : <Camera size={15} />}
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) {
                  onPhotoUpload?.(file);
                }
              }}
            />
          </label>
        )}
      </div>
      <h2>{user.name}</h2>
      <p>{userDisplayRole(user)}</p>
      <span>{user.email}</span>
      <div className="profile-stats" aria-label={`${user.name} stats`}>
        <div>
          <span className="number">{stats.notes}</span>
          <span>Notes</span>
        </div>
        <div>
          <span className="number">{stats.tags}</span>
          <span>Tags</span>
        </div>
        <div>
          <span className="number">{stats.folders}</span>
          <span>Folders</span>
        </div>
      </div>
    </article>
  );
}
