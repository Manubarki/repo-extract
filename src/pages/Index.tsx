import { useState } from "react";
import { GitBranch, ChevronLeft, ChevronRight } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import RepoCard from "@/components/RepoCard";
import HowItWorks from "@/components/HowItWorks";
import DemoPreview from "@/components/DemoPreview";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import RepoDialog from "@/components/RepoDialog";

import { GitHubRepo } from "@/types/github";
import { searchRepos, resetRateLimitIfTokenChanged } from "@/lib/github";

const PER_PAGE = 10;

const Index = () => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentQuery, setCurrentQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(() => {
    sessionStorage.removeItem("gh_token");
    return "";
  });
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);

  const doSearch = async (query: string, page: number) => {
    setSearchLoading(true);
    setError(null);
    resetRateLimitIfTokenChanged(token || undefined);
    try {
      const result = await searchRepos(query, token || undefined, page, PER_PAGE);
      setRepos(result.items);
      setTotalCount(result.total_count);
      setCurrentPage(page);
      setCurrentQuery(query);
      if (result.items.length === 0) setError("No repositories found.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = (query: string) => doSearch(query, 1);
  const totalPages = Math.min(Math.ceil(totalCount / PER_PAGE), 100); // GitHub API caps at 1000 results

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
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                {totalCount.toLocaleString()} repositories found — click to extract
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            {repos.map((repo, i) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                onClick={setSelectedRepo}
                index={i}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => doSearch(currentQuery, currentPage - 1)}
                  disabled={currentPage <= 1 || searchLoading}
                  className="flex items-center gap-1 px-3 py-2 font-mono text-xs border border-border rounded-md hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 font-mono text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => doSearch(currentQuery, p as number)}
                      disabled={searchLoading}
                      className={`px-3 py-2 font-mono text-xs rounded-md border transition-colors ${
                        p === currentPage
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-secondary text-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => doSearch(currentQuery, currentPage + 1)}
                  disabled={currentPage >= totalPages || searchLoading}
                  className="flex items-center gap-1 px-3 py-2 font-mono text-xs border border-border rounded-md hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />

      <RepoDialog
        repo={selectedRepo}
        open={!!selectedRepo}
        onOpenChange={(open) => { if (!open) setSelectedRepo(null); }}
        token={token || undefined}
      />
    </div>
  );
};

function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export default Index;
