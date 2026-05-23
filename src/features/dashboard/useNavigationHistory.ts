import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { NavigationSnapshot } from "../../api/types";
import { defaultDashboardUiState, readDashboardUiState } from "../../utils/dashboardState";

type UseNavigationHistoryArgs = {
  openedNoteId: string | null;
  openedNoteIdRef: MutableRefObject<string | null>;
  navigationStackRef: MutableRefObject<NavigationSnapshot[]>;
  restoreNavigationSnapshot: (snapshot: NavigationSnapshot) => void;
  setOpenedNoteId: Dispatch<SetStateAction<string | null>>;
  setNoteIdToEditOnOpen: Dispatch<SetStateAction<string | null>>;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
};

export function useNavigationHistory({
  openedNoteId,
  openedNoteIdRef,
  navigationStackRef,
  restoreNavigationSnapshot,
  setOpenedNoteId,
  setNoteIdToEditOnOpen,
  setIsSidebarOpen
}: UseNavigationHistoryArgs) {
  useEffect(() => {
    const initialNoteId = openedNoteIdRef.current;
    window.history.replaceState({ mianotesView: "dashboard-root" }, "", window.location.href);
    if (initialNoteId) {
      navigationStackRef.current.push({
        ...defaultDashboardUiState,
        ...readDashboardUiState(),
        openedNoteId: null,
        workspaceView: "notes",
        profileUserId: "all",
        noteIdToEditOnOpen: null
      });
      window.history.pushState({ mianotesView: "dashboard" }, "", window.location.href);
    }

    function handleBrowserBack() {
      const snapshot = navigationStackRef.current.pop();
      if (snapshot) {
        restoreNavigationSnapshot(snapshot);
        return;
      }

      if (openedNoteIdRef.current) {
        setOpenedNoteId(null);
        setNoteIdToEditOnOpen(null);
      }
    }

    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, [
    navigationStackRef,
    openedNoteIdRef,
    restoreNavigationSnapshot,
    setNoteIdToEditOnOpen,
    setOpenedNoteId
  ]);

  useEffect(() => {
    if (openedNoteId) {
      setIsSidebarOpen(false);
    }
    openedNoteIdRef.current = openedNoteId;
  }, [openedNoteId, openedNoteIdRef, setIsSidebarOpen]);
}
