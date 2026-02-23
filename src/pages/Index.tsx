import { useState, useRef } from "react";
import { GitBranch, Settings, Key } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import RepoCard from "@/components/RepoCard";
import ContributorList from "@/components/ContributorList";
import HowItWorks from "@/components/HowItWorks";
import DemoPreview from "@/components/DemoPreview";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { GitHubRepo, GitHubContributor } from "@/types/github";
import { searchRepos, getContributors, enrichContributors, EnrichControl } from "@/lib/github";
import { useCallback } from "react";

const Index = () => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(() => sessionStorage.getItem("gh_token") || "");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [contributors, setContributors] = useState<GitHubContributor[]>([]);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [extractRepoName, setExtractRepoName] = useState("");
  const [progress, setProgress] = useState<{ current: number; remaining: number | null } | null>(null);
  const [enrichProgress, setEnrichProgress] = useState<{ current: number; total: number } | null>(null);
  const enrichControlRef = useRef<EnrichControl>({ paused: false });
  const [enrichPaused, setEnrichPaused] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchLoading(true);
    setError(null);
    setContributors([]);
    setExtractRepoName("");
    try {
      const results = await searchRepos(query, token || undefined);
      setRepos(results);
      if (results.length === 0) setError("No repositories found.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleExtract = async (repo: GitHubRepo) => {
    setExtracting(repo.full_name);
    setContributors([]);
    setExtractRepoName(repo.full_name);
    setProgress(null);
    setEnrichProgress(null);
    setError(null);
    try {
      const result = await getContributors(
        repo.owner.login,
        repo.name,
        token || undefined,
        (count, remaining) => setProgress({ current: count, remaining })
      );
      setContributors(result);
      setExtracting(null);
      setProgress(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExtracting(null);
      setEnriching(false);
      setProgress(null);
      setEnrichProgress(null);
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
        token || undefined,
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

  const handleUpdateContributor = useCallback((login: string, updates: Partial<import("@/types/github").GitHubContributor>) => {
    setContributors((prev) =>
      prev.map((c) => (c.login === login ? { ...c, ...updates } : c))
    );
  }, []);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <button
              className="p-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-80 z-50">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs text-foreground font-semibold">GitHub Token</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">Optional. Increases rate limit from 60 to 5,000 req/hr. Use a token with minimal scopes (public_repo read-only).</p>
              <p className="text-xs text-muted-foreground/70 font-mono">Token is stored in session only and cleared when you close the tab.</p>
              <input
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  sessionStorage.setItem("gh_token", e.target.value);
                }}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
              {token && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-primary font-mono">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Token set
                  </div>
                  <button
                    onClick={() => {
                      setToken("");
                      sessionStorage.removeItem("gh_token");
                    }}
                    className="text-xs font-mono text-destructive hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-full mt-1 h-9 bg-primary text-primary-foreground font-mono text-xs font-semibold rounded-md hover:opacity-90 transition-opacity"
              >
                Save & Close
              </button>
            </div>
          </PopoverContent>
        </Popover>
        <ThemeToggle />
      </div>
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <GitBranch className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-mono text-foreground tracking-tight">
              Repo Extract
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-mono">
            Search repos · Extract contributors · Export CSV
          </p>
        </div>


        {/* Search */}
        <div className="mb-8">
          <SearchBar onSearch={handleSearch} loading={searchLoading} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm font-mono text-center">
            {error}
          </div>
        )}

        {/* How it works + Demo when idle */}
        {repos.length === 0 && contributors.length === 0 && !extracting && !searchLoading && !error && (
          <>
            <HowItWorks />
            <DemoPreview />
          </>
        )}
      {(contributors.length > 0 || extracting || enriching) && (
          <div className="mb-8">
             <ContributorList
               contributors={contributors}
               repoName={extractRepoName}
               loading={!!extracting}
               progress={progress}
               enriching={enriching}
               enrichProgress={enrichProgress}
               enrichPaused={enrichPaused}
               onTogglePause={handleTogglePause}
               onEnrich={handleEnrich}
               token={token || undefined}
               onUpdateContributor={handleUpdateContributor}
             />
          </div>
        )}

        {/* Repos */}
        {repos.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Repositories
            </h2>
            {repos.map((repo, i) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                onExtract={handleExtract}
                extracting={extracting === repo.full_name}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Index;
