import { Edit3, KeyRound, MoreVertical, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { UserProfileSummaryRecord, UserRecord } from "../../api/types";
import { useOutsideAndEscape } from "../../hooks/useOutsideAndEscape";
import { ProfileSummaryCard } from "./ProfileSummaryCard";

export function AllProfilesView({
  users,
  profileSummaries,
  currentUser,
  onEditUser,
  onRequestPasswordUpdate,
  onRequestAdminChange,
  onRequestDeleteUser,
  onSelectUser
}: {
  users: UserRecord[];
  profileSummaries: UserProfileSummaryRecord[];
  currentUser: UserRecord;
  onEditUser: (userId: string) => void;
  onRequestPasswordUpdate: (user: UserRecord) => void;
  onRequestAdminChange: (user: UserRecord, isAdmin: boolean) => void;
  onRequestDeleteUser: (user: UserRecord) => void;
  onSelectUser: (userId: string) => void;
}) {
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement | null>(null);
  const adminCount = users.filter((user) => user.is_admin).length;
  const summariesByUserId = new Map(profileSummaries.map((summary) => [summary.user_id, summary]));
  useOutsideAndEscape(Boolean(openMenuUserId), openMenuRef, () => setOpenMenuUserId(null));

  return (
    <section className="profiles-grid" aria-label="All user profiles">
      {users.map((user) => {
        const canEditUser = currentUser.is_admin || currentUser.id === user.id;
        const canShowMenu = canEditUser || currentUser.is_admin;
        const canShowDeleteUser = currentUser.is_admin;
        const canDeleteUser = currentUser.id !== user.id;
        const isOnlyAdmin = user.is_admin && adminCount <= 1;
        const isMenuOpen = openMenuUserId === user.id;
        return (
          <article className={`profile-card-shell ${isMenuOpen ? "menu-open" : ""}`} key={user.id}>
            <span className={`profile-role-badge ${user.is_admin ? "admin" : ""}`}>
              {user.is_admin ? "Admin" : "Member"}
            </span>
            {canShowMenu && (
              <div className="profile-card-menu" ref={isMenuOpen ? openMenuRef : undefined}>
                <button
                  className="profile-card-menu-button"
                  type="button"
                  aria-label={`Open actions for ${user.name}`}
                  aria-expanded={isMenuOpen}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenuUserId((current) => current === user.id ? null : user.id);
                  }}
                >
                  <MoreVertical size={17} />
                </button>
                {isMenuOpen && (
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
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuUserId(null);
                            onRequestPasswordUpdate(user);
                          }}
                        >
                          <KeyRound size={15} />
                          Update password
                        </button>
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
                        {canShowDeleteUser && (
                          <>
                            <div className="profile-card-menu-divider" role="separator" />
                            <button
                              className="danger-action"
                              type="button"
                              role="menuitem"
                              disabled={!canDeleteUser}
                              title={!canDeleteUser ? "Admins cannot delete their own account." : undefined}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!canDeleteUser) return;
                                setOpenMenuUserId(null);
                                onRequestDeleteUser(user);
                              }}
                            >
                              <Trash2 size={15} />
                              Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            <button className="profile-card-button" type="button" onClick={() => onSelectUser(user.id)}>
              <ProfileSummaryCard user={user} summary={summariesByUserId.get(user.id)} compact />
            </button>
          </article>
        );
      })}
    </section>
  );
}
