import { useState } from "react";
import type { MutableRefObject } from "react";
import type { NoteRecord, UserRecord } from "../../api/types";
import logoUrl from "../../assets/logo_small.png";
import { Sidebar } from "../../components/layout/Sidebar";
import { Toolbar } from "../../components/layout/Toolbar";
import { MoveNoteDialog } from "../notes/MoveNoteDialog";
import { JobsScreen } from "../jobs/JobsScreen";
import { ProfileScreen } from "../profile/ProfileScreen";
import { PublishScreen } from "../publish/PublishScreen";
import { SettingsScreen } from "../settings/SettingsScreen";
import { DashboardDialogs } from "./DashboardDialogs";
import { NotesWorkspace } from "./NotesWorkspace";
import type { DashboardActions } from "./useDashboardActions";
import type { DashboardNavigation } from "./useDashboardNavigation";
import type { DashboardNotes } from "./useDashboardNotes";
import type { WorkspaceData } from "./useWorkspaceData";

type LoadedWorkspaceData = Omit<WorkspaceData, "currentUser"> & {
  currentUser: UserRecord;
};

type DashboardShellProps = {
  workspace: LoadedWorkspaceData;
  navigation: DashboardNavigation;
  notesView: DashboardNotes;
  refs: {
    accountMenuRef: MutableRefObject<HTMLDivElement | null>;
    viewFilterRef: MutableRefObject<HTMLDivElement | null>;
    folderActionsMenuRef: MutableRefObject<HTMLDivElement | null>;
  };
  actions: DashboardActions;
  error: string | null;
  setError: (message: string | null) => void;
};

