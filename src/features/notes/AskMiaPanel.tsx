import { MessageCircle } from "lucide-react";
import { lazy, Suspense } from "react";
import type { FormEvent } from "react";
import logoMarkUrl from "../../assets/mianotes_mark.svg";

const MarkdownViewer = lazy(() => import("../../MarkdownViewer"));

const miaQuickActions = [
  { label: "Summarise", prompt: "summarise text" },
  { label: "Extract key points", prompt: "extract key points" },
  { label: "Humanize", prompt: "humanize text" }
] as const;

type AskMiaPanelProps = {
  noteId: string;
  commentBody: string;
  miaResponse: string | null;
  miaError: string | null;
  isLoading: boolean;
  isIndexingNote: boolean;
  isMiaDisabled: boolean;
  isApplyingMia: boolean;
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  miaLoadingMessage: string;
  onCommentBodyChange: (value: string) => void;
  onClearEmptyPromptError: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitPrompt: (prompt: string) => void | Promise<void>;
  onCopyResponse: () => void | Promise<void>;
  onApplyResponse: (mode: "append" | "replace") => void | Promise<void>;
};

export function AskMiaPanel({
  noteId,
  commentBody,
  miaResponse,
  miaError,
  isLoading,
  isIndexingNote,
  isMiaDisabled,
  isApplyingMia,
  canChangeNote,
  cannotChangeNoteMessage,
  miaLoadingMessage,
  onCommentBodyChange,
  onClearEmptyPromptError,
  onSubmit,
  onSubmitPrompt,
  onCopyResponse,
  onApplyResponse
}: AskMiaPanelProps) {
  return (
    <section className="comments-box">
      <h3>Prompt</h3>
      {isIndexingNote && (
        <p className="mia-disabled-note">
          Mia is still indexing this note. You can ask questions once the content is ready.
        </p>
      )}
      {(isLoading || miaResponse) && (
        <div className={`mia-output ${isLoading ? "loading" : "result"}`} aria-live="polite">
          {isLoading ? (
            <div className="mia-loader">
              <img src={logoMarkUrl} alt="" />
              <p>{miaLoadingMessage}</p>
            </div>
          ) : (
            <>
              <div className="mia-output-scroll">
                <Suspense fallback={<div className="editor-loading">Rendering Mia response...</div>}>
                  <MarkdownViewer
                    id={`${noteId}-mia-response`}
                    updatedAt={miaResponse ?? ""}
                    markdown={miaResponse ?? ""}
                  />
                </Suspense>
              </div>
              <div className="mia-output-actions">
                <button type="button" onClick={() => void onCopyResponse()}>Copy</button>
                <button
                  type="button"
                  disabled={isApplyingMia || !canChangeNote}
                  title={!canChangeNote ? cannotChangeNoteMessage : undefined}
                  onClick={() => void onApplyResponse("append")}
                >
                  {isApplyingMia ? "Saving..." : "Append"}
                </button>
                <button
                  type="button"
                  disabled={isApplyingMia || !canChangeNote}
                  title={!canChangeNote ? cannotChangeNoteMessage : undefined}
                  onClick={() => void onApplyResponse("replace")}
                >
                  Replace
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <form onSubmit={onSubmit} className="comment-form">
        <textarea
          value={commentBody}
          disabled={isMiaDisabled}
          onChange={(event) => {
            onCommentBodyChange(event.target.value);
            if (miaError === "Please provide instructions for Mia.") {
              onClearEmptyPromptError();
            }
          }}
          placeholder="Ask Mia anything about this note."
        />
        <div className="mia-action-row">
          <button className="primary-button small ask-mia-button" disabled={isMiaDisabled}>
            <MessageCircle size={16} />
            Ask Mia
          </button>
          <div className="mia-quick-actions">
            {miaQuickActions.map((action) => (
              <button
                className="mia-quick-action"
                disabled={isMiaDisabled}
                key={action.label}
                type="button"
                onClick={() => void onSubmitPrompt(action.prompt)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </form>
      {miaError && (
        <div className="notice danger section-notice" role="alert">
          {miaError}
        </div>
      )}
    </section>
  );
}
