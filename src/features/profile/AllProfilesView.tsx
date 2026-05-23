import { Edit3 } from "lucide-react";
import type { FolderRecord, NoteRecord, UserRecord } from "../../api/types";
import { ProfileSummaryCard } from "./ProfileSummaryCard";

export function AllProfilesView({
  users,
  notes,
  folders,
  currentUser,
  onEditUser,
  onSelectUser
}: {
  users: UserRecord[];
  notes: NoteRecord[];
  folders: FolderRecord[];
  currentUser: UserRecord;
  onEditUser: (userId: string) => void;
  onSelectUser: (userId: string) => void;
}) {
  return (
    <section className="profiles-grid" aria-label="All user profiles">
      {users.map((user) => {
        const canEditUser = currentUser.is_admin || currentUser.id === user.id;
        return (
          <article className="profile-card-shell" key={user.id}>
            {canEditUser && (
              <button
                className="profile-card-edit-button"
                type="button"
                aria-label={`Edit ${user.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onEditUser(user.id);
                }}
              >
                <Edit3 size={15} />
              </button>
            )}
            <button className="profile-card-button" type="button" onClick={() => onSelectUser(user.id)}>
              <ProfileSummaryCard user={user} notes={notes} folders={folders} compact />
            </button>
          </article>
        );
      })}
    </section>
  );
}
