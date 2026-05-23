import { File, FileText, Image, Link } from "lucide-react";
import type { FolderRecord, NoteRecord, UserRecord } from "../api/types";

export function noteBodyMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const noteHeadingIndex = lines.findIndex((line) => line.trim().toLowerCase() === "## note");
  if (noteHeadingIndex >= 0) {
    return lines.slice(noteHeadingIndex + 1).join("\n").trimStart();
  }

  const withoutTitle = lines[0]?.startsWith("# ") ? lines.slice(1) : lines;
  return withoutTitle
    .filter((line) => !line.trim().startsWith("Created:"))
    .join("\n")
    .trimStart();
}

export function noteExcerpt(note: NoteRecord) {
  const clean = (note.summary ?? noteBodyMarkdown(note.text ?? ""))
    .replace(/^# .+$/m, "")
    .replace(/Created: .+$/m, "")
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean || "Open this note to see its generated Markdown content.";
}

export function sourceIcon(type: string) {
  if (["pdf", "document", "markdown", "text"].includes(type)) return FileText;
  if (["image"].includes(type)) return Image;
  if (["link", "html"].includes(type)) return Link;
  return File;
}

export function badgeTone(type: string) {
  if (type === "failed") return "danger";
  if (type === "pending_parse" || type === "parsing") return "warning";
  if (type === "link" || type === "html") return "blue";
  if (type === "image") return "green";
  if (type === "pdf") return "violet";
  return "neutral";
}

export function isIndexingPlaceholder(text: string) {
  const normalised = text.toLowerCase();
  return normalised.includes("mia is indexing your link")
    || normalised.includes("status: pending parsing");
}

export function hasUsableNoteContent(note: NoteRecord) {
  const summary = note.summary?.trim() ?? "";
  const body = noteBodyMarkdown(note.text ?? "").trim();

  return Boolean(summary && !isIndexingPlaceholder(summary))
    || Boolean(body && !isIndexingPlaceholder(body));
}

export function isNoteIndexing(note: NoteRecord) {
  const finalStatuses = ["ready", "published", "failed", "completed", "succeeded"];
  const indexingStatuses = ["pending_parse", "parsing"];
  const indexingJobStatuses = ["queued", "running"];
  const isTextNote = ["text", "markdown"].includes(note.source_type);

  if (hasUsableNoteContent(note) || finalStatuses.includes(note.status)) {
    return false;
  }

  return indexingStatuses.includes(note.status)
    || (note.job_status ? indexingJobStatuses.includes(note.job_status) : false)
    || (!note.is_published && !isTextNote);
}

export function countBy<T>(items: T[], getter: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getter(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export function hydrateNotes(notes: NoteRecord[], users: UserRecord[], folders: FolderRecord[]) {
  return notes.map((note) => ({
    ...note,
    user: users.find((user) => user.id === note.user_id) ?? note.user,
    folder: folders.find((folder) => folder.id === note.folder_id) ?? note.folder
  }));
}

export function mergeNoteRecord(current: NoteRecord, update: NoteRecord) {
  return {
    ...current,
    ...update,
    user: update.user ?? current.user,
    folder: update.folder ?? current.folder,
    source_files: update.source_files ?? current.source_files,
    tags: update.tags ?? current.tags,
    comments_count: update.comments_count ?? current.comments_count
  };
}

export function noteSearchText(note: NoteRecord) {
  return [
    note.title,
    note.summary,
    note.text,
    note.user?.name,
    note.folder?.name,
    ...(note.tags ?? [])
  ].filter(Boolean).join(" ").toLowerCase();
}