export function DashboardShell({
  workspace,
  navigation,
  notesView,
  refs,
  actions,
  error,
  setError
}: DashboardShellProps) {
  const [movingNote, setMovingNote] = useState<NoteRecord | null>(null);
  const setAccountMenuRef = (node: HTMLDivElement | null) => {
    refs.accountMenuRef.current = node;
  };
  const setViewFilterRef = (node: HTMLDivElement | null) => {
    refs.viewFilterRef.current = node;
  };
  const setFolderActionsMenuRef = (node: HTMLDivElement | null) => {
    refs.folderActionsMenuRef.current = node;
  };
  const {
    currentUser,
    users,
    folders,
    tags,
    notes,
    storageCapacity,
    loadWorkspace,
    refreshNote,
    addOrMergeNote,
    updateUserInWorkspace,
    addUserToWorkspace,
    signOut
  } = workspace;
  const {
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
    openedNote
  } = notesView;
  const activeMovingNote = movingNote
    ? notes.find((note) => note.id === movingNote.id) ?? movingNote
    : null;

  return (
    <main className="screen">
      <button
        className="sidebar-backdrop"
        type="button"
        aria-label="Close sidebar"
        aria-hidden={!navigation.isSidebarOpen}
        onClick={() => navigation.setIsSidebarOpen(false)}
      />
      <section
        className={`shell ${openedNote ? "note-open" : ""}`}
        aria-label="Mianotes dashboard"
      >
        <Sidebar
          isOpen={navigation.isSidebarOpen}
          workspaceView={navigation.workspaceView}
          selectedFolderId={navigation.selectedFolderId}
          folders={folders}
          notesByFolder={notesByFolder}
          currentUser={currentUser}
          openFolderMenuId={navigation.openFolderMenuId}
          folderActionsMenuRef={setFolderActionsMenuRef}
          storageCapacity={storageCapacity}
          onAddNote={navigation.openAddNote}
          onSelectDashboard={navigation.selectDashboard}
          onAddFolder={navigation.openAddFolder}
          onSelectFolder={navigation.selectFolder}
          onToggleFolderMenu={(folderId) =>
            navigation.setOpenFolderMenuId((current) =>
              current === folderId ? null : folderId
            )
          }
          onRenameFolder={(folder) => {
            navigation.setOpenFolderMenuId(null);
            navigation.setRenamingFolder(folder);
          }}
          onUpdateFolder={(folder, update) => void actions.updateFolder(folder, update)}
          onReorderFolders={(folderIds) => void actions.reorderFolders(folderIds)}
          onDeleteFolder={(folder) => void actions.deleteFolder(folder)}
          onJobs={navigation.openJobs}
          onPublish={navigation.openPublish}
        />

        <section className="workspace">
          {navigation.workspaceView === "notes" && !openedNote && (
            <Toolbar
              isSidebarOpen={navigation.isSidebarOpen}
              breadcrumbItems={breadcrumbItems}
              selectedFolder={selectedFolder}
              selectedTag={selectedTagRecord}
              searchQuery={navigation.searchQuery}
              tagSuggestions={tagSuggestions}
              selectedView={navigation.selectedView}
              isViewFilterOpen={navigation.isViewFilterOpen}
              viewFilterRef={setViewFilterRef}
              selectedUserId={navigation.selectedUserId}
              selectedUser={selectedUser}
              users={users}
              currentUser={currentUser}
              isAccountOpen={navigation.isAccountOpen}
              accountMenuRef={setAccountMenuRef}
              onOpenSidebar={() => navigation.setIsSidebarOpen(true)}
              onClearTag={navigation.clearSelectedTag}
              onSearchChange={(query) => {
                navigation.setCurrentPage(1);
                navigation.setSearchQuery(query);
              }}
              onSelectTag={(tag) => {
                navigation.setSelectedTag(tag.slug);
                navigation.setCurrentPage(1);
                navigation.setSearchQuery("");
              }}
              onToggleViewFilter={() =>
                navigation.setIsViewFilterOpen((value) => !value)
              }
              onSelectView={(view) => {
                navigation.selectView(view);
                navigation.setIsViewFilterOpen(false);
              }}
              onSelectUser={navigation.selectUser}
              onToggleAccount={() => navigation.setIsAccountOpen((value) => !value)}
              onOpenProfile={navigation.openProfile}
              onOpenSettings={navigation.openSettings}
              onSignOut={() => {
                navigation.setIsAccountOpen(false);
                void signOut();
              }}
            />
          )}

          {navigation.workspaceView === "settings" ? (
            <SettingsScreen
              currentUser={currentUser}
              storageCapacity={storageCapacity}
              onBack={navigation.goBack}
              onSignOut={() => void signOut()}
              onOpenProfile={navigation.openProfile}
              onOpenSettings={navigation.openSettings}
              onFoldersRestored={loadWorkspace}
              onDatabaseSwitched={navigation.handleDatabaseSwitched}
            />
          ) : navigation.workspaceView === "publish" ? (
            <PublishScreen
              key={navigation.publishResetKey}
              folders={folders}
              tags={tags}
              currentUser={currentUser}
              selectedFolderId={navigation.selectedFolderId}
              onBack={navigation.goBack}
              onSignOut={() => void signOut()}
              onOpenProfile={navigation.openProfile}
              onOpenSettings={navigation.openSettings}
            />
          ) : navigation.workspaceView === "jobs" ? (
            <JobsScreen
              currentUser={currentUser}
              onBack={navigation.goBack}
              onSignOut={() => void signOut()}
              onOpenProfile={navigation.openProfile}
              onOpenSettings={navigation.openSettings}
            />
          ) : navigation.workspaceView === "profile" ? (
            <ProfileScreen
              users={users}
              notes={notes}
              folders={folders}
              currentUser={currentUser}
              selectedUserId={navigation.profileUserId}
              onSelectUser={navigation.setProfileUserId}
              onBack={navigation.goBack}
              onSignOut={() => void signOut()}
              onUserUpdated={updateUserInWorkspace}
              onUserCreated={(createdUser) => {
                addUserToWorkspace(createdUser);
                navigation.setProfileUserId(createdUser.id);
              }}
              onSelectTag={navigation.openProfileTag}
              onOpenSettings={navigation.openSettings}
            />
          ) : (
            <NotesWorkspace
              error={error}
              openedNote={openedNote}
              selectedFolder={selectedFolder}
              currentUser={currentUser}
              noteIdToEditOnOpen={navigation.noteIdToEditOnOpen}
              paginatedNotes={paginatedNotes}
              filteredCount={filteredNotes.length}
              clampedPage={clampedPage}
              totalPages={totalPages}
              visibleStart={visibleStart}
              visibleEnd={visibleEnd}
              onDismissError={() => setError(null)}
              onBack={navigation.goBack}
              onRefreshOpenedNote={async () => {
                if (!openedNote) return;
                await refreshNote(openedNote.id);
              }}
              onNoteEditModeChange={(isEditing) => {
                if (!openedNote) return;
                navigation.setNoteIdToEditOnOpen(isEditing ? openedNote.id : null);
              }}
              onOpenedNoteDeleted={async () => {
                navigation.setOpenedNoteId(null);
                await actions.refreshNotes();
              }}
              onAdd={navigation.openAddNote}
              onOpenNote={(note, edit) => void actions.openNote(note, edit)}
              onMoveNote={setMovingNote}
              onToggleStar={(note) => void actions.toggleNoteStar(note)}
              onNotesDeleted={actions.refreshNotes}
              onError={setError}
              onPageChange={navigation.changePage}
            />
          )}
        </section>
      </section>

      <footer className="brand-footer">
        <img className="brand-logo" src={logoUrl} alt="Mianotes" />
      </footer>

      <DashboardDialogs
        isAddOpen={navigation.isAddOpen}
        folders={folders}
        selectedFolderId={navigation.selectedFolderId}
        onCloseAdd={() => navigation.setIsAddOpen(false)}
        onNoteCreated={async (note, shouldEdit) => {
          const previousScreen = navigation.navigationSnapshot({
            workspaceView: "notes",
            openedNoteId: null,
            noteIdToEditOnOpen: null
          });
          navigation.setSelectedView("recent");
          navigation.setSearchQuery("");
          navigation.setSelectedTag("all");
          navigation.setCurrentPage(1);
          addOrMergeNote(note);
          navigation.pushNavigationSnapshot(previousScreen);
          navigation.setOpenedNoteId(note.id);
          navigation.setNoteIdToEditOnOpen(shouldEdit ? note.id : null);
          navigation.setIsAddOpen(false);
          await actions.refreshNotes();
        }}
        onNoteError={setError}
        isFolderOpen={navigation.isFolderOpen}
        onCloseFolder={() => navigation.setIsFolderOpen(false)}
        onFolderCreated={async (folder) => {
          navigation.setIsFolderOpen(false);
          await loadWorkspace();
          navigation.setSelectedFolderId(folder.id);
        }}
        onFolderError={setError}
        renamingFolder={navigation.renamingFolder}
        onCloseRenameFolder={() => navigation.setRenamingFolder(null)}
        onRenameFolder={async (name) => {
          if (!navigation.renamingFolder) {
            return { ok: false, error: "No folder selected." };
          }
          const result = await actions.updateFolder(navigation.renamingFolder, { name });
          if (result.ok) navigation.setRenamingFolder(null);
          return result;
        }}
      />

      {activeMovingNote && (
        <MoveNoteDialog
          note={activeMovingNote}
          folders={folders}
          onClose={() => setMovingNote(null)}
          onMove={actions.moveNote}
        />
      )}
    </main>
  );
}
