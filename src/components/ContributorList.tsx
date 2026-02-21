import { GitHubContributor } from "@/types/github";
import { Download, Users, ExternalLink } from "lucide-react";
import { contributorsToCsv, downloadCsv } from "@/lib/github";

interface ContributorListProps {
  contributors: GitHubContributor[];
  repoName: string;
  loading: boolean;
  progress: { current: number; remaining: number | null } | null;
  enriching?: boolean;
  enrichProgress?: { current: number; total: number } | null;
  enrichPaused?: boolean;
  onTogglePause?: () => void;
}

const ContributorList = ({ contributors, repoName, loading, progress, enriching, enrichProgress, enrichPaused, onTogglePause }: ContributorListProps) => {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center animate-fade-in">
        <div className="inline-flex items-center gap-3 text-primary font-mono text-sm">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Extracting contributors... {progress ? `(${progress.current} found${progress.remaining != null ? ` · ${progress.remaining} API calls left` : ""})` : ""}
        </div>
      </div>
    );
  }

  if (contributors.length === 0) return null;

  const handleExport = () => {
    const csv = contributorsToCsv(contributors, repoName);
    downloadCsv(csv, `${repoName.replace("/", "_")}_contributors.csv`);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in shadow-[0_0_30px_hsl(152_68%_50%/0.06)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center gap-2 font-mono text-sm">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-foreground font-semibold">{contributors.length}</span>
          <span className="text-muted-foreground">contributors in</span>
          <span className="text-accent">{repoName}</span>
          {enriching && enrichProgress && (
            <span className="text-muted-foreground ml-2 inline-flex items-center gap-1">
              · {enrichPaused ? "paused" : "enriching"} {enrichProgress.current}/{enrichProgress.total}
              {!enrichPaused && (
                <span className="inline-block h-3 w-3 ml-1 border-2 border-primary border-t-transparent rounded-full animate-spin align-middle" />
              )}
              <button
                onClick={onTogglePause}
                className="ml-2 px-2 py-0.5 text-xs font-mono text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors"
              >
                {enrichPaused ? "Resume" : "Pause"}
              </button>
            </span>
          )}
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-mono text-xs font-semibold rounded-md hover:opacity-90 transition-opacity"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-secondary">
            <tr className="text-left font-mono text-xs text-muted-foreground">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Contributions</th>
              <th className="px-5 py-3">Socials</th>
              <th className="px-5 py-3">Type</th>
            </tr>
          </thead>
          <tbody>
            {contributors.map((c, i) => (
              <tr
                key={`${c.login}-${i}`}
                className="border-t border-border hover:bg-secondary/50 transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 40, 800)}ms`, animationFillMode: 'both' }}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.login} className="w-7 h-7 rounded-full ring-1 ring-border" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-mono">
                        ?
                      </div>
                    )}
                    <div className="min-w-0">
                      {c.name && (
                        <div className="font-mono text-sm text-foreground font-medium truncate">{c.name}</div>
                      )}
                      {c.html_url ? (
                        <a
                          href={c.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          @{c.login}
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">@{c.login}</span>
                      )}
                      {c.company && (
                        <div className="font-mono text-xs text-muted-foreground truncate">{c.company}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-foreground">{c.contributions}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {c.twitter_username && (
                      <a
                        href={`https://twitter.com/${c.twitter_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline font-mono"
                        title="Twitter"
                      >
                        𝕏
                      </a>
                    )}
                    {c.blog && (
                      <a
                        href={c.blog.startsWith("http") ? c.blog : `https://${c.blog}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        title="Blog/Website"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {!c.twitter_username && !c.blog && (
                      <span className="text-xs text-muted-foreground font-mono">—</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex px-2 py-0.5 bg-primary/10 text-primary text-xs font-mono rounded">
                    user
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContributorList;
