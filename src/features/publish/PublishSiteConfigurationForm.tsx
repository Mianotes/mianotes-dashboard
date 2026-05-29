import { Plus, X } from "lucide-react";

export type PublishHeaderLink = {
  title: string;
  url: string;
};

export type PublishSiteConfigurationState = {
  brand: string;
  version: string;
  headerLinks: PublishHeaderLink[];
  showPreviousVersions: boolean;
  footerHtml: string;
  extraConfiguration: Record<string, unknown>;
};

const maxHeaderLinks = 6;

type PublishSiteConfigurationFormProps = {
  value: PublishSiteConfigurationState;
  error?: string | null;
  linkDraft: PublishHeaderLink;
  linkError?: string | null;
  onChange: (value: PublishSiteConfigurationState) => void;
  onLinkDraftChange: (value: PublishHeaderLink) => void;
  onAddLink: () => void;
  onClearLinkError: () => void;
};

export function PublishSiteConfigurationForm({
  value,
  error,
  linkDraft,
  linkError,
  onChange,
  onLinkDraftChange,
  onAddLink,
  onClearLinkError
}: PublishSiteConfigurationFormProps) {
  function update(nextValue: Partial<PublishSiteConfigurationState>) {
    onChange({ ...value, ...nextValue });
  }

  function removeHeaderLink(index: number) {
    update({
      headerLinks: value.headerLinks.filter((_, currentIndex) => currentIndex !== index)
    });
  }

  return (
    <section className={`publish-site-config${error ? " has-error" : ""}`}>
      {error ? (
        <div className="publish-site-config-error" role="alert">
          {error}
        </div>
      ) : null}
      <header>
        <div>
          <h2>Site configuration</h2>
          <p>Set the public details Mianotes writes into your static HTML site.</p>
        </div>
      </header>

      <div className="publish-site-config-grid">
        <label className="publish-site-config-field">
          <span>Brand</span>
          <input
            type="text"
            value={value.brand}
            onChange={(event) => update({ brand: event.target.value })}
          />
        </label>

        <label className="publish-site-config-field">
          <span>Version</span>
          <input
            type="text"
            value={value.version}
            onChange={(event) => update({ version: event.target.value })}
          />
        </label>
      </div>

      <div className="publish-site-config-section">
        <div className="publish-site-config-section-header">
          <div>
            <h3>Header links</h3>
            <p>Add up to {maxHeaderLinks} links to show in the site header.</p>
          </div>
          <span>{value.headerLinks.length}/{maxHeaderLinks}</span>
        </div>

        <div className="publish-header-link-form">
          <label className="publish-site-config-field">
            <span>Title</span>
            <input
              type="text"
              value={linkDraft.title}
              disabled={value.headerLinks.length >= maxHeaderLinks}
              onChange={(event) => {
                onClearLinkError();
                onLinkDraftChange({ ...linkDraft, title: event.target.value });
              }}
            />
          </label>
          <label className="publish-site-config-field">
            <span>URL</span>
            <input
              type="text"
              value={linkDraft.url}
              disabled={value.headerLinks.length >= maxHeaderLinks}
              onChange={(event) => {
                onClearLinkError();
                onLinkDraftChange({ ...linkDraft, url: event.target.value });
              }}
            />
          </label>
          <button
            className="secondary-action-button publish-add-link-button"
            type="button"
            disabled={value.headerLinks.length >= maxHeaderLinks}
            onClick={onAddLink}
          >
            <Plus size={16} />
            Add link
          </button>
        </div>

        {linkError ? (
          <p className="publish-site-config-inline-error" role="alert">
            {linkError}
          </p>
        ) : null}

        {value.headerLinks.length > 0 ? (
          <div className="publish-header-link-tags" aria-label="Header links">
            {value.headerLinks.map((link, index) => (
              <span className="publish-header-link-tag" key={`${link.title}-${link.url}-${index}`}>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {link.title}
                </a>
                <button
                  type="button"
                  aria-label={`Remove ${link.title}`}
                  onClick={() => removeHeaderLink(index)}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="publish-site-config-section">
        <div className="publish-site-config-toggle">
          <span>
            <strong>Show previous versions</strong>
            <small>Let visitors switch between older published versions.</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={value.showPreviousVersions}
            className={value.showPreviousVersions ? "is-on" : ""}
            onClick={() => update({ showPreviousVersions: !value.showPreviousVersions })}
          >
            <span />
          </button>
        </div>
      </div>

      <label className="publish-site-config-field">
        <span>Footer HTML</span>
        <textarea
          value={value.footerHtml}
          onChange={(event) => update({ footerHtml: event.target.value })}
        />
      </label>
    </section>
  );
}
