import { ChevronLeft, Loader2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch, mediaPath } from "../../api/client";
import type {
  FolderRecord,
  PublishDraftRecord,
  PublishResultRecord,
  PublishThemeRecord,
  TagRecord
} from "../../api/types";
import { Breadcrumb } from "../../components/layout/Breadcrumb";
import { JsonBlock } from "./JsonBlock";

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseJsonBlock<T>(label: string, value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

export function PublishScreen({
  folders,
  tags,
  selectedFolderId,
  onBack
}: {
  folders: FolderRecord[];
  tags: TagRecord[];
  selectedFolderId: string | "all";
  onBack: () => void;
}) {
  const [themes, setThemes] = useState<PublishThemeRecord[]>([]);
  const [theme, setTheme] = useState("mianotes");
  const [folderId, setFolderId] = useState<string | "all">(selectedFolderId);
  const [tagId, setTagId] = useState<string | "all">("all");
  const [siteConfig, setSiteConfig] = useState("{}");
  const [navigation, setNavigation] = useState("[]");
  const [updatedNotes, setUpdatedNotes] = useState("[]");
  const [hasDraft, setHasDraft] = useState(false);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResultRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadThemes() {
      try {
        const items = await apiFetch<PublishThemeRecord[]>("/api/publish/themes");
        if (cancelled) return;
        setThemes(items);
        setTheme((current) => (
          items.some((item) => item.id === current) ? current : items[0]?.id ?? current
        ));
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Could not load publish themes.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingThemes(false);
        }
      }
    }

    void loadThemes();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetDraft() {
    setHasDraft(false);
    setResult(null);
    setError(null);
  }

  function publishPayload() {
    return {
      folder_id: folderId === "all" ? null : folderId,
      tag_id: tagId === "all" ? null : tagId,
      theme,
      site_configuration: parseJsonBlock<Record<string, unknown>>("Site configuration", siteConfig),
      navigation: parseJsonBlock<Array<Record<string, unknown>>>("Navigation", navigation),
      updated_notes: parseJsonBlock<Array<Record<string, unknown>>>("Updated notes", updatedNotes)
    };
  }

  async function prepareDraft() {
    setError(null);
    setResult(null);
    setIsPreparing(true);
    try {
      const params = new URLSearchParams({ theme });
      if (folderId !== "all") {
        params.set("folder_id", folderId);
      }
      if (tagId !== "all") {
        params.set("tag_id", tagId);
      }
      const draft = await apiFetch<PublishDraftRecord>(`/api/publish/draft?${params.toString()}`);
      setSiteConfig(prettyJson(draft.site_configuration));
      setNavigation(prettyJson(draft.navigation));
      setUpdatedNotes(prettyJson(draft.updated_notes));
      setHasDraft(true);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not prepare publish draft.");
    } finally {
      setIsPreparing(false);
    }
  }

  async function publishSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasDraft) {
      return;
    }
    setError(null);
    setResult(null);
    setIsPublishing(true);
    try {
      const payload = publishPayload();
      const nextResult = await apiFetch<PublishResultRecord>("/api/publish", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setResult(nextResult);
      setHasDraft(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not publish the static site.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <section className="publish-screen">
      <header className="note-toolbar publish-toolbar">
        <button className="icon-button back-button" type="button" aria-label="Back" onClick={onBack}>
          <ChevronLeft size={18} />
        </button>
        <Breadcrumb className="publish-breadcrumb" items={[{ label: "Publish", current: true }]} />
      </header>

      <form className="publish-document" onSubmit={publishSite}>
        {error && (
          <div className="dashboard-notice publish-notice" role="alert">
            <span>{error}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setError(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {result && (
          <div className="publish-status success" role="status">
            <strong>Published</strong>
            <span>
              {result.note_count} notes are available at{" "}
              <a href={mediaPath(result.site_url)} target="_blank" rel="noreferrer">the static site</a>.
            </span>
          </div>
        )}

        <div className="publish-document-header">
          <div>
            <span className="publish-kicker">Static HTML</span>
            <h1>Publish your notes</h1>
            <p>
              Review the generated configuration, navigation, and updated notes before
              Mianotes builds a static HTML site.
            </p>
          </div>
        </div>

        {!result && (
          <div className="publish-controls">
            <label>
              Folder
              <select
                value={folderId}
                onChange={(event) => {
                  setFolderId(event.target.value);
                  resetDraft();
                }}
              >
                <option value="all">All folders</option>
                {folders.map((folder) => (
                  <option value={folder.id} key={folder.id}>{folder.name}</option>
                ))}
              </select>
            </label>
            <label>
              Tags
              <select
                value={tagId}
                onChange={(event) => {
                  setTagId(event.target.value);
                  resetDraft();
                }}
              >
                <option value="all">All tags</option>
                {tags.map((tag) => (
                  <option value={tag.id} key={tag.id}>{tag.name}</option>
                ))}
              </select>
            </label>
            <label>
              Theme
              <select
                value={theme}
                onChange={(event) => {
                  setTheme(event.target.value);
                  resetDraft();
                }}
                disabled={isLoadingThemes}
              >
                {themes.map((item) => (
                  <option value={item.id} key={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <button
              className="primary-action"
              type="button"
              onClick={prepareDraft}
              disabled={isLoadingThemes || isPreparing || isPublishing}
            >
              {isPreparing ? <Loader2 className="spin" size={16} /> : null}
              Continue
            </button>
          </div>
        )}

        {isPreparing ? (
          <div className="publish-loading">
            <Loader2 className="spin" size={24} />
            <span>Preparing publish draft...</span>
          </div>
        ) : hasDraft ? (
          <div className="publish-blocks">
            <JsonBlock title="Site configuration" value={siteConfig} onChange={setSiteConfig} />
            <JsonBlock
              title="Navigation"
              description="These are the navigation items the site will display on the left hand sidebar."
              value={navigation}
              onChange={setNavigation}
            />
            <JsonBlock
              title="Updated notes"
              description="List of new and edited files since you last published the site."
              value={updatedNotes}
              onChange={setUpdatedNotes}
            />
          </div>
        ) : null}

        {hasDraft && !result && (
          <footer className="publish-actions">
            <button className="primary-action" type="submit" disabled={isPublishing}>
              {isPublishing ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
              Publish
            </button>
          </footer>
        )}
      </form>
    </section>
  );
}
