import { useCallback, useState } from "react";
import { apiFetch, setApiWorkspaceId } from "../../api/client";
import type {
  FolderRecord,
  NoteListPageRecord,
  NoteRecord,
  StorageCapacityRecord,
  StorageSettingsRecord,
  TagRecord,
  UserRecord
} from "../../api/types";
import { notesPerPage } from "../../utils/dashboardState";
import { hydrateNotes, mergeNoteRecord } from "../../utils/notes";

export type NotePageFilters = {
  selectedView?: "recent" | "starred";
  selectedUserId?: string | "all";
  selectedFolderId?: string | "all";
  selectedTag?: string | "all";
  searchQuery?: string;
};

type RefreshNotesOptions = {
  onMissingOpenedNote?: (availableNoteIds: Set<string>) => void;
  filters?: NotePageFilters;
  cursor?: string | null;
};

function noteListUrl(filters: NotePageFilters = {}, cursor: string | null = null) {
  const params = new URLSearchParams({ limit: String(notesPerPage) });
  if (filters.selectedView === "starred") params.set("starred", "true");
  if (filters.selectedUserId && filters.selectedUserId !== "all") {
    params.set("user_id", filters.selectedUserId);
  }
  if (filters.selectedFolderId && filters.selectedFolderId !== "all") {
    params.set("folder_id", filters.selectedFolderId);
  }
  if (filters.selectedTag && filters.selectedTag !== "all") {
    params.set("tag", filters.selectedTag);
  }
  const query = filters.searchQuery?.trim();
  if (query) params.set("query", query);
  if (cursor) params.set("cursor", cursor);
  return `/api/notes?${params.toString()}`;
}

