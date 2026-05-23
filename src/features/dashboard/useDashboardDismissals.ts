import { useEffect } from "react";
import type { RefObject } from "react";
import { useOutsideAndEscape } from "../../hooks/useOutsideAndEscape";

type MenuRef = RefObject<HTMLDivElement | null>;

type DashboardDismissalsArgs = {
  isAccountOpen: boolean;
  accountMenuRef: MenuRef;
  onCloseAccountMenu: () => void;
  isViewFilterOpen: boolean;
  viewFilterRef: MenuRef;
  onCloseViewFilter: () => void;
  openFolderMenuId: string | null;
  folderActionsMenuRef: MenuRef;
  onCloseFolderMenu: () => void;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
};

export function useDashboardDismissals({
  isAccountOpen,
  accountMenuRef,
  onCloseAccountMenu,
  isViewFilterOpen,
  viewFilterRef,
  onCloseViewFilter,
  openFolderMenuId,
  folderActionsMenuRef,
  onCloseFolderMenu,
  isSidebarOpen,
  onCloseSidebar
}: DashboardDismissalsArgs) {
  useOutsideAndEscape(isAccountOpen, accountMenuRef, onCloseAccountMenu);
  useOutsideAndEscape(isViewFilterOpen, viewFilterRef, onCloseViewFilter);
  useOutsideAndEscape(
    Boolean(openFolderMenuId),
    folderActionsMenuRef,
    onCloseFolderMenu
  );

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    function closeSidebarOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseSidebar();
      }
    }

    document.addEventListener("keydown", closeSidebarOnEscape);
    return () => document.removeEventListener("keydown", closeSidebarOnEscape);
  }, [isSidebarOpen, onCloseSidebar]);
}
