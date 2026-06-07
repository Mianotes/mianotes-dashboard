import { useCallback } from "react";
import { apiFetch } from "../../api/client";
import type { FolderRecord, NoteRecord } from "../../api/types";
import { folderActionErrorMessage } from "../../utils/folders";
import { isNoteJobActive } from "../../utils/notes";
import type { DashboardNavigation } from "./useDashboardNavigation";
import type { WorkspaceData } from "./useWorkspaceData";

export type FolderUpdateResult = { ok: true } | { ok: false; error: string };
export type NoteMoveResult = { ok: true } | { ok: false; error: string };

type UseDashboardActionsArgs = {
  workspace: WorkspaceData;
  navigation: DashboardNavigation;
  selectedFolderId: string | "all";
  setError: (message: string | null) => void;
};

export function useDashboardActions({
  workspace,
  navigation,
  selectedFolderId,
  setError
}: UseDashboardActionsArgs) {
  const {
    activeWorkspace,
    loadWorkspace,
    addOrMergeNote,
    refreshNotes: refreshWorkspaceNotes,
    refreshNote,
    refreshFolderCounts,
    toggleNoteStar: toggleWorkspaceNoteStar
  } = workspace;
  const {
    setOpenFolderMenuId,
    selectedView,
    selectedUserId,
    selectedTag,
    searchQuery,
    setSelectedFolderId,
    setOpenedNoteId,
    setNoteIdToEditOnOpen,
    navigationSnapshot,
    pushNavigationSnapshot
  } = navigation;
  const activeWorkspaceId = activeWorkspace?.id ?? null;

  const refreshNotes = useCallback(async (
    overrides: { selectedFolderId?: string | "all" } = {}
  ) => {
    await refreshWorkspaceNotes({
      workspaceId: activeWorkspaceId,
      filters: {
        selectedView,
        selectedUserId,
        selectedFolderId: overrides.selectedFolderId ?? selectedFolderId,
        selectedTag,
        searchQuery
      }
    });
  }, [
    activeWorkspaceId,
    refreshWorkspaceNotes,
    searchQuery,
    selectedFolderId,
    selectedTag,
    selectedUserId,
    selectedView
  ]);

  const updateFolder = useCallback(async (
    folder: FolderRecord,
    update: Partial<Pick<FolderRecord, "name" | "is_pinned">>
  ): Promise<FolderUpdateResult> => {
    setError(null);
    try {
      await apiFetch<FolderRecord>(`/api/folders/${folder.id}`, {
        method: "PATCH",
        workspaceId: activeWorkspaceId,
        body: JSON.stringify(update)
      });
      setOpenFolderMenuId(null);
      await loadWorkspace(activeWorkspaceId);
      await refreshNotes();
      return { ok: true };
    } catch (err) {
      const message = folderActionErrorMessage(err, update.name ? "rename" : "change");
      setError(message);
      return { ok: false, error: message };
    }
  }, [activeWorkspaceId, loadWorkspace, refreshNotes, setError, setOpenFolderMenuId]);

  const reorderFolders = useCallback(async (folderIds: string[]) => {
    setError(null);
    try {
      await apiFetch<FolderRecord[]>("/api/folders/order", {
        method: "PATCH",
        workspaceId: activeWorkspaceId,
        body: JSON.stringify({ folder_ids: folderIds })
      });
      setOpenFolderMenuId(null);
      await loadWorkspace(activeWorkspaceId);
      await refreshNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sort folders.");
    }
  }, [activeWorkspaceId, loadWorkspace, refreshNotes, setError, setOpenFolderMenuId]);

  const deleteFolder = useCallback(async (folder: FolderRecord) => {
    const confirmed = window.confirm(
      `Archive "${folder.name}"? Notes and sources will be moved out of the active folders list.`
    );
    if (!confirmed) return;

    setError(null);
    try {
      await apiFetch(`/api/folders/${folder.id}`, {
        method: "DELETE",
        workspaceId: activeWorkspaceId
      });
      setOpenFolderMenuId(null);
      if (selectedFolderId === folder.id) {
        setSelectedFolderId("all");
        await loadWorkspace(activeWorkspaceId);
        await refreshNotes({ selectedFolderId: "all" });
        return;
      }
      await loadWorkspace(activeWorkspaceId);
      await refreshNotes();
    } catch (err) {
      setError(folderActionErrorMessage(err, "delete"));
    }
  }, [
    activeWorkspaceId,
    loadWorkspace,
    refreshNotes,
    selectedFolderId,
    setError,
    setOpenFolderMenuId,
    setSelectedFolderId
  ]);

  const toggleNoteStar = useCallback(async (note: NoteRecord) => {
    try {
      await toggleWorkspaceNoteStar(note);
    } catch {
      setError("Could not update the star. Please refresh the Mianotes service and try again.");
    }
  }, [setError, toggleWorkspaceNoteStar]);

  const moveNote = useCallback(async (
    note: NoteRecord,
    folderId: string
  ): Promise<NoteMoveResult> => {
    setError(null);
    try {
      const updatedNote = await apiFetch<NoteRecord>(`/api/notes/${note.id}`, {
        method: "PATCH",
        workspaceId: activeWorkspaceId,
        body: JSON.stringify({ folder_id: folderId })
      });
      addOrMergeNote({ ...updatedNote, folder_id: updatedNote.folder?.id ?? folderId });
      await refreshFolderCounts({ workspaceId: activeWorkspaceId });
      await refreshNotes();
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not move note";
      setError(message);
      return { ok: false, error: message };
    }
  }, [activeWorkspaceId, addOrMergeNote, refreshFolderCounts, refreshNotes, setError]);

  const openNote = useCallback(async (note: NoteRecord, startInEdit = false) => {
    const previousScreen = navigationSnapshot();
    try {
      const openedNote = await refreshNote(note.id, { workspaceId: activeWorkspaceId });
      pushNavigationSnapshot(previousScreen);
      if (startInEdit && !isNoteJobActive(openedNote)) {
        setNoteIdToEditOnOpen(note.id);
      }
      setOpenedNoteId(note.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open note");
    }
  }, [
    navigationSnapshot,
    pushNavigationSnapshot,
    refreshNote,
    activeWorkspaceId,
    setError,
    setNoteIdToEditOnOpen,
    setOpenedNoteId
  ]);

  return {
    updateFolder,
    reorderFolders,
    deleteFolder,
    refreshNotes,
    openNote,
    moveNote,
    toggleNoteStar
  };
}

export type DashboardActions = ReturnType<typeof useDashboardActions>;
