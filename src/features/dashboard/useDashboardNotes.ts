import { useMemo } from "react";
import type { FolderRecord, NoteRecord, TagRecord, UserRecord } from "../../api/types";
import { notesPerPage } from "../../utils/dashboardState";
import { noteSearchText } from "../../utils/notes";

export type DashboardView = "recent" | "starred";

type UseDashboardNotesArgs = {
  notes: NoteRecord[];
  openedNote: NoteRecord | null;
  notesTotal: number | null;
  nextNotesCursor: string | null;
  folderNoteCounts: Record<string, number>;
  folders: FolderRecord[];
  tags: TagRecord[];
  users: UserRecord[];
  selectedView: DashboardView;
  selectedUserId: string | "all";
  selectedFolderId: string | "all";
  selectedTag: string | "all";
  searchQuery: string;
  currentPage: number;
};

export function useDashboardNotes({
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
}: UseDashboardNotesArgs) {
  const notesByFolder = useMemo(
    () => folderNoteCounts,
    [folderNoteCounts]
  );

  const selectedFolder = selectedFolderId === "all"
    ? null
    : folders.find((folder) => folder.id === selectedFolderId) ?? null;
  const selectedTagRecord = selectedTag === "all"
    ? null
    : tags.find((tag) => tag.slug === selectedTag) ?? null;
  const selectedUser = selectedUserId === "all"
    ? null
    : users.find((user) => user.id === selectedUserId) ?? null;
  const breadcrumbItems: string[] = [selectedUser?.name].filter((item): item is string => Boolean(item));

  const tagSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const tagMap = new Map<string, TagRecord>();
    notes.forEach((note) => {
      if (selectedView === "starred" && !note.is_starred) return;
      if (selectedUserId !== "all" && note.user_id !== selectedUserId) return;
      if (selectedFolderId !== "all" && note.folder_id !== selectedFolderId) return;

      const noteMatches = noteSearchText(note).includes(query);
      note.tags?.forEach((tag) => {
        const tagMatches = `${tag.name} ${tag.slug}`.toLowerCase().includes(query);
        if ((noteMatches || tagMatches) && tag.slug !== selectedTag) {
          tagMap.set(tag.slug, tag);
        }
      });
    });

    return Array.from(tagMap.values())
      .sort((first, second) => first.name.localeCompare(second.name))
      .slice(0, 6);
  }, [notes, searchQuery, selectedFolderId, selectedTag, selectedUserId, selectedView]);

  const filteredNotes = notes;
  const clampedPage = Math.max(1, currentPage);
  const pageStartIndex = (clampedPage - 1) * notesPerPage;
  const paginatedNotes = notes;
  const knownTotal = notesTotal ?? null;
  const visibleStart = paginatedNotes.length === 0 ? 0 : pageStartIndex + 1;
  const visibleEnd = pageStartIndex + paginatedNotes.length;
  const hasPreviousPage = clampedPage > 1;
  const hasNextPage = nextNotesCursor !== null;
  const hasPendingNotes = useMemo(
    () => notes.some((note) => ["pending_parse", "parsing"].includes(note.status)),
    [notes]
  );

  return {
    notesByFolder,
    selectedFolder,
    selectedTagRecord,
    selectedUser,
    breadcrumbItems,
    tagSuggestions,
    filteredNotes,
    clampedPage,
    paginatedNotes,
    knownTotal,
    visibleStart,
    visibleEnd,
    hasPreviousPage,
    hasNextPage,
    openedNote,
    hasPendingNotes
  };
}

export type DashboardNotes = ReturnType<typeof useDashboardNotes>;
