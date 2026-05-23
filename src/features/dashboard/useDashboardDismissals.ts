import { useEffect } from "react";
import type { RefObject } from "react";

type MenuRef = RefObject<HTMLDivElement | null>;

function useOutsideAndEscape(
  isOpen: boolean,
  ref: MenuRef,
  onClose: () => void
) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        ref.current &&
        !ref.current.contains(event.target)
      ) {
        onClose();
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, ref]);
}

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
