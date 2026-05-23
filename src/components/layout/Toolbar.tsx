import {
  ChevronDown,
  History,
  Menu,
  Search,
  Star,
  Tags,
  User,
  X
} from "lucide-react";
import type { RefCallback } from "react";
import type { FolderRecord, TagRecord, UserRecord } from "../../api/types";
import { AccountMenu } from "./AccountMenu";
import { Breadcrumb } from "./Breadcrumb";

type ToolbarProps = {
  isSidebarOpen: boolean;
  breadcrumbItems: string[];
  selectedFolder?: FolderRecord | null;
  selectedTag?: TagRecord | null;
  searchQuery: string;
  tagSuggestions: TagRecord[];
  selectedView: "recent" | "starred";
  isViewFilterOpen: boolean;
  viewFilterRef: RefCallback<HTMLDivElement>;
  selectedUserId: string;
  selectedUser?: UserRecord | null;
  users: UserRecord[];
  currentUser: UserRecord;
  isAccountOpen: boolean;
  accountMenuRef: RefCallback<HTMLDivElement>;
  onOpenSidebar: () => void;
  onClearTag: () => void;
  onSearchChange: (query: string) => void;
  onSelectTag: (tag: TagRecord) => void;
  onToggleViewFilter: () => void;
  onSelectView: (view: "recent" | "starred") => void;
  onSelectUser: (userId: string) => void;
  onToggleAccount: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

export function Toolbar({
  isSidebarOpen,
  breadcrumbItems,
  selectedFolder,
  selectedTag,
  searchQuery,
  tagSuggestions,
  selectedView,
  isViewFilterOpen,
  viewFilterRef,
  selectedUserId,
  selectedUser,
  users,
  currentUser,
  isAccountOpen,
  accountMenuRef,
  onOpenSidebar,
  onClearTag,
  onSearchChange,
  onSelectTag,
  onToggleViewFilter,
  onSelectView,
  onSelectUser,
  onToggleAccount,
  onOpenProfile,
  onOpenSettings,
  onSignOut
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <button
        className="mobile-sidebar-toggle"
        type="button"
        aria-label="Open sidebar"
        aria-expanded={isSidebarOpen}
        onClick={onOpenSidebar}
      >
        <Menu size={20} />
      </button>
      <Breadcrumb
        items={[
          { label: "Folder" },
          {
            label: selectedFolder?.name ?? "All folders",
            current: breadcrumbItems.length === 0 && !selectedTag
          },
          ...breadcrumbItems.map((item, index) => ({
            label: item,
            current: index === breadcrumbItems.length - 1
          }))
        ]}
      >
        {selectedTag && (
          <button className="breadcrumb-filter-chip" type="button" onClick={onClearTag}>
            {selectedTag.name}
            <X size={12} />
          </button>
        )}
      </Breadcrumb>
      <div className="toolbar-actions">
        <div className="search-area">
          <label className="search-box">
            <Search size={18} />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search notes..."
            />
          </label>
          {tagSuggestions.length > 0 && (
            <div className="tag-suggestions" role="listbox" aria-label="Suggested tags">
              <div className="tag-suggestions-title">Recommended tags</div>
              <div className="tag-suggestions-list">
                {tagSuggestions.map((tag) => (
                  <button key={tag.id} type="button" onClick={() => onSelectTag(tag)}>
                    <Tags size={14} />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="view-filter" ref={viewFilterRef}>
          <button
            className="select-button view-select-button"
            type="button"
            aria-label={`Filter notes by ${selectedView}`}
            aria-expanded={isViewFilterOpen}
            aria-haspopup="menu"
            onClick={onToggleViewFilter}
          >
            {selectedView === "starred" ? (
              <Star className="select-button-icon" size={16} />
            ) : (
              <History className="select-button-icon" size={16} />
            )}
            <ChevronDown className="select-button-chevron" size={12} />
          </button>
          {isViewFilterOpen && (
            <div className="view-filter-menu" role="menu">
              <button
                className={selectedView === "recent" ? "active" : ""}
                type="button"
                role="menuitem"
                onClick={() => onSelectView("recent")}
              >
                <History size={16} />
                <span>Recent</span>
              </button>
              <button
                className={selectedView === "starred" ? "active" : ""}
                type="button"
                role="menuitem"
                onClick={() => onSelectView("starred")}
              >
                <Star size={16} />
                <span>Starred</span>
              </button>
            </div>
          )}
        </div>
        <label className="select-button user-select-button">
          <User className="select-button-icon" size={16} />
          <span className="select-button-label">{selectedUser?.name ?? "All users"}</span>
          <select value={selectedUserId} onChange={(event) => onSelectUser(event.target.value)}>
            <option value="all">All users</option>
            {users.map((person) => (
              <option value={person.id} key={person.id}>{person.name}</option>
            ))}
          </select>
          <ChevronDown className="select-button-chevron" size={12} />
        </label>
        <AccountMenu
          currentUser={currentUser}
          isOpen={isAccountOpen}
          menuRef={accountMenuRef}
          onToggle={onToggleAccount}
          onOpenProfile={() => onOpenProfile(currentUser.id)}
          onOpenUsers={() => onOpenProfile("all")}
          onOpenSettings={onOpenSettings}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}
