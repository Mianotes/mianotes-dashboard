import type { UserRecord } from "../../api/types";
import { UserAvatar } from "../../components/ui/UserAvatar";

type NoteAuthorMetaProps = {
  user: UserRecord | undefined;
  authorName: string;
  noteDate: string;
};

export function NoteAuthorMeta({ user, authorName, noteDate }: NoteAuthorMetaProps) {
  return (
    <div className="note-document-meta">
      <UserAvatar user={user} name={authorName} className="note-author-avatar" />
      <div className="note-author-details">
        <strong>{authorName}</strong>
        <span>{noteDate}</span>
      </div>
    </div>
  );
}
