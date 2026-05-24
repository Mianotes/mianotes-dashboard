export type UserRecord = {
  id: string;
  email: string;
  name: string;
  username: string;
  phone?: string | null;
  role?: string | null;
  is_admin: boolean;
  photo_url?: string | null;
};

export type FolderRecord = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  path?: string | null;
  is_pinned: boolean;
  sort_order: number;
  archived_at: string | null;
  archived_by_user_id?: string | null;
};

export type TagRecord = {
  id: string;
  name: string;
  slug: string;
};

export type SourceFileRecord = {
  id: string;
  original_filename: string;
  content_type: string | null;
  url: string;
};

export type NoteRecord = {
  id: string;
  user?: UserRecord;
  user_id?: string;
  folder?: FolderRecord;
  folder_id?: string;
  title: string;
  status: string;
  source_type: string;
  revision_number: number;
  is_published: boolean;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
  summary?: string;
  text?: string;
  note_url?: string;
  comments_count?: number;
  comments_url?: string;
  source_files?: SourceFileRecord[];
  tags?: TagRecord[];
  job_id?: string | null;
  job_status?: string | null;
};

export type MiaPromptRecord = {
  type: "prompt";
  text: string;
};

export type StorageCapacityRecord = {
  data_dir: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  data_size_bytes: number;
  used_percent: number;
  cache_seconds: number;
  refreshed_at: string;
  cache_expires_at: string;
};

export type StorageLocationRecord = {
  id: string;
  name: string;
  folder_path: string;
  database_path: string;
  is_active: boolean;
  database_exists: boolean;
  notes_count?: number | null;
  users_count?: number | null;
  last_updated_at?: string | null;
};

export type StorageSettingsRecord = {
  active_location: string;
  database_file: string;
  data_dir: string;
  database_path: string;
  locations: StorageLocationRecord[];
};

export type StorageSwitchResponse = {
  storage: StorageSettingsRecord;
  session_ended: boolean;
};

export type ServiceApiKeyRecord = {
  token: string;
};

export type PublishThemeRecord = {
  id: string;
  name: string;
  description: string;
  version: string;
};

export type PublishDraftNoteRecord = {
  title: string;
  path: string;
};

export type PublishNavigationItemRecord = {
  title: string;
  path: string;
};

export type PublishNavigationGroupRecord = {
  title: string;
  items: PublishNavigationItemRecord[];
};

export type PublishDraftRecord = {
  theme: string;
  folder_id?: string | null;
  tag_id?: string | null;
  site_configuration: Record<string, unknown>;
  navigation: PublishNavigationGroupRecord[];
  updated_notes: PublishDraftNoteRecord[];
  generated_at: string;
};

export type PublishResultRecord = {
  id: string;
  theme: string;
  version: string;
  folder_id?: string | null;
  tag_id?: string | null;
  note_count: number;
  html_path: string;
  markdown_path: string;
  url_path: string;
  site_url: string;
  download_url: string;
  created_at: string;
};

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type JobLogEntryRecord = {
  timestamp: string;
  status: string;
  command: string;
  response?: string | null;
};

export type JobRecord = {
  id: string;
  user: UserRecord;
  note_id?: string | null;
  note_title?: string | null;
  job_type: string;
  status: JobStatus;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  log: JobLogEntryRecord[];
  error?: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  finished_at?: string | null;
};

export type EmailCheckResponse = {
  user_id: string | null;
  is_first_user?: boolean;
  master_password_owner_name?: string | null;
  signup_disabled?: boolean;
};

export type DashboardUiState = {
  selectedView: "recent" | "starred";
  selectedUserId: string | "all";
  selectedFolderId: string | "all";
  selectedTag: string | "all";
  openedNoteId: string | null;
  searchQuery: string;
  currentPage: number;
};

export type WorkspaceView = "notes" | "profile" | "publish" | "jobs" | "settings";

export type NavigationSnapshot = DashboardUiState & {
  workspaceView: WorkspaceView;
  profileUserId: string | "all";
  noteIdToEditOnOpen: string | null;
};

export type ProfileDraft = {
  name: string;
  email: string;
  phone: string;
  role: string;
};
