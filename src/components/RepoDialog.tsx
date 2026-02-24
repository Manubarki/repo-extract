import { useState, useRef } from "react";
import { GitHubRepo, GitHubContributor } from "@/types/github";
import { Star, GitFork, Clock, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getContributors, enrichContributors, EnrichControl } from "@/lib/github";
import ContributorList from "@/components/ContributorList";
import { useCallback } from "react";

interface RepoDialogProps {
  repo: GitHubRepo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: string;
}

const RepoDialog = ({ repo, open, onOpenChange, token }: RepoDialogProps) => {
  const [contributors, setContributors] = useState<GitHubContributor[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState<{ current: number; remaining: number | null } | null>(null);
  const [enrichProgress, setEnrichProgress] = useState<{ current: number; total: number } | null>(null);
  const [enrichPaused, setEnrichPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enrichControlRef = useRef<EnrichControl>({ paused: false });

  const handleExtract = async () => {
    if (!repo) return;
    setExtracting(true);
    setContributors([]);
    setProgress(null);
    setEnrichProgress(null);
    setError(null);
    try {
      const result = await getContributors(
        repo.owner.login,
        repo.name,
        token,
        (count, remaining) => setProgress({ current: count, remaining })
      );
      setContributors(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExtracting(false);
      setProgress(null);
    }
  };

  const handleEnrich = async () => {
    if (enriching || contributors.length === 0) return;
    setEnriching(true);
    setEnrichPaused(false);
    enrichControlRef.current = { paused: false };
    try {
      const enriched = await enrichContributors(
        contributors,
        token,
        (current, total, partialResults) => {
          setEnrichProgress({ current, total });
          if (partialResults) setContributors(partialResults);
        },
        enrichControlRef.current
      );
      setContributors(enriched);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnriching(false);
      setEnrichProgress(null);
    }
  };

  const handleTogglePause = () => {
    const next = !enrichControlRef.current.paused;
    enrichControlRef.current.paused = next;
    setEnrichPaused(next);
  };

  const handleUpdateContributor = useCallback((login: string, updates: Partial<GitHubContributor>) => {
    setContributors((prev) =>
      prev.map((c) => (c.login === login ? { ...c, ...updates } : c))
    );
  }, []);

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      // Reset state when closing
      setContributors([]);
      setExtracting(false);
      setEnriching(false);
      setProgress(null);
      setEnrichProgress(null);
      setError(null);
    }
    onOpenChange(val);
  };

  if (!repo) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-mono">
            <img
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              className="w-8 h-8 rounded-full ring-1 ring-border"
            />
            <span className="text-primary">{repo.full_name}</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm mt-1">
            {repo.description || "No description available."}
          </DialogDescription>
        </DialogHeader>

        {/* Repo stats */}
        <div className="flex items-center gap-5 text-xs text-muted-foreground font-mono border-b border-border pb-4">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {repo.stargazers_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-3.5 w-3.5" />
            {repo.forks_count.toLocaleString()}
          </span>
          {repo.language && (
            <span className="text-accent">{repo.language}</span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Date(repo.updated_at).toLocaleDateString()}
          </span>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline ml-auto"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View on GitHub
          </a>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm font-mono text-center">
            {error}
          </div>
        )}

        {/* Extract button or contributors */}
        {contributors.length === 0 && !extracting ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-muted-foreground text-sm font-mono">
              Extract all contributors from this repository
            </p>
            <button
              onClick={handleExtract}
              className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
            >
              Extract Contributors
            </button>
          </div>
        ) : (
          <ContributorList
            contributors={contributors}
            repoName={repo.full_name}
            loading={extracting}
            progress={progress}
            enriching={enriching}
            enrichProgress={enrichProgress}
            enrichPaused={enrichPaused}
            onTogglePause={handleTogglePause}
            onEnrich={handleEnrich}
            token={token}
            onUpdateContributor={handleUpdateContributor}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RepoDialog;
