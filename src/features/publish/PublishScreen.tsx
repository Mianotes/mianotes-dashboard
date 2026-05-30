import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { apiFetch, mediaPath } from "../../api/client";
import type {
  FolderRecord,
  PublishDraftNoteRecord,
  PublishDraftRecord,
  PublishNavigationGroupRecord,
  PublishResultRecord,
  PublishThemeRecord,
  StorageSettingsRecord,
  TagRecord,
  UserRecord
} from "../../api/types";
import { ScreenToolbar } from "../../components/layout/ScreenToolbar";
import { PublishNavigationTable } from "./PublishNavigationTable";
import { PublishControls } from "./PublishControls";
import {
  PublishSiteConfigurationForm,
  type PublishHeaderLink,
  type PublishSiteConfigurationState
} from "./PublishSiteConfigurationForm";
import { PublishStep } from "./PublishStep";

type PublishConfigurationErrors = {
  siteConfig?: string;
};

const knownSiteConfigurationKeys = new Set([
  "brand",
  "version",
  "headerLinks",
  "showPreviousVersions",
  "footerHtml"
]);

const defaultSiteConfiguration: PublishSiteConfigurationState = {
  brand: "mianotes",
  version: "0.1.0",
  headerLinks: [],
  showPreviousVersions: true,
  footerHtml: "Copyright © Your Name Here.",
  extraConfiguration: {}
};

function navigationPathSet(groups: PublishNavigationGroupRecord[]) {
  return new Set(groups.flatMap((group) => group.items.map((item) => item.path)));
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function headerLinksFromConfig(value: unknown): PublishHeaderLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    const title = stringValue(candidate.title, "").trim();
    const url = stringValue(candidate.url, "").trim();
    return title && url ? [{ title, url }] : [];
  }).slice(0, 6);
}

function siteConfigurationFromRecord(
  value: Record<string, unknown>
): PublishSiteConfigurationState {
  const extraConfiguration = Object.fromEntries(
    Object.entries(value).filter(([key]) => !knownSiteConfigurationKeys.has(key))
  );
  return {
    brand: stringValue(value.brand, defaultSiteConfiguration.brand),
    version: stringValue(value.version, defaultSiteConfiguration.version),
    headerLinks: headerLinksFromConfig(value.headerLinks),
    showPreviousVersions: typeof value.showPreviousVersions === "boolean"
      ? value.showPreviousVersions
      : defaultSiteConfiguration.showPreviousVersions,
    footerHtml: stringValue(value.footerHtml, defaultSiteConfiguration.footerHtml),
    extraConfiguration
  };
}

function siteConfigurationPayload(
  value: PublishSiteConfigurationState
): Record<string, unknown> {
  return {
    ...value.extraConfiguration,
    brand: value.brand.trim(),
    version: value.version.trim(),
    headerLinks: value.headerLinks,
    showPreviousVersions: value.showPreviousVersions,
    footerHtml: value.footerHtml
  };
}

