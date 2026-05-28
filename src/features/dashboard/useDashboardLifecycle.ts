import { useEffect } from "react";
import { writeDashboardUiState } from "../../utils/dashboardState";
import { findFolderForRoute, routePathForState } from "../../utils/internalRoutes";
import { hasUsableNoteContent } from "../../utils/notes";
import type { DashboardNavigation } from "./useDashboardNavigation";
import type { DashboardNotes } from "./useDashboardNotes";
import type { WorkspaceData } from "./useWorkspaceData";

type UseDashboardLifecycleArgs = {
  workspace: WorkspaceData;
  navigation: DashboardNavigation;
  notesView: DashboardNotes;
};

export function useDashboardLifecycle({
  workspace,
  navigation,
  notesView
}: UseDashboardLifecycleArgs) {
  const {
    currentUser,
    users,
    folders,
    tags,
    notes,
    activeWorkspace,
    isWorkspaceLoaded,
    bootstrap,
    refreshNotes: refreshWorkspaceNotes,
    refreshNote
  } = workspace;
  const {
    selectedView,
    selectedUserId,
    selectedFolderId,
    selectedTag,
    openedNoteId,
    searchQuery,
    currentPage,
    workspaceView,
    profileUserId,
    noteIdToEditOnOpen,
    pendingFolderRoute,
    setSelectedUserId,
    setSelectedFolderId,
    setSelectedTag,
    setOpenedNoteId,
    setCurrentPage,
    setWorkspaceView,
    setProfileUserId,
    setNoteIdToEditOnOpen,
    setPendingFolderRoute
  } = navigation;
  const { totalPages, clampedPage, openedNote, hasPendingNotes } = notesView;

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, setCurrentPage, totalPages]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded) return;

    if (pendingFolderRoute) {
      const folder = findFolderForRoute(folders, pendingFolderRoute);
      setWorkspaceView("notes");
      setSelectedFolderId(folder?.id ?? "all");
      setSelectedTag("all");
      setOpenedNoteId(null);
      setNoteIdToEditOnOpen(null);
      setCurrentPage(1);
      setPendingFolderRoute(null);
      return;
    }

    setProfileUserId((current) => (
      current === "all" || users.some((user) => user.id === current)
        ? current
        : currentUser.id
    ));
    setSelectedUserId((current) => (
      current === "all" || users.some((user) => user.id === current) ? current : "all"
    ));
    setSelectedFolderId((current) => (
      current === "all" || folders.some((folder) => folder.id === current) ? current : "all"
    ));
    setSelectedTag((current) => (
      current === "all" || tags.some((tag) => tag.slug === current) ? current : "all"
    ));
    setOpenedNoteId((current) => (
      current === null || notes.some((note) => note.id === current) ? current : null
    ));
  }, [
    currentUser,
    folders,
    isWorkspaceLoaded,
    notes,
    pendingFolderRoute,
    setCurrentPage,
    setNoteIdToEditOnOpen,
    setOpenedNoteId,
    setProfileUserId,
    setPendingFolderRoute,
    setSelectedFolderId,
    setSelectedTag,
    setSelectedUserId,
    setWorkspaceView,
    tags,
    users
  ]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded || !hasPendingNotes) return;

    let cancelled = false;

    async function pollPendingNotes() {
      try {
        await refreshWorkspaceNotes();
        if (cancelled) return;

        if (openedNoteId) {
          await refreshNote(openedNoteId);
        }
      } catch {
        // Keep the current draft visible; explicit user actions surface their own errors.
      }
    }

    void pollPendingNotes();
    const intervalId = window.setInterval(() => {
      void pollPendingNotes();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    currentUser,
    hasPendingNotes,
    isWorkspaceLoaded,
    openedNoteId,
    refreshNote,
    refreshWorkspaceNotes
  ]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded || pendingFolderRoute) return;

    writeDashboardUiState({
      selectedView,
      selectedUserId,
      selectedFolderId,
      selectedTag,
      openedNoteId,
      searchQuery,
      currentPage: clampedPage
    });
  }, [
    clampedPage,
    currentUser,
    isWorkspaceLoaded,
    openedNoteId,
    searchQuery,
    selectedFolderId,
    selectedTag,
    selectedUserId,
    selectedView
  ]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded || pendingFolderRoute) return;

    const nextPath = routePathForState(
      {
        workspaceView,
        selectedView,
        selectedUserId,
        selectedFolderId,
        selectedTag,
        openedNoteId,
        searchQuery,
        currentPage: clampedPage,
        profileUserId,
        noteIdToEditOnOpen
      },
      folders,
      activeWorkspace?.id ?? null
    );
    if (window.location.pathname !== nextPath) {
      window.history.replaceState({ mianotesView: "dashboard" }, "", nextPath);
    }
  }, [
    clampedPage,
    currentUser,
    activeWorkspace?.id,
    folders,
    isWorkspaceLoaded,
    noteIdToEditOnOpen,
    openedNoteId,
    pendingFolderRoute,
    profileUserId,
    searchQuery,
    selectedFolderId,
    selectedTag,
    selectedUserId,
    selectedView,
    workspaceView
  ]);

  useEffect(() => {
    if (!openedNote || openedNote.text) return;
    void refreshNote(openedNote.id).catch(() => undefined);
  }, [openedNote?.id, openedNote?.text, refreshNote]);

  useEffect(() => {
    if (!openedNote || hasUsableNoteContent(openedNote) || openedNote.status === "failed") return;
    if (["text", "markdown"].includes(openedNote.source_type) && openedNote.is_published) return;

    const noteId = openedNote.id;

    async function refreshOpenedNote() {
      try {
        await refreshNote(noteId);
      } catch {
        // Keep the current draft visible; opening or saving the note will surface errors.
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshOpenedNote();
    }, 2500);
    void refreshOpenedNote();

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    openedNote?.id,
    openedNote?.is_published,
    openedNote?.source_type,
    openedNote?.status,
    openedNote?.summary,
    openedNote?.text,
    refreshNote
  ]);

  useEffect(() => {
    if (!openedNoteId) return;
    window.scrollTo(0, 0);
  }, [openedNoteId]);
}
