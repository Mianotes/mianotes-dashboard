import { Edit3, MoreVertical, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import type { FolderRecord, NoteRecord, UserRecord } from "../../api/types";
import { ProfileSummaryCard } from "./ProfileSummaryCard";

export function AllProfilesView({
  users,
  notes,
  folders,
  currentUser,
  onEditUser,
  onRequestAdminChange,
  onSelectUser
}: {
  users: UserRecord[];
  notes: NoteRecord[];
  folders: FolderRecord[];
  currentUser: UserRecord;
  onEditUser: (userId: string) => void;
  onRequestAdminChange: (user: UserRecord, isAdmin: boolean) => void;
  onSelectUser: (userId: string) => void;
}) {
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const adminCount = users.filter((user) => user.is_admin).length;

  return (
    <section className="profiles-grid" aria-label="All user profiles">
      {users.map((user) => {
        const canEditUser = currentUser.is_admin || currentUser.id === user.id;
        const canShowMenu = canEditUser || currentUser.is_admin;
        const isOnlyAdmin = user.is_admin && adminCount <= 1;
        return (
          <article className="profile-card-shell" key={user.id}>
            <span className={`profile-role-badge ${user.is_admin ? "admin" : ""}`}>
              {user.is_admin ? "Admin" : "Member"}
            </span>
            {canShowMenu && (
              <div className="profile-card-menu">
                <button
                  className="profile-card-menu-button"
                  type="button"
                  aria-label={`Open actions for ${user.name}`}
                  aria-expanded={openMenuUserId === user.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenuUserId((current) => current === user.id ? null : user.id);
                  }}
                >
                  <MoreVertical size={17} />
                </button>
                {openMenuUserId === user.id && (
                  <div className="profile-card-menu-popover" role="menu">
                    {canEditUser && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuUserId(null);
                          onEditUser(user.id);
                        }}
                      >
                        <Edit3 size={15} />
                        Edit
                      </button>
                    )}
                    {currentUser.is_admin && (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={isOnlyAdmin && user.is_admin}
                        title={isOnlyAdmin && user.is_admin ? "This workspace needs at least one admin." : undefined}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuUserId(null);
                          onRequestAdminChange(user, !user.is_admin);
                        }}
                      >
                        {user.is_admin ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                        {user.is_admin ? "Remove admin" : "Make admin"}
                      </button>
                    )}
                  </div>
                )}
              </div>
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
