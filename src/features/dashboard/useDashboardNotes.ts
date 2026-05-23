import { useMemo } from "react";
import type { FolderRecord, NoteRecord, TagRecord, UserRecord } from "../../api/types";
import { notesPerPage } from "../../utils/dashboardState";
import { countBy, noteSearchText } from "../../utils/notes";

export type DashboardView = "recent" | "starred";

type UseDashboardNotesArgs = {
  notes: NoteRecord[];
  folders: FolderRecord[];
  tags: TagRecord[];
  users: UserRecord[];
  selectedView: DashboardView;
  selectedUserId: string | "all";
  selectedFolderId: string | "all";
  selectedTag: string | "all";
  searchQuery: string;
  currentPage: number;
  openedNoteId: string | null;
};

export function useDashboardNotes({
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
}: UseDashboardNotesArgs) {
  const notesByFolder = useMemo(
    () => countBy(notes, (note) => note.folder?.id ?? note.folder_id ?? ""),
    [notes]
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

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notes.filter((note) => {
      if (selectedView === "starred" && !note.is_starred) return false;
      if (selectedUserId !== "all" && note.user_id !== selectedUserId) return false;
      if (selectedFolderId !== "all" && note.folder_id !== selectedFolderId) return false;
      if (selectedTag !== "all" && !note.tags?.some((tag) => tag.slug === selectedTag)) return false;
      if (!query) return true;

      return noteSearchText(note).includes(query);
    });
  }, [notes, searchQuery, selectedFolderId, selectedTag, selectedUserId, selectedView]);

  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / notesPerPage));
  const clampedPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (clampedPage - 1) * notesPerPage;
  const paginatedNotes = filteredNotes.slice(pageStartIndex, pageStartIndex + notesPerPage);
  const visibleStart = filteredNotes.length === 0 ? 0 : pageStartIndex + 1;
  const visibleEnd = Math.min(pageStartIndex + paginatedNotes.length, filteredNotes.length);
  const openedNote = notes.find((note) => note.id === openedNoteId) ?? null;
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
    totalPages,
    clampedPage,
    paginatedNotes,
    visibleStart,
    visibleEnd,
    openedNote,
    hasPendingNotes
  };
}

export type DashboardNotes = ReturnType<typeof useDashboardNotes>;
