import type { DashboardUiState } from "../api/types";

export const dashboardUiStateKey = "mianotes.dashboard.uiState";

export const notesPerPage = 10;

export const defaultDashboardUiState: DashboardUiState = {
  selectedView: "recent",
  selectedUserId: "all",
  selectedFolderId: "all",
  selectedTag: "all",
  openedNoteId: null,
  searchQuery: "",
  currentPage: 1
};

export function readDashboardUiState(): DashboardUiState {
  if (typeof window === "undefined") return defaultDashboardUiState;
  try {
    const raw = window.localStorage.getItem(dashboardUiStateKey);
    if (!raw) return defaultDashboardUiState;
    const value = JSON.parse(raw) as Partial<DashboardUiState>;
    return {
      selectedView: value.selectedView === "starred" ? "starred" : "recent",
      selectedUserId: typeof value.selectedUserId === "string" ? value.selectedUserId : "all",
      selectedFolderId: typeof value.selectedFolderId === "string" ? value.selectedFolderId : "all",
      selectedTag: typeof value.selectedTag === "string" ? value.selectedTag : "all",
      openedNoteId: typeof value.openedNoteId === "string" ? value.openedNoteId : null,
      searchQuery: typeof value.searchQuery === "string" ? value.searchQuery : "",
      currentPage: typeof value.currentPage === "number" && value.currentPage > 0
        ? Math.floor(value.currentPage)
        : 1
    };
  } catch {
    return defaultDashboardUiState;
  }
}

export function writeDashboardUiState(state: DashboardUiState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(dashboardUiStateKey, JSON.stringify(state));
  } catch {
    // Ignore storage failures so private browsing or quota issues never break the app.
  }
}
