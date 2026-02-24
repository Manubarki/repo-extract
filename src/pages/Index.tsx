import { useState } from "react";
import { GitBranch } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import RepoCard from "@/components/RepoCard";
import HowItWorks from "@/components/HowItWorks";
import DemoPreview from "@/components/DemoPreview";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import RepoDialog from "@/components/RepoDialog";

import { GitHubRepo } from "@/types/github";
import { searchRepos, resetRateLimitIfTokenChanged } from "@/lib/github";

const Index = () => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(() => sessionStorage.getItem("gh_token") || "");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);

  const handleSearch = async (query: string) => {
    setSearchLoading(true);
    setError(null);
    resetRateLimitIfTokenChanged(token || undefined);
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

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 relative">
      <div
        className="fixed inset-0 z-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="max-w-4xl mx-auto px-4 py-16 relative z-10">
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
          <SearchBar
            onSearch={handleSearch}
            loading={searchLoading}
            token={token}
            onTokenChange={(val) => {
              setToken(val);
              sessionStorage.setItem("gh_token", val);
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm font-mono text-center">
            {error}
          </div>
        )}

        {/* How it works + Demo when idle */}
        {repos.length === 0 && !searchLoading && !error && (
          <>
            <HowItWorks />
            <DemoPreview />
          </>
        )}

        {/* Repos */}
        {repos.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Repositories — click to extract
            </h2>
            {repos.map((repo, i) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                onClick={setSelectedRepo}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />

      {/* Repo detail dialog */}
      <RepoDialog
        repo={selectedRepo}
        open={!!selectedRepo}
        onOpenChange={(open) => { if (!open) setSelectedRepo(null); }}
        token={token || undefined}
      />
    </div>
  );
};

export default Index;
