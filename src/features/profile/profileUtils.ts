import type { FolderRecord, NoteRecord, ProfileDraft, TagRecord, UserRecord } from "../../api/types";

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

export function profileScopedNotes(user: UserRecord, notes: NoteRecord[], folders: FolderRecord[]) {
  const activeFolderIds = new Set(folders.map((folder) => folder.id));
  return notes.filter((note) => {
    const isOwner = note.user_id === user.id || note.user?.id === user.id;
    if (!isOwner) return false;

    const folderId = note.folder_id ?? note.folder?.id;
    return Boolean(folderId && activeFolderIds.has(folderId));
  });
}

export function profileStats(user: UserRecord, notes: NoteRecord[], folders: FolderRecord[]) {
  const userNotes = profileScopedNotes(user, notes, folders);
  const tagIds = new Set<string>();
  const folderIds = new Set<string>();

  userNotes.forEach((note) => {
    if (note.folder_id || note.folder?.id) {
      folderIds.add(note.folder_id ?? note.folder?.id ?? "");
    }
    note.tags?.forEach((tag) => tagIds.add(tag.id));
  });

  return {
    notes: userNotes.length,
    tags: tagIds.size,
    folders: folderIds.size
  };
}

export function profileTags(user: UserRecord, notes: NoteRecord[], folders: FolderRecord[]) {
  const tagMap = new Map<string, TagRecord>();
  profileScopedNotes(user, notes, folders).forEach((note) => {
    note.tags?.forEach((tag) => tagMap.set(tag.id, tag));
  });
  return Array.from(tagMap.values()).sort((first, second) => first.name.localeCompare(second.name));
}