export function PublishScreen({
  folders,
  tags,
  currentUser,
  workspaceName,
  storageSettings,
  onBack,
  onSignOut,
  onOpenProfile,
  onOpenSettings,
  onSwitchWorkspace
}: {
  folders: FolderRecord[];
  tags: TagRecord[];
  currentUser: UserRecord;
  workspaceName: string;
  storageSettings: StorageSettingsRecord | null;
  onBack: () => void;
  onSignOut: () => void;
  onOpenProfile: (profileId?: string | "all") => void;
  onOpenSettings: () => void;
  onSwitchWorkspace: (locationId: string) => Promise<void>;
}) {
  const [themes, setThemes] = useState<PublishThemeRecord[]>([]);
  const [theme, setTheme] = useState("mialight");
  const [folderId, setFolderId] = useState<string | "all">("all");
  const [tagId, setTagId] = useState<string | "all">("all");
  const [siteConfig, setSiteConfig] = useState<PublishSiteConfigurationState>(
    defaultSiteConfiguration
  );
  const [headerLinkDraft, setHeaderLinkDraft] = useState<PublishHeaderLink>({
    title: "",
    url: ""
  });
  const [headerLinkError, setHeaderLinkError] = useState<string | null>(null);
  const [navigationGroups, setNavigationGroups] = useState<PublishNavigationGroupRecord[]>([]);
  const [updatedNotes, setUpdatedNotes] = useState<PublishDraftNoteRecord[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configurationErrors, setConfigurationErrors] = useState<PublishConfigurationErrors>({});
  const [result, setResult] = useState<PublishResultRecord | null>(null);
  const noticeRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const siteConfigRef = useRef<HTMLDivElement | null>(null);
  const visibleUpdatedNotes = useMemo(() => {
    const paths = navigationPathSet(navigationGroups);
    return updatedNotes.filter((note) => paths.has(note.path));
  }, [navigationGroups, updatedNotes]);

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
    setConfigurationErrors({});
    setHeaderLinkError(null);
  }

  function validatePublishPayload() {
    const nextErrors: PublishConfigurationErrors = {};
    const nextSiteConfig = siteConfigurationPayload(siteConfig);

    if (!String(nextSiteConfig.brand).trim()) {
      nextErrors.siteConfig = "Brand is required.";
    } else if (!String(nextSiteConfig.version).trim()) {
      nextErrors.siteConfig = "Version is required.";
    }

    setConfigurationErrors(nextErrors);
    if (nextErrors.siteConfig) {
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
      updated_notes: visibleUpdatedNotes
    };
  }

  async function prepareDraft() {
    setError(null);
    setResult(null);
    setConfigurationErrors({});
    setHeaderLinkError(null);
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
      setSiteConfig(siteConfigurationFromRecord(draft.site_configuration));
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

  function addHeaderLink() {
    const title = headerLinkDraft.title.trim();
    const url = headerLinkDraft.url.trim();
    if (!title || !url) {
      setHeaderLinkError("Add both a title and a URL.");
      return;
    }
    try {
      const parsedUrl = new URL(url);
      if (!["http:", "https:", "mailto:"].includes(parsedUrl.protocol)) {
        setHeaderLinkError("Use a http, https, or mailto URL.");
        return;
      }
    } catch {
      setHeaderLinkError("Use a valid URL.");
      return;
    }
    if (siteConfig.headerLinks.length >= 6) {
      setHeaderLinkError("You can add up to 6 header links.");
      return;
    }
    setSiteConfig((current) => ({
      ...current,
      headerLinks: [...current.headerLinks, { title, url }]
    }));
    setHeaderLinkDraft({ title: "", url: "" });
    setHeaderLinkError(null);
  }

  return (
    <section className="publish-screen">
      <ScreenToolbar
        className="settings-toolbar publish-toolbar"
        workspaceName={workspaceName}
        storageSettings={storageSettings}
        breadcrumbItems={[{ label: "Publish", current: true }]}
        currentUser={currentUser}
        onBack={onBack}
        onOpenProfile={() => onOpenProfile(currentUser.id)}
        onOpenUsers={() => onOpenProfile("all")}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
        onSwitchWorkspace={onSwitchWorkspace}
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
                  <PublishNavigationTable
                    groups={navigationGroups}
                    onChange={setNavigationGroups}
                  />
                  <div ref={siteConfigRef}>
                    <PublishSiteConfigurationForm
                      value={siteConfig}
                      error={configurationErrors.siteConfig}
                      linkDraft={headerLinkDraft}
                      linkError={headerLinkError}
                      onChange={(value) => {
                        setSiteConfig(value);
                        setConfigurationErrors((current) => ({
                          ...current,
                          siteConfig: undefined
                        }));
                      }}
                      onLinkDraftChange={setHeaderLinkDraft}
                      onAddLink={addHeaderLink}
                      onClearLinkError={() => setHeaderLinkError(null)}
                    />
                  </div>
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
