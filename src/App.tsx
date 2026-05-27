import { Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { AuthScreen } from "./features/auth/AuthScreen";
import { DashboardShell } from "./features/dashboard/DashboardShell";
import { useDashboardActions } from "./features/dashboard/useDashboardActions";
import { useDashboardDismissals } from "./features/dashboard/useDashboardDismissals";
import { useDashboardLifecycle } from "./features/dashboard/useDashboardLifecycle";
import { useDashboardNavigation } from "./features/dashboard/useDashboardNavigation";
import { useDashboardNotes } from "./features/dashboard/useDashboardNotes";
import { useWorkspaceData } from "./features/dashboard/useWorkspaceData";
import { SharedNoteScreen } from "./features/shared/SharedNoteScreen";

function sharedNoteTokenFromPath() {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== "shared" || parts.length < 2) return null;
  return decodeURIComponent(parts[parts.length - 1]);
}

export function App() {
  const sharedNoteToken = sharedNoteTokenFromPath();
  if (sharedNoteToken) {
    return <SharedNoteScreen token={sharedNoteToken} />;
  }
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const workspace = useWorkspaceData();
  const {
    currentUser,
    users,
    folders,
    tags,
    notes,
    isLoading,
    bootstrap,
    resetWorkspaceData
  } = workspace;
  const navigation = useDashboardNavigation({
    currentUserId: currentUser?.id ?? null,
    resetWorkspaceData
  });
  const {
    selectedView,
    selectedUserId,
    selectedFolderId,
    selectedTag,
    openedNoteId,
    searchQuery,
    currentPage,
    isAccountOpen,
    isViewFilterOpen,
    isSidebarOpen,
    openFolderMenuId,
    setOpenFolderMenuId,
    setIsAccountOpen,
    setIsViewFilterOpen,
    setIsSidebarOpen
  } = navigation;
  const [error, setError] = useState<string | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const viewFilterRef = useRef<HTMLDivElement | null>(null);
  const folderActionsMenuRef = useRef<HTMLDivElement | null>(null);

  const closeAccountMenu = useCallback(() => setIsAccountOpen(false), [setIsAccountOpen]);
  const closeViewFilter = useCallback(() => setIsViewFilterOpen(false), [setIsViewFilterOpen]);
  const closeFolderMenu = useCallback(() => setOpenFolderMenuId(null), [setOpenFolderMenuId]);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), [setIsSidebarOpen]);

  useDashboardDismissals({
    isAccountOpen,
    accountMenuRef,
    onCloseAccountMenu: closeAccountMenu,
    isViewFilterOpen,
    viewFilterRef,
    onCloseViewFilter: closeViewFilter,
    openFolderMenuId,
    folderActionsMenuRef,
    onCloseFolderMenu: closeFolderMenu,
    isSidebarOpen,
    onCloseSidebar: closeSidebar
  });

  const notesView = useDashboardNotes({
    notes,
    folders,
    tags,
    users,
    selectedView,
    selectedUserId,
    selectedFolderId,
    selectedTag,
    searchQuery,
    currentPage,
    openedNoteId
  });

  const actions = useDashboardActions({
    workspace,
    navigation,
    selectedFolderId,
    setError
  });

  useDashboardLifecycle({ workspace, navigation, notesView });

  if (isLoading) {
    return (
      <main className="screen centered">
        <Loader2 className="spin" size={28} />
      </main>
    );
  }

  if (!currentUser) {
    return <AuthScreen onSignedIn={bootstrap} />;
  }

  return (
    <DashboardShell
      workspace={{ ...workspace, currentUser }}
      navigation={navigation}
      notesView={notesView}
      refs={{ accountMenuRef, viewFilterRef, folderActionsMenuRef }}
      actions={actions}
      error={error}
      setError={setError}
    />
  );
}
