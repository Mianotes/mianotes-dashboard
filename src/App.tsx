import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AuthScreen } from "./features/auth/AuthScreen";
import { DashboardShell } from "./features/dashboard/DashboardShell";
import { useDashboardActions } from "./features/dashboard/useDashboardActions";
import { useDashboardDismissals } from "./features/dashboard/useDashboardDismissals";
import { useDashboardLifecycle } from "./features/dashboard/useDashboardLifecycle";
import { useDashboardNavigation } from "./features/dashboard/useDashboardNavigation";
import { useDashboardNotes } from "./features/dashboard/useDashboardNotes";
import { useWorkspaceData } from "./features/dashboard/useWorkspaceData";
import { PrintableNoteScreen } from "./features/notes/PrintableNoteScreen";
import { SharedNoteScreen } from "./features/shared/SharedNoteScreen";
import { readInternalRoute } from "./utils/internalRoutes";

function sharedNoteRouteFromPath() {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== "shared" || parts.length < 2) return null;
  if (parts[1] === "workspaces" && parts.length >= 4) {
    return {
      workspaceId: decodeURIComponent(parts[2]),
      token: decodeURIComponent(parts[parts.length - 1])
    };
  }
  return {
    workspaceId: "default",
    token: decodeURIComponent(parts[parts.length - 1])
  };
}

export function App() {
  const sharedNoteRoute = sharedNoteRouteFromPath();
  if (sharedNoteRoute) {
    return <SharedNoteScreen workspaceId={sharedNoteRoute.workspaceId} token={sharedNoteRoute.token} />;
  }
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const initialRoute = useMemo(() => readInternalRoute(), []);
  const isPrintNoteRoute = useMemo(() => {
    if (typeof window === "undefined") return false;
    return initialRoute.kind === "note" && new URLSearchParams(window.location.search).get("print") === "1";
  }, [initialRoute]);
  const workspace = useWorkspaceData(initialRoute.workspaceId);
  const {
    currentUser,
    users,
    folders,
    tags,
    notes,
    openedNote,
    notesTotal,
    nextNotesCursor,
    folderNoteCounts,
    isLoading,
    bootstrap,
    resetWorkspaceData
  } = workspace;
  const navigation = useDashboardNavigation({
    currentUserId: currentUser?.id ?? null,
    initialRoute,
    resetWorkspaceData
  });
  const {
    selectedView,
    selectedUserId,
    selectedFolderId,
    selectedTag,
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

  useEffect(() => {
    if (!error) return undefined;
    const timeout = window.setTimeout(() => setError(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [error]);

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
    openedNote,
    notesTotal,
    nextNotesCursor,
    folderNoteCounts,
    folders,
    tags,
    users,
    selectedView,
    selectedUserId,
    selectedFolderId,
    selectedTag,
    searchQuery,
    currentPage
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
    return <UnauthenticatedApp onSignedIn={() => { void bootstrap(null); }} />;
  }

  if (isPrintNoteRoute && initialRoute.kind === "note") {
    return <PrintableNoteScreen noteId={initialRoute.noteId} workspaceId={initialRoute.workspaceId} />;
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

function UnauthenticatedApp({ onSignedIn }: { onSignedIn: () => void }) {
  const [isRouteReady, setIsRouteReady] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.location.pathname === "/";
  });

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
    setIsRouteReady(true);
  }, []);

  if (!isRouteReady) {
    return (
      <main className="screen centered">
        <Loader2 className="spin" size={28} />
      </main>
    );
  }

  return <AuthScreen onSignedIn={onSignedIn} />;
}
