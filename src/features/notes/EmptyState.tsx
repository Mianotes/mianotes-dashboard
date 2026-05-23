import { Bot, Plus } from "lucide-react";

type EmptyStateProps = {
  onAdd: () => void;
};

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Bot size={34} />
      <h2>No notes found</h2>
      <p>Add a note, upload a file, or paste a link and Mia will add it to your knowledge hub.</p>
      <button className="primary-button empty-state-button" onClick={onAdd}>
        <Plus size={17} />
        Add Note
      </button>
    </div>
  );
}
