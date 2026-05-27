import { Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api/client";
import type { JobRecord, JobStatus, UserRecord } from "../../api/types";
import { ConsoleIcon } from "../../components/icons/ConsoleIcon";
import { ScreenToolbar } from "../../components/layout/ScreenToolbar";
import { relativeTime } from "../../utils/format";

const ACTIVE_STATUSES = new Set<JobStatus>(["queued", "running"]);

function jobIdFromUrl() {
  return new URLSearchParams(window.location.search).get("job");
}

function formatJobType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

export function JobsScreen({
  currentUser,
  onBack,
  onSignOut,
  onOpenProfile,
  onOpenSettings
}: {
  currentUser: UserRecord;
  onBack: () => void;
  onSignOut: () => void;
  onOpenProfile: (profileId?: string | "all") => void;
  onOpenSettings: () => void;
}) {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => jobIdFromUrl());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const items = await apiFetch<JobRecord[]>("/api/jobs");
      setJobs(items);
      setError(null);
      setSelectedJobId((current) => {
        if (current && items.some((item) => item.id === current)) return current;
        const requestedJobId = jobIdFromUrl();
        if (requestedJobId && items.some((item) => item.id === requestedJobId)) {
          return requestedJobId;
        }
        return items[0]?.id ?? null;
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load jobs.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadJobs({ silent: true });
    }, 3000);
    return () => window.clearInterval(interval);
  }, [loadJobs]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null,
    [jobs, selectedJobId]
  );
  const activeJobCount = jobs.filter((job) => ACTIVE_STATUSES.has(job.status)).length;

  function selectJob(jobId: string) {
    setSelectedJobId(jobId);
    if (window.location.pathname === "/jobs") {
      window.history.replaceState(
        { mianotesView: "dashboard" },
        "",
        `/jobs?job=${encodeURIComponent(jobId)}`
      );
    }
  }

  return (
    <section className="jobs-screen">
      <ScreenToolbar
        className="settings-toolbar jobs-toolbar"
        breadcrumbItems={[{ label: "Console", current: true }]}
        currentUser={currentUser}
        onBack={onBack}
        onOpenProfile={() => onOpenProfile(currentUser.id)}
        onOpenUsers={() => onOpenProfile("all")}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
      />

      <div className="jobs-document">
        {error && (
          <div className="dashboard-notice jobs-notice" role="alert">
            <span>{error}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setError(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="jobs-document-header">
          <div>
            <span className="publish-kicker">Activity</span>
            <h1>Console</h1>
          </div>
          <button
            className="secondary-action jobs-refresh"
            type="button"
            onClick={() => void loadJobs({ silent: true })}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </div>

        <section className="jobs-grid-card">
          <header>
            <div>
              <h2>Queue</h2>
              <p>Recent parsing and indexing activity.</p>
            </div>
            <span>{activeJobCount} active</span>
          </header>

          {isLoading ? (
            <div className="jobs-empty-state">
              <Loader2 className="spin" size={20} />
              <span>Loading activity...</span>
            </div>
          ) : jobs.length > 0 ? (
            <div className="jobs-grid" role="table" aria-label="Jobs">
              <div className="jobs-grid-row jobs-grid-head" role="row">
                <span role="columnheader">Status</span>
                <span role="columnheader">Job</span>
                <span role="columnheader">Note</span>
                <span role="columnheader">Created</span>
              </div>
              {jobs.map((job) => (
                <button
                  className={`jobs-grid-row ${selectedJob?.id === job.id ? "selected" : ""}`}
                  type="button"
                  role="row"
                  key={job.id}
                  onClick={() => selectJob(job.id)}
                >
                  <span className={`jobs-status ${job.status}`} role="cell">
                    {job.status}
                  </span>
                  <span role="cell">{formatJobType(job.job_type)}</span>
                  <span role="cell">{job.note_title ?? job.note_id ?? "No note"}</span>
                  <span role="cell">{relativeTime(job.created_at)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="jobs-empty-state">No activity has run yet.</p>
          )}
        </section>

        <section className="jobs-console-card" aria-label="Job console">
          <header>
            <div>
              <h2>Console</h2>
              <p>
                {selectedJob
                  ? `${formatJobType(selectedJob.job_type)} · ${selectedJob.status}`
                  : "Select a job to inspect its output."}
              </p>
            </div>
            <ConsoleIcon size={18} />
          </header>

          <div className="jobs-console">
            {selectedJob && selectedJob.log.length > 0 ? (
              selectedJob.log.map((entry, index) => (
                <div className="jobs-console-entry" key={`${entry.timestamp}-${index}`}>
                  <div className="jobs-console-command">
                    <span>{formatTimestamp(entry.timestamp)}</span>
                    <strong className={entry.status}>{entry.status}</strong>
                    <code>$ {entry.command}</code>
                  </div>
                  {entry.response ? <pre>{entry.response}</pre> : null}
                </div>
              ))
            ) : (
              <p>No console output yet.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
