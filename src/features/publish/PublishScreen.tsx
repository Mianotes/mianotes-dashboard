import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch, mediaPath } from "../../api/client";
import type {
  FolderRecord,
  PublishDraftNoteRecord,
  PublishDraftRecord,
  PublishNavigationGroupRecord,
  PublishResultRecord,
  PublishThemeRecord,
  TagRecord,
  UserRecord
} from "../../api/types";
import { ScreenToolbar } from "../../components/layout/ScreenToolbar";
import { JsonBlock } from "./JsonBlock";
import { PublishNavigationTable } from "./PublishNavigationTable";
import { PublishControls } from "./PublishControls";
import { PublishStep } from "./PublishStep";
import { UpdatedNotesTable } from "./UpdatedNotesTable";

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

type PublishJsonErrors = {
  siteConfig?: string;
};

export function PublishScreen({
  folders,
  tags,
  currentUser,
  selectedFolderId,
  onBack,
  onSignOut,
  onOpenProfile,
  onOpenSettings
}: {
  folders: FolderRecord[];
  tags: TagRecord[];
  currentUser: UserRecord;
  selectedFolderId: string | "all";
  onBack: () => void;
  onSignOut: () => void;
  onOpenProfile: (profileId?: string | "all") => void;
  onOpenSettings: () => void;
}) {
  const [themes, setThemes] = useState<PublishThemeRecord[]>([]);
  const [theme, setTheme] = useState("mialight");
  const [folderId, setFolderId] = useState<string | "all">(selectedFolderId);
  const [tagId, setTagId] = useState<string | "all">("all");
  const [siteConfig, setSiteConfig] = useState("{}");
  const [navigationGroups, setNavigationGroups] = useState<PublishNavigationGroupRecord[]>([]);
  const [updatedNotes, setUpdatedNotes] = useState<PublishDraftNoteRecord[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonErrors, setJsonErrors] = useState<PublishJsonErrors>({});
  const [result, setResult] = useState<PublishResultRecord | null>(null);
  const noticeRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const siteConfigRef = useRef<HTMLDivElement | null>(null);

  function scrollToElement(element: HTMLElement | null) {
    if (!element) return;
    window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

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

  useEffect(() => {
    if (result) {
      scrollToElement(statusRef.current);
    }
  }, [result]);

  useEffect(() => {
    if (error) {
      scrollToElement(noticeRef.current);
    }
  }, [error]);

  function resetDraft() {
    setHasDraft(false);
    setResult(null);
    setError(null);
    setJsonErrors({});
  }

  function validatePublishPayload() {
    let nextSiteConfig: Record<string, unknown> | null = null;
    const nextErrors: PublishJsonErrors = {};

    try {
      const parsedSiteConfig = parseJsonBlock<unknown>("Site configuration", siteConfig);
      if (!parsedSiteConfig || Array.isArray(parsedSiteConfig) || typeof parsedSiteConfig !== "object") {
        nextErrors.siteConfig = "Site configuration must be a JSON object.";
      } else {
        nextSiteConfig = parsedSiteConfig as Record<string, unknown>;
      }
    } catch (caughtError) {
      nextErrors.siteConfig = caughtError instanceof Error
        ? caughtError.message
        : "Site configuration must be valid JSON.";
    }

    setJsonErrors(nextErrors);
    if (nextErrors.siteConfig || !nextSiteConfig) {
      scrollToElement(siteConfigRef.current);
      return null;
    }

    const nextNavigation = navigationGroups.filter((group) => group.items.length > 0);
    return {
      folder_id: folderId === "all" ? null : folderId,
      tag_id: tagId === "all" ? null : tagId,
      theme,
      site_configuration: nextSiteConfig,
      navigation: nextNavigation,
      updated_notes: updatedNotes
    };
  }

  async function prepareDraft() {
    setError(null);
    setResult(null);
    setJsonErrors({});
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
      setNavigationGroups(draft.navigation);
      setUpdatedNotes(draft.updated_notes);
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
    const payload = validatePublishPayload();
    if (!payload) {
      return;
    }
    setIsPublishing(true);
    try {
      const nextResult = await apiFetch<PublishResultRecord>("/api/publish", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setResult(nextResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not publish the static site.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <section className="publish-screen">
      <ScreenToolbar
        className="settings-toolbar publish-toolbar"
        breadcrumbItems={[{ label: "Publish", current: true }]}
        currentUser={currentUser}
        onBack={onBack}
        onOpenProfile={() => onOpenProfile(currentUser.id)}
        onOpenUsers={() => onOpenProfile("all")}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
      />

      <form className="publish-document" onSubmit={publishSite}>
        {error && (
          <div className="dashboard-notice publish-notice" role="alert" ref={noticeRef}>
            <span>{error}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setError(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="publish-document-header">
          <div>
            <span className="publish-kicker">Static HTML</span>
            <h1>Publish your notes</h1>
          </div>
        </div>

        {result && (
          <div className="publish-status success" role="status" ref={statusRef}>
            <strong>Your static site is ready.</strong>
            <span>
              {result.note_count} notes have been published. Preview the site in your browser, or download everything
              as a ZIP file.
            </span>
            <div className="publish-status-actions">
              <a href={mediaPath(result.site_url)} target="_blank" rel="noreferrer">
                Preview site
              </a>
              <a href={mediaPath(result.download_url)}>
                Download ZIP
              </a>
            </div>
          </div>
        )}

        {!result && (
          <div className="publish-steps">
            <PublishStep
              number={1}
              description="Choose the folders you want to export, filter them by tag, and select the HTML theme you would like to use."
            >
              <PublishControls
                folders={folders}
                folderId={folderId}
                isLoadingThemes={isLoadingThemes}
                isPreparing={isPreparing}
                isPublishing={isPublishing}
                tagId={tagId}
                tags={tags}
                theme={theme}
                themes={themes}
                onContinue={prepareDraft}
                onFolderChange={(nextFolderId) => {
                  setFolderId(nextFolderId);
                  resetDraft();
                }}
                onTagChange={(nextTagId) => {
                  setTagId(nextTagId);
                  resetDraft();
                }}
                onThemeChange={(nextTheme) => {
                  setTheme(nextTheme);
                  resetDraft();
                }}
              />
            </PublishStep>

            {isPreparing ? (
              <div className="publish-loading">
                <Loader2 className="spin" size={24} />
                <span>Preparing publish draft...</span>
              </div>
            ) : null}

            {hasDraft ? (
              <PublishStep
                className="publish-step-review"
                number={2}
                description="Review the generated configuration, navigation, and updated notes before Mianotes builds a static HTML site."
              >
                <div className="publish-blocks">
                  <div ref={siteConfigRef}>
                    <JsonBlock
                      title="Site configuration"
                      error={jsonErrors.siteConfig}
                      value={siteConfig}
                      onChange={(value) => {
                        setSiteConfig(value);
                        setJsonErrors((current) => ({ ...current, siteConfig: undefined }));
                      }}
                    />
                  </div>
                  <PublishNavigationTable
                    groups={navigationGroups}
                    onChange={setNavigationGroups}
                  />
                  <UpdatedNotesTable notes={updatedNotes} />
                </div>
                <footer className="publish-actions">
                  <button className="primary-action" type="submit" disabled={isPublishing}>
                    {isPublishing ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
                    Publish
                  </button>
                </footer>
              </PublishStep>
            ) : null}
          </div>
        )}
      </form>
    </section>
  );
}
