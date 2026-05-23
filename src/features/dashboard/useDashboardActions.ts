import { useCallback } from "react";
import { apiFetch } from "../../api/client";
import type { FolderRecord, NoteRecord } from "../../api/types";
import { folderActionErrorMessage } from "../../utils/folders";
import type { DashboardNavigation } from "./useDashboardNavigation";
import type { WorkspaceData } from "./useWorkspaceData";

export type FolderUpdateResult = { ok: true } | { ok: false; error: string };

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
    loadWorkspace,
    refreshNotes: refreshWorkspaceNotes,
    refreshNote,
    toggleNoteStar: toggleWorkspaceNoteStar
  } = workspace;
  const {
    setOpenFolderMenuId,
    setSelectedFolderId,
    setOpenedNoteId,
    setNoteIdToEditOnOpen,
    navigationSnapshot,
    pushNavigationSnapshot
  } = navigation;

  const updateFolder = useCallback(async (
    folder: FolderRecord,
    update: Partial<Pick<FolderRecord, "name" | "is_pinned">>
  ): Promise<FolderUpdateResult> => {
    setError(null);
    try {
      await apiFetch<FolderRecord>(`/api/folders/${folder.id}`, {
        method: "PATCH",
        body: JSON.stringify(update)
      });
      setOpenFolderMenuId(null);
      await loadWorkspace();
      return { ok: true };
    } catch (err) {
      const message = folderActionErrorMessage(err, update.name ? "rename" : "change");
      setError(message);
      return { ok: false, error: message };
    }
  }, [loadWorkspace, setError, setOpenFolderMenuId]);

  const deleteFolder = useCallback(async (folder: FolderRecord) => {
    const confirmed = window.confirm(
      `Archive "${folder.name}"? Notes and sources will be moved out of the active folders list.`
    );
    if (!confirmed) return;

    setError(null);
    try {
      await apiFetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      setOpenFolderMenuId(null);
      if (selectedFolderId === folder.id) {
        setSelectedFolderId("all");
      }
      await loadWorkspace();
    } catch (err) {
      setError(folderActionErrorMessage(err, "delete"));
    }
  }, [loadWorkspace, selectedFolderId, setError, setOpenFolderMenuId, setSelectedFolderId]);

  const refreshNotes = useCallback(async () => {
    await refreshWorkspaceNotes({
      onMissingOpenedNote: (availableNoteIds) => {
        setOpenedNoteId((current) => (
          current && availableNoteIds.has(current) ? current : null
        ));
      }
    });
  }, [refreshWorkspaceNotes, setOpenedNoteId]);

  const toggleNoteStar = useCallback(async (note: NoteRecord) => {
    try {
      await toggleWorkspaceNoteStar(note);
    } catch {
      setError("Could not update the star. Please refresh the Mianotes service and try again.");
    }
  }, [setError, toggleWorkspaceNoteStar]);

  const openNote = useCallback(async (note: NoteRecord, startInEdit = false) => {
    const previousScreen = navigationSnapshot();
    try {
      await refreshNote(note.id);
      pushNavigationSnapshot(previousScreen);
      if (startInEdit) {
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
    setError,
    setNoteIdToEditOnOpen,
    setOpenedNoteId
  ]);

  return {
    updateFolder,
    deleteFolder,
    refreshNotes,
    openNote,
    toggleNoteStar
  };
}

export type DashboardActions = ReturnType<typeof useDashboardActions>;
