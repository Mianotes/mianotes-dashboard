import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { NavigationSnapshot, WorkspaceView } from "../../api/types";
import type { DashboardView } from "./useDashboardNotes";

type UseWorkspaceNavigationArgs = {
  clearSearch: () => void;
  currentUserId: string | null;
  pushNavigationSnapshot: (snapshot?: NavigationSnapshot) => void;
  setSelectedView: Dispatch<SetStateAction<DashboardView>>;
  setSelectedUserId: Dispatch<SetStateAction<string | "all">>;
  setSelectedFolderId: Dispatch<SetStateAction<string | "all">>;
  setSelectedTag: Dispatch<SetStateAction<string | "all">>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setWorkspaceView: Dispatch<SetStateAction<WorkspaceView>>;
  setProfileUserId: Dispatch<SetStateAction<string | "all">>;
  setOpenedNoteId: Dispatch<SetStateAction<string | null>>;
  setIsAccountOpen: Dispatch<SetStateAction<boolean>>;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
};

export function useWorkspaceNavigation({
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
}: UseWorkspaceNavigationArgs) {
  const openWorkspaceView = useCallback(
    (view: WorkspaceView, profileId: string | "all" = currentUserId ?? "all") => {
      clearSearch();
      pushNavigationSnapshot();
      setWorkspaceView(view);
      setProfileUserId(profileId);
      setOpenedNoteId(null);
      setIsAccountOpen(false);
      setIsSidebarOpen(false);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    },
    [
      clearSearch,
      currentUserId,
      pushNavigationSnapshot,
      setIsAccountOpen,
      setIsSidebarOpen,
      setOpenedNoteId,
      setProfileUserId,
      setWorkspaceView
    ]
  );

  const openProfile = useCallback(
    (profileId: string | "all" = currentUserId ?? "all") => {
      openWorkspaceView("profile", profileId);
    },
    [currentUserId, openWorkspaceView]
  );

  const openSettings = useCallback(() => {
    openWorkspaceView("settings");
  }, [openWorkspaceView]);

  const openPublish = useCallback(() => {
    openWorkspaceView("publish");
  }, [openWorkspaceView]);

  const openProfileTag = useCallback(
    (userId: string, tagSlug: string) => {
      clearSearch();
      pushNavigationSnapshot();
      setSelectedView("recent");
      setSelectedFolderId("all");
      setSelectedUserId(userId);
      setSelectedTag(tagSlug);
      setCurrentPage(1);
      setWorkspaceView("notes");
      setOpenedNoteId(null);
      setIsSidebarOpen(false);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    },
    [
      clearSearch,
      pushNavigationSnapshot,
      setCurrentPage,
      setIsSidebarOpen,
      setOpenedNoteId,
      setSelectedFolderId,
      setSelectedTag,
      setSelectedUserId,
      setSelectedView,
      setWorkspaceView
    ]
  );

  return {
    openProfile,
    openSettings,
    openPublish,
    openProfileTag
  };
}
