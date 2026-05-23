import type { MDXEditorMethods } from "@mdxeditor/editor";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
import { apiFetch } from "../../api/client";
import type { MiaPromptRecord, NoteRecord } from "../../api/types";

type UseMiaPromptArgs = {
  note: NoteRecord;
  isEditing: boolean;
  isIndexingNote: boolean;
  canChangeNote: boolean;
  cannotChangeNoteMessage: string;
  editorRef: RefObject<MDXEditorMethods | null>;
  currentEditorMarkdown: () => string;
  onDraftTextChange: (text: string) => void;
  onRefresh: () => Promise<void>;
};

export function useMiaPrompt({
  note,
  isEditing,
  isIndexingNote,
  canChangeNote,
  cannotChangeNoteMessage,
  editorRef,
  currentEditorMarkdown,
  onDraftTextChange,
  onRefresh
}: UseMiaPromptArgs) {
  const [commentBody, setCommentBody] = useState("");
  const [miaResponse, setMiaResponse] = useState<string | null>(null);
  const [miaError, setMiaError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [miaLoadingMessage, setMiaLoadingMessage] = useState("Sending your request to Mia...");
  const [isApplyingMia, setIsApplyingMia] = useState(false);
  const miaLoadingTimersRef = useRef<number[]>([]);

  function clearMiaLoadingTimers() {
    miaLoadingTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    miaLoadingTimersRef.current = [];
  }

  function startMiaLoadingMessages() {
    clearMiaLoadingTimers();
    setMiaLoadingMessage("Sending your request to Mia...");
    miaLoadingTimersRef.current = [
      window.setTimeout(() => {
        setMiaLoadingMessage("This might take a few seconds.");
      }, 3000),
      window.setTimeout(() => {
        setMiaLoadingMessage("Processing the response, hold on.");
      }, 6000)
    ];
  }

  useEffect(() => {
    clearMiaLoadingTimers();
    setCommentBody("");
    setMiaResponse(null);
    setMiaError(null);
    setMiaLoadingMessage("Sending your request to Mia...");
    setIsApplyingMia(false);
  }, [note.id]);

  useEffect(() => () => {
    clearMiaLoadingTimers();
  }, []);

  async function submitMiaPrompt(instructions: string, clearInput = false) {
    if (isIndexingNote) {
      setMiaError("Mia is still indexing this note. You can ask questions once the content is ready.");
      return;
    }

    const trimmedInstructions = instructions.trim();
    if (!trimmedInstructions) {
      setMiaError("Please provide instructions for Mia.");
      return;
    }

    const body = trimmedInstructions.toLowerCase().startsWith("@mia")
      ? trimmedInstructions
      : `@mia ${trimmedInstructions}`;

    setIsLoading(true);
    startMiaLoadingMessages();
    setMiaResponse(null);
    setMiaError(null);

    const markdown = isEditing ? currentEditorMarkdown() : undefined;
    try {
      const result = await apiFetch<MiaPromptRecord>(`/api/notes/${note.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body, markdown })
      });
      setMiaResponse(result.text);
      if (clearInput) setCommentBody("");
      await onRefresh();
    } catch (err) {
      setMiaError(err instanceof Error ? err.message : "Could not send comment");
    } finally {
      clearMiaLoadingTimers();
      setIsLoading(false);
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMiaPrompt(commentBody, true);
  }

  async function copyMiaResponse() {
    if (!miaResponse) return;
    await navigator.clipboard?.writeText(miaResponse);
  }

  async function applyMiaResponse(mode: "append" | "replace") {
    if (!miaResponse) return;
    if (!canChangeNote) {
      setMiaError(cannotChangeNoteMessage);
      return;
    }
    if (mode === "replace") {
      const confirmed = window.confirm("Replace this note with Mia's response?");
      if (!confirmed) return;
    }

    const currentText = currentEditorMarkdown().trim();
    const miaText = miaResponse.trim();
    const nextText = mode === "append" && currentText ? `${currentText}\n\n---\n\n${miaText}` : miaText;

    setIsApplyingMia(true);
    setMiaError(null);
    try {
      await apiFetch<NoteRecord>(`/api/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: nextText })
      });
      onDraftTextChange(nextText);
      if (isEditing) {
        editorRef.current?.setMarkdown(nextText);
      }
      setMiaResponse(null);
      setMiaError(null);
      await onRefresh();
    } catch (err) {
      setMiaError(err instanceof Error ? err.message : "Could not update note");
    } finally {
      setIsApplyingMia(false);
    }
  }

  return {
    commentBody,
    miaResponse,
    miaError,
    isLoading,
    isApplyingMia,
    miaLoadingMessage,
    isMiaDisabled: isLoading || isIndexingNote,
    setCommentBody,
    setMiaError,
    submitMiaPrompt,
    addComment,
    copyMiaResponse,
    applyMiaResponse
  };
}
