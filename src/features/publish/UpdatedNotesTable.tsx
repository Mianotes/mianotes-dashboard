import type { PublishDraftNoteRecord } from "../../api/types";

export function UpdatedNotesTable({ notes }: { notes: PublishDraftNoteRecord[] }) {
  return (
    <section className="publish-updated-notes">
      <header>
        <div>
          <h2>New notes</h2>
          <p>New files since you last published the site.</p>
        </div>
        <span>{notes.length} {notes.length === 1 ? "note" : "notes"}</span>
      </header>
      {notes.length > 0 ? (
        <div className="publish-updated-table" role="table" aria-label="New notes">
          <div className="publish-updated-row publish-updated-head" role="row">
            <span role="columnheader">Title</span>
            <span role="columnheader">Path</span>
          </div>
          {notes.map((note) => (
            <div className="publish-updated-row" role="row" key={`${note.path}-${note.title}`}>
              <span role="cell">{note.title}</span>
              <code role="cell">{note.path}</code>
            </div>
          ))}
        </div>
      ) : (
        <p className="publish-updated-empty">No new notes are waiting to publish.</p>
      )}
    </section>
  );
}
