import type { ProfileDraft, UserProfileSummaryRecord, UserRecord } from "../../api/types";

export const emptyProfileDraft: ProfileDraft = {
  name: "",
  email: "",
  phone: "",
  role: ""
};

export function userDisplayRole(user: UserRecord) {
  const jobTitle = user.role?.trim();
  if (jobTitle) {
    return user.is_admin ? `${jobTitle} (Admin)` : jobTitle;
  }
  return user.is_admin ? "Admin" : "Not set";
}

export function profileStatsFromSummary(summary?: UserProfileSummaryRecord) {
  return {
    notes: summary?.notes_count ?? 0,
    tags: summary?.tags_count ?? 0,
    folders: summary?.folders_count ?? 0
  };
}
