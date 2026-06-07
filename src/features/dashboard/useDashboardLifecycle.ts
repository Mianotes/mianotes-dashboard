import { useEffect, useRef } from "react";
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
    activeWorkspace,
    isWorkspaceLoaded,
    bootstrap,
    fetchNotesPage,
    applyLoadedNotePage,
    fetchNote,
    applyLoadedNote,
    clearOpenedNote,
    refreshProfileSummaries
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
  const { clampedPage, openedNote, hasPendingNotes } = notesView;
  const notePageCursorsRef = useRef<(string | null)[]>([null]);
  const noteFilters = {
    selectedView,
    selectedUserId,
    selectedFolderId,
    selectedTag,
    searchQuery
  };
  const noteFiltersKey = JSON.stringify(noteFilters);
  const lastNoteFiltersKeyRef = useRef<string | null>(null);
  const noteListRequestIdRef = useRef(0);
  const openedNoteRequestIdRef = useRef(0);
  const pendingNotesPollRequestIdRef = useRef(0);
  const openedNoteContentRequestIdRef = useRef(0);
  const openedNotePollRequestIdRef = useRef(0);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

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

    setSelectedUserId((current) => (
      current === "all" || users.some((user) => user.id === current) ? current : "all"
    ));
    setSelectedFolderId((current) => (
      current === "all" || folders.some((folder) => folder.id === current) ? current : "all"
    ));
    setSelectedTag((current) => (
      current === "all" || tags.some((tag) => tag.slug === current) ? current : "all"
    ));
    setOpenedNoteId((current) => current);
  }, [
    currentUser,
    folders,
    isWorkspaceLoaded,
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
    if (!currentUser || !isWorkspaceLoaded || pendingFolderRoute) return undefined;

    const requestWorkspaceId = activeWorkspace?.id ?? null;
    const requestId = ++noteListRequestIdRef.current;
    const controller = new AbortController();
    const filtersChanged = lastNoteFiltersKeyRef.current !== noteFiltersKey;
    if (filtersChanged) {
      notePageCursorsRef.current = [null];
      lastNoteFiltersKeyRef.current = noteFiltersKey;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return undefined;
      }
    }

    const cursor = notePageCursorsRef.current[currentPage - 1] ?? null;
    void fetchNotesPage(noteFilters, cursor, {
      workspaceId: requestWorkspaceId,
      signal: controller.signal
    }).then((page) => {
      if (controller.signal.aborted || requestId !== noteListRequestIdRef.current) return;
      applyLoadedNotePage(page);
      if (page.next_cursor) {
        notePageCursorsRef.current[currentPage] = page.next_cursor;
      } else {
        notePageCursorsRef.current = notePageCursorsRef.current.slice(0, currentPage);
      }
    }).catch((error) => {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
    });

    return () => {
      controller.abort();
    };
  }, [
    activeWorkspace?.id,
    applyLoadedNotePage,
    currentPage,
    currentUser,
    fetchNotesPage,
    isWorkspaceLoaded,
    noteFiltersKey,
    pendingFolderRoute,
    setCurrentPage
  ]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded || pendingFolderRoute) return;
    if (!openedNoteId) {
      clearOpenedNote();
      return;
    }
    if (openedNote?.id === openedNoteId) return;
    const requestWorkspaceId = activeWorkspace?.id ?? null;
    const requestId = ++openedNoteRequestIdRef.current;
    const controller = new AbortController();
    void fetchNote(openedNoteId, {
      workspaceId: requestWorkspaceId,
      signal: controller.signal
    }).then((note) => {
      if (controller.signal.aborted || requestId !== openedNoteRequestIdRef.current) return;
      applyLoadedNote(note);
    }).catch((error) => {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
    });
    return () => {
      controller.abort();
    };
  }, [
    activeWorkspace?.id,
    applyLoadedNote,
    clearOpenedNote,
    currentUser,
    fetchNote,
    isWorkspaceLoaded,
    openedNote?.id,
    openedNoteId,
    pendingFolderRoute
  ]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded || workspaceView !== "profile") return;
    void refreshProfileSummaries().catch(() => undefined);
  }, [currentUser, isWorkspaceLoaded, refreshProfileSummaries, workspaceView]);

  useEffect(() => {
    if (!currentUser || !isWorkspaceLoaded || !hasPendingNotes) return;

    let cancelled = false;
    let controller: AbortController | null = null;
    const requestWorkspaceId = activeWorkspace?.id ?? null;

    async function pollPendingNotes() {
      controller?.abort();
      controller = new AbortController();
      const requestId = ++pendingNotesPollRequestIdRef.current;
      try {
        const page = await fetchNotesPage(noteFilters, notePageCursorsRef.current[currentPage - 1] ?? null, {
          workspaceId: requestWorkspaceId,
          signal: controller.signal
        });
        if (cancelled || controller.signal.aborted || requestId !== pendingNotesPollRequestIdRef.current) return;
        applyLoadedNotePage(page);

        if (openedNoteId) {
          const note = await fetchNote(openedNoteId, {
            workspaceId: requestWorkspaceId,
            signal: controller.signal
          });
          if (cancelled || controller.signal.aborted || requestId !== pendingNotesPollRequestIdRef.current) return;
          applyLoadedNote(note);
        }
      } catch (error) {
        if (controller?.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        // Keep the current draft visible; explicit user actions surface their own errors.
      }
    }

    void pollPendingNotes();
    const intervalId = window.setInterval(() => {
      void pollPendingNotes();
    }, 2500);

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(intervalId);
    };
  }, [
    activeWorkspace?.id,
    applyLoadedNote,
    applyLoadedNotePage,
    currentUser,
    currentPage,
    fetchNote,
    fetchNotesPage,
    hasPendingNotes,
    isWorkspaceLoaded,
    noteFiltersKey,
    openedNoteId
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
    if (!openedNote || openedNote.text) return undefined;

    const requestWorkspaceId = activeWorkspace?.id ?? null;
    const requestId = ++openedNoteContentRequestIdRef.current;
    const controller = new AbortController();

    void fetchNote(openedNote.id, {
      workspaceId: requestWorkspaceId,
      signal: controller.signal
    }).then((note) => {
      if (controller.signal.aborted || requestId !== openedNoteContentRequestIdRef.current) return;
      applyLoadedNote(note);
    }).catch((error) => {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
    });

    return () => {
      controller.abort();
    };
  }, [activeWorkspace?.id, applyLoadedNote, fetchNote, openedNote?.id, openedNote?.text]);

  useEffect(() => {
    if (!openedNote || hasUsableNoteContent(openedNote) || openedNote.status === "failed") return;
    if (["text", "markdown"].includes(openedNote.source_type) && openedNote.is_published) return;

    const noteId = openedNote.id;
    const requestWorkspaceId = activeWorkspace?.id ?? null;
    let cancelled = false;
    let controller: AbortController | null = null;

    async function refreshOpenedNote() {
      controller?.abort();
      controller = new AbortController();
      const requestId = ++openedNotePollRequestIdRef.current;
      try {
        const note = await fetchNote(noteId, {
          workspaceId: requestWorkspaceId,
          signal: controller.signal
        });
        if (cancelled || controller.signal.aborted || requestId !== openedNotePollRequestIdRef.current) return;
        applyLoadedNote(note);
      } catch (error) {
        if (controller?.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        // Keep the current draft visible; opening or saving the note will surface errors.
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshOpenedNote();
    }, 2500);
    void refreshOpenedNote();

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(intervalId);
    };
  }, [
    activeWorkspace?.id,
    applyLoadedNote,
    fetchNote,
    openedNote?.id,
    openedNote?.is_published,
    openedNote?.source_type,
    openedNote?.status,
    openedNote?.summary,
    openedNote?.text
  ]);

  useEffect(() => {
    if (!openedNoteId) return;
    window.scrollTo(0, 0);
  }, [openedNoteId]);
}
