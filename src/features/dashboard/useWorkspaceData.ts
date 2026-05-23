import { useCallback, useState } from "react";
import { apiFetch } from "../../api/client";
import type {
  FolderRecord,
  NoteRecord,
  StorageCapacityRecord,
  TagRecord,
  UserRecord
} from "../../api/types";
import { hydrateNotes, mergeNoteRecord } from "../../utils/notes";

type RefreshNotesOptions = {
  onMissingOpenedNote?: (availableNoteIds: Set<string>) => void;
};

export function useWorkspaceData() {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [storageCapacity, setStorageCapacity] =
    useState<StorageCapacityRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkspaceLoaded, setIsWorkspaceLoaded] = useState(false);

  const loadWorkspace = useCallback(async () => {
    const [
      nextUsers,
      nextFolders,
      nextTags,
      nextNotes,
      nextStorageCapacity
    ] = await Promise.all([
      apiFetch<UserRecord[]>("/api/users"),
      apiFetch<FolderRecord[]>("/api/folders"),
      apiFetch<TagRecord[]>("/api/tags"),
      apiFetch<NoteRecord[]>("/api/notes"),
      apiFetch<StorageCapacityRecord>("/api/storage").catch(() => null)
    ]);

    const activeFolders = nextFolders.filter((folder) => !folder.archived_at);
    setUsers(nextUsers);
    setFolders(activeFolders);
    setTags(nextTags);
    setNotes(hydrateNotes(nextNotes, nextUsers, activeFolders));
    setStorageCapacity(nextStorageCapacity);
    setIsWorkspaceLoaded(true);
  }, []);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    setIsWorkspaceLoaded(false);
    try {
      const session = await apiFetch<{ user: UserRecord }>("/api/auth/session");
      setCurrentUser(session.user);
      await loadWorkspace();
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadWorkspace]);

  const refreshNotes = useCallback(
    async (options: RefreshNotesOptions = {}) => {
      const nextNotes = await apiFetch<NoteRecord[]>("/api/notes");
      const hydrated = hydrateNotes(nextNotes, users, folders);
      const availableNoteIds = new Set(hydrated.map((note) => note.id));

      setNotes((items) =>
        hydrated.map((note) => {
          const current = items.find((item) => item.id === note.id);
          return current ? mergeNoteRecord(current, note) : note;
        })
      );
      options.onMissingOpenedNote?.(availableNoteIds);
    },
    [folders, users]
  );

  const refreshNote = useCallback(async (noteId: string) => {
    const fullNote = await apiFetch<NoteRecord>(`/api/notes/${noteId}`);
    setNotes((items) =>
      items.map((item) =>
        item.id === noteId ? mergeNoteRecord(item, fullNote) : item
      )
    );
    return fullNote;
  }, []);

  const addOrMergeNote = useCallback(
    (note: NoteRecord) => {
      const hydratedNote = hydrateNotes([note], users, folders)[0] ?? note;
      setNotes((items) =>
        items.some((item) => item.id === note.id)
          ? items.map((item) =>
              item.id === note.id ? mergeNoteRecord(item, hydratedNote) : item
            )
          : [hydratedNote, ...items]
      );
    },
    [folders, users]
  );

  const toggleNoteStar = useCallback(async (note: NoteRecord) => {
    const nextStarred = !note.is_starred;
    setNotes((items) =>
      items.map((item) =>
        item.id === note.id ? { ...item, is_starred: nextStarred } : item
      )
    );

    try {
      const updated = await apiFetch<NoteRecord>(`/api/notes/${note.id}/star`, {
        method: "PATCH",
        body: JSON.stringify({ is_starred: nextStarred })
      });
      setNotes((items) =>
        items.map((item) =>
          item.id === note.id ? mergeNoteRecord(item, updated) : item
        )
      );
    } catch (err) {
      setNotes((items) =>
        items.map((item) =>
          item.id === note.id ? { ...item, is_starred: note.is_starred } : item
        )
      );
      throw err;
    }
  }, []);

  const updateUserInWorkspace = useCallback((updatedUser: UserRecord) => {
    setUsers((items) =>
      items.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );
    setNotes((items) =>
      items.map((note) =>
        note.user?.id === updatedUser.id || note.user_id === updatedUser.id
          ? { ...note, user: updatedUser }
          : note
      )
    );
    setCurrentUser((user) => (user?.id === updatedUser.id ? updatedUser : user));
  }, []);

  const addUserToWorkspace = useCallback((createdUser: UserRecord) => {
    setUsers((items) => [createdUser, ...items]);
  }, []);

  const resetWorkspaceData = useCallback(() => {
    setCurrentUser(null);
    setUsers([]);
    setFolders([]);
    setTags([]);
    setNotes([]);
    setStorageCapacity(null);
    setIsWorkspaceLoaded(false);
  }, []);

  const signOut = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
  }, []);

  return {
    currentUser,
    users,
    folders,
    tags,
    notes,
    storageCapacity,
    isLoading,
    isWorkspaceLoaded,
    bootstrap,
    loadWorkspace,
    refreshNotes,
    refreshNote,
    addOrMergeNote,
    toggleNoteStar,
    updateUserInWorkspace,
    addUserToWorkspace,
    resetWorkspaceData,
    signOut
  };
}

export type WorkspaceData = ReturnType<typeof useWorkspaceData>;