export function useWorkspaceData(initialWorkspaceId: string | null = null) {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(initialWorkspaceId);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [notesTotal, setNotesTotal] = useState(0);
  const [nextNotesCursor, setNextNotesCursor] = useState<string | null>(null);
  const [folderNoteCounts, setFolderNoteCounts] = useState<Record<string, number>>({});
  const [storageCapacity, setStorageCapacity] =
    useState<StorageCapacityRecord | null>(null);
  const [storageSettings, setStorageSettings] =
    useState<StorageSettingsRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkspaceLoaded, setIsWorkspaceLoaded] = useState(false);

  const activateWorkspaceSession = useCallback(async (workspaceId: string) => {
    await apiFetch<unknown>("/api/settings/storage/active", {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify({ location_id: workspaceId })
    });
  }, []);

  const applyNotePage = useCallback((
    page: NoteListPageRecord,
    nextUsers = users,
    nextFolders = folders
  ) => {
    setNotes(hydrateNotes(page.items, nextUsers, nextFolders));
    setNotesTotal(page.total);
    setNextNotesCursor(page.next_cursor);
    setFolderNoteCounts(page.counts?.folders ?? {});
  }, [folders, users]);

  const loadNotesPage = useCallback(async (
    filters: NotePageFilters = {},
    cursor: string | null = null
  ) => {
    const page = await apiFetch<NoteListPageRecord>(noteListUrl(filters, cursor));
    applyNotePage(page);
    return page;
  }, [applyNotePage]);

  const loadWorkspace = useCallback(async (workspaceId = activeWorkspaceId) => {
    setApiWorkspaceId(workspaceId);
    const [
      nextUsers,
      nextFolders,
      nextTags,
      nextNotes,
      nextStorageCapacity,
      nextStorageSettings
    ] = await Promise.all([
      apiFetch<UserRecord[]>("/api/users"),
      apiFetch<FolderRecord[]>("/api/folders"),
      apiFetch<TagRecord[]>("/api/tags"),
      apiFetch<NoteListPageRecord>(noteListUrl()),
      apiFetch<StorageCapacityRecord>("/api/storage").catch(() => null),
      apiFetch<StorageSettingsRecord>("/api/settings/storage").catch(() => null)
    ]);

    const activeFolders = nextFolders.filter((folder) => !folder.archived_at);
    const resolvedWorkspaceId = workspaceId
      ?? nextStorageSettings?.active_location
      ?? nextStorageSettings?.locations[0]?.id
      ?? null;
    setActiveWorkspaceId(resolvedWorkspaceId);
    setApiWorkspaceId(resolvedWorkspaceId);
    setUsers(nextUsers);
    setFolders(activeFolders);
    setTags(nextTags);
    applyNotePage(nextNotes, nextUsers, activeFolders);
    setStorageCapacity(nextStorageCapacity);
    setStorageSettings(nextStorageSettings);
    setIsWorkspaceLoaded(true);
  }, [activeWorkspaceId, applyNotePage]);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    setIsWorkspaceLoaded(false);
    setApiWorkspaceId(activeWorkspaceId);
    try {
      const session = await apiFetch<{ user: UserRecord }>("/api/auth/session");
      setCurrentUser(session.user);
      if (activeWorkspaceId) {
        await activateWorkspaceSession(activeWorkspaceId);
      }
      await loadWorkspace(activeWorkspaceId);
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [activateWorkspaceSession, activeWorkspaceId, loadWorkspace]);

  const refreshNotes = useCallback(
    async (options: RefreshNotesOptions = {}) => {
      const page = await apiFetch<NoteListPageRecord>(
        noteListUrl(options.filters, options.cursor ?? null)
      );
      const hydrated = hydrateNotes(page.items, users, folders);
      const availableNoteIds = new Set(hydrated.map((note) => note.id));

      setNotes((items) =>
        hydrated.map((note) => {
          const current = items.find((item) => item.id === note.id);
          return current ? mergeNoteRecord(current, note) : note;
        })
      );
      setNotesTotal(page.total);
      setNextNotesCursor(page.next_cursor);
      setFolderNoteCounts(page.counts?.folders ?? {});
      options.onMissingOpenedNote?.(availableNoteIds);
      return page;
    },
    [folders, users]
  );

  const refreshNote = useCallback(async (noteId: string) => {
    const fullNote = await apiFetch<NoteRecord>(`/api/notes/${noteId}`);
    const hydratedNote = hydrateNotes([fullNote], users, folders)[0] ?? fullNote;
    setNotes((items) =>
      items.some((item) => item.id === noteId)
        ? items.map((item) =>
            item.id === noteId ? mergeNoteRecord(item, hydratedNote) : item
          )
        : [hydratedNote, ...items]
    );
    return fullNote;
  }, [folders, users]);

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

  const removeUserFromWorkspace = useCallback((userId: string) => {
    const deletedFolderIds = new Set(
      folders.filter((folder) => folder.user_id === userId).map((folder) => folder.id)
    );
    setUsers((items) => items.filter((user) => user.id !== userId));
    setFolders((items) => items.filter((folder) => folder.user_id !== userId));
    setNotes((items) =>
      items.filter((note) =>
        note.user_id !== userId
        && note.user?.id !== userId
        && (!note.folder_id || !deletedFolderIds.has(note.folder_id))
      )
    );
  }, [folders]);

  const resetWorkspaceData = useCallback(() => {
    setCurrentUser(null);
    setUsers([]);
    setFolders([]);
    setTags([]);
    setNotes([]);
    setNotesTotal(0);
    setNextNotesCursor(null);
    setFolderNoteCounts({});
    setStorageCapacity(null);
    setStorageSettings(null);
    setIsWorkspaceLoaded(false);
  }, []);

  const switchWorkspace = useCallback(
    async (locationId: string) => {
      setIsWorkspaceLoaded(false);
      setActiveWorkspaceId(locationId);
      setApiWorkspaceId(locationId);
      await activateWorkspaceSession(locationId);
      await loadWorkspace(locationId);
    },
    [activateWorkspaceSession, loadWorkspace]
  );

  const activeWorkspace = storageSettings?.locations.find((location) => location.is_active) ?? null;

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
    notesTotal,
    nextNotesCursor,
    folderNoteCounts,
    storageCapacity,
    storageSettings,
    activeWorkspace,
    isLoading,
    isWorkspaceLoaded,
    bootstrap,
    loadWorkspace,
    loadNotesPage,
    refreshNotes,
    refreshNote,
    addOrMergeNote,
    toggleNoteStar,
    updateUserInWorkspace,
    addUserToWorkspace,
    removeUserFromWorkspace,
    resetWorkspaceData,
    switchWorkspace,
    signOut
  };
}

export type WorkspaceData = ReturnType<typeof useWorkspaceData>;
