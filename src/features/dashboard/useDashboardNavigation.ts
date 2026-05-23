import { useCallback, useMemo, useRef, useState } from "react";
import type {
  FolderRecord,
  NavigationSnapshot,
  WorkspaceView
} from "../../api/types";
import {
  dashboardUiStateKey,
  defaultDashboardUiState,
  readDashboardUiState
} from "../../utils/dashboardState";
import {
  applyRouteToDashboardState,
  noteEditIdForRoute,
  pendingFolderNameForRoute,
  profileUserIdForRoute,
  readInternalRoute,
  workspaceViewForRoute
} from "../../utils/internalRoutes";
import type { DashboardView } from "./useDashboardNotes";
import { useNavigationHistory } from "./useNavigationHistory";
import { useWorkspaceNavigation } from "./useWorkspaceNavigation";

type UseDashboardNavigationArgs = {
  currentUserId: string | null;
  resetWorkspaceData: () => void;
};

export function useDashboardNavigation({
  currentUserId,
  resetWorkspaceData
}: UseDashboardNavigationArgs) {
  const initialRoute = useMemo(() => readInternalRoute(), []);
  const initialUiState = useMemo(
    () => applyRouteToDashboardState(readDashboardUiState(), initialRoute),
    [initialRoute]
  );
  const [selectedView, setSelectedView] = useState<DashboardView>(initialUiState.selectedView);
  const [selectedUserId, setSelectedUserId] = useState<string | "all">(initialUiState.selectedUserId);
  const [selectedFolderId, setSelectedFolderId] = useState<string | "all">(initialUiState.selectedFolderId);
  const [selectedTag, setSelectedTag] = useState<string | "all">(initialUiState.selectedTag);
  const [openedNoteId, setOpenedNoteId] = useState<string | null>(initialUiState.openedNoteId);
  const [searchQuery, setSearchQuery] = useState(initialUiState.searchQuery);
  const [currentPage, setCurrentPage] = useState(initialUiState.currentPage);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isViewFilterOpen, setIsViewFilterOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(
    workspaceViewForRoute(initialRoute)
  );
  const [publishResetKey, setPublishResetKey] = useState(0);
  const [profileUserId, setProfileUserId] = useState<string | "all">(
    profileUserIdForRoute(initialRoute)
  );
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<FolderRecord | null>(null);
  const [noteIdToEditOnOpen, setNoteIdToEditOnOpen] = useState<string | null>(
    noteEditIdForRoute(initialRoute)
  );
  const [pendingFolderRoute, setPendingFolderRoute] = useState<string | null>(
    pendingFolderNameForRoute(initialRoute)
  );
  const openedNoteIdRef = useRef<string | null>(initialUiState.openedNoteId);
  const navigationStackRef = useRef<NavigationSnapshot[]>([]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const navigationSnapshot = useCallback(
    (overrides: Partial<NavigationSnapshot> = {}): NavigationSnapshot => ({
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
      ...overrides
    }),
    [
      currentPage,
      noteIdToEditOnOpen,
      openedNoteId,
      profileUserId,
      searchQuery,
      selectedFolderId,
      selectedTag,
      selectedUserId,
      selectedView,
      workspaceView
    ]
  );

  const restoreNavigationSnapshot = useCallback((snapshot: NavigationSnapshot) => {
    setSelectedView(snapshot.selectedView);
    setSelectedUserId(snapshot.selectedUserId);
    setSelectedFolderId(snapshot.selectedFolderId);
    setSelectedTag(snapshot.selectedTag);
    setOpenedNoteId(snapshot.openedNoteId);
    setSearchQuery(snapshot.searchQuery);
    setCurrentPage(snapshot.currentPage);
    setWorkspaceView(snapshot.workspaceView);
    setProfileUserId(snapshot.profileUserId);
    setNoteIdToEditOnOpen(snapshot.noteIdToEditOnOpen);
    setIsAccountOpen(false);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const pushNavigationSnapshot = useCallback(
    (snapshot = navigationSnapshot()) => {
      navigationStackRef.current.push(snapshot);
      window.history.pushState({ mianotesView: "dashboard" }, "", window.location.href);
    },
    [navigationSnapshot]
  );

  const goBack = useCallback(() => {
    if (navigationStackRef.current.length > 0) {
      window.history.back();
      return;
    }

    restoreNavigationSnapshot(
      navigationSnapshot({
        workspaceView: "notes",
        openedNoteId: null,
        noteIdToEditOnOpen: null
      })
    );
  }, [navigationSnapshot, restoreNavigationSnapshot]);

  const changePage = useCallback((nextPage: number) => {
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const selectView = useCallback(
    (view: DashboardView) => {
      clearSearch();
      setCurrentPage(1);
      setSelectedView(view);
      setWorkspaceView("notes");
      setOpenedNoteId(null);
      setIsSidebarOpen(false);
    },
    [clearSearch]
  );

  const selectDashboard = useCallback(() => {
    clearSearch();
    setCurrentPage(1);
    setSelectedFolderId("all");
    setSelectedTag("all");
    setWorkspaceView("notes");
    setOpenedNoteId(null);
    setIsSidebarOpen(false);
  }, [clearSearch]);

  const selectFolder = useCallback(
    (folderId: string) => {
      clearSearch();
      setCurrentPage(1);
      setSelectedFolderId(folderId);
      setWorkspaceView("notes");
      setOpenedNoteId(null);
      setIsSidebarOpen(false);
    },
    [clearSearch]
  );

  const selectUser = useCallback(
    (userId: string) => {
      clearSearch();
      setCurrentPage(1);
      setSelectedUserId(userId);
    },
    [clearSearch]
  );

  const clearSelectedTag = useCallback(() => {
    clearSearch();
    setCurrentPage(1);
    setSelectedTag("all");
  }, [clearSearch]);

  const openAddNote = useCallback(() => {
    clearSearch();
    setWorkspaceView("notes");
    setOpenedNoteId(null);
    setIsSidebarOpen(false);
    setIsAddOpen(true);
  }, [clearSearch]);

  const openAddFolder = useCallback(() => {
    clearSearch();
    setWorkspaceView("notes");
    setOpenedNoteId(null);
    setIsSidebarOpen(false);
    setIsFolderOpen(true);
  }, [clearSearch]);

  const handleDatabaseSwitched = useCallback(() => {
    window.localStorage.removeItem(dashboardUiStateKey);
    navigationStackRef.current = [];
    resetWorkspaceData();
    restoreNavigationSnapshot({
      ...defaultDashboardUiState,
      workspaceView: "notes",
      profileUserId: "all",
      noteIdToEditOnOpen: null
    });
  }, [resetWorkspaceData, restoreNavigationSnapshot]);

  const {
    openProfile,
    openSettings,
    openPublish: openPublishView,
    openProfileTag
  } = useWorkspaceNavigation({
    clearSearch,
    currentUserId,
    pushNavigationSnapshot,
    setSelectedView,
    setSelectedUserId,
    setSelectedFolderId,
    setSelectedTag,
    setCurrentPage,
    setWorkspaceView,
    setProfileUserId,
    setOpenedNoteId,
    setIsAccountOpen,
    setIsSidebarOpen
  });

  const openPublish = useCallback(() => {
    setPublishResetKey((current) => current + 1);
    openPublishView();
  }, [openPublishView]);

  useNavigationHistory({
    openedNoteId,
    openedNoteIdRef,
    navigationStackRef,
    restoreNavigationSnapshot,
    setOpenedNoteId,
    setNoteIdToEditOnOpen,
    setIsSidebarOpen
  });

  return {
    selectedView,
    selectedUserId,
    selectedFolderId,
    selectedTag,
    openedNoteId,
    searchQuery,
    currentPage,
    isAddOpen,
    isFolderOpen,
    isAccountOpen,
    isViewFilterOpen,
    isSidebarOpen,
    workspaceView,
    publishResetKey,
    profileUserId,
    openFolderMenuId,
    renamingFolder,
    noteIdToEditOnOpen,
    pendingFolderRoute,
    setSelectedView,
    setSelectedUserId,
    setSelectedFolderId,
    setSelectedTag,
    setOpenedNoteId,
    setSearchQuery,
    setCurrentPage,
    setIsAddOpen,
    setIsFolderOpen,
    setIsAccountOpen,
    setIsViewFilterOpen,
    setIsSidebarOpen,
    setWorkspaceView,
    setProfileUserId,
    setOpenFolderMenuId,
    setRenamingFolder,
    setNoteIdToEditOnOpen,
    setPendingFolderRoute,
    clearSelectedTag,
    navigationSnapshot,
    pushNavigationSnapshot,
    goBack,
    changePage,
    selectView,
    selectDashboard,
    selectFolder,
    selectUser,
    openAddNote,
    openAddFolder,
    openProfile,
    openSettings,
    openPublish,
    handleDatabaseSwitched,
    openProfileTag
  };
}

export type DashboardNavigation = ReturnType<typeof useDashboardNavigation>;
