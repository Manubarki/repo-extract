import { useState } from "react";
import { GitHubContributor, SocialAccount } from "@/types/github";
import { Download, Users, ExternalLink, Mail, Loader2 } from "lucide-react";
import { contributorsToCsv, downloadCsv, findContributorEmail } from "@/lib/github";

interface ContributorListProps {
  contributors: GitHubContributor[];
  repoName: string;
  loading: boolean;
  progress: { current: number; remaining: number | null } | null;
  enriching?: boolean;
  enrichProgress?: { current: number; total: number } | null;
  enrichPaused?: boolean;
  onTogglePause?: () => void;
  onEnrich?: () => void;
  token?: string;
  onUpdateContributor?: (login: string, updates: Partial<GitHubContributor>) => void;
}

const sanitizeBlogUrl = (blog: string | null | undefined): string | null => {
  if (!blog) return null;
  const trimmed = blog.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
};

const ContributorList = ({ contributors, repoName, loading, progress, enriching, enrichProgress, enrichPaused, onTogglePause, onEnrich, token, onUpdateContributor }: ContributorListProps) => {
  const [findingEmail, setFindingEmail] = useState<Record<string, boolean>>({});
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

  const handleFindEmail = async (login: string) => {
    setFindingEmail((prev) => ({ ...prev, [login]: true }));
    try {
      const email = await findContributorEmail(login, token, repoName);
      onUpdateContributor?.(login, { email: email || "not found" });
    } catch {
      onUpdateContributor?.(login, { email: "error" });
    } finally {
      setFindingEmail((prev) => ({ ...prev, [login]: false }));
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in shadow-[0_0_30px_hsl(152_68%_50%/0.06)]">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center gap-2 font-mono text-sm min-w-0 flex-1">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground font-semibold">{contributors.length}</span>
          <span className="text-muted-foreground">in</span>
          <span className="text-accent truncate">{repoName}</span>
        </div>
        {enriching && enrichProgress && (
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span>{enrichPaused ? "paused" : "enriching"} {enrichProgress.current}/{enrichProgress.total}</span>
            {!enrichPaused && (
              <span className="inline-block h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            <button
              onClick={onTogglePause}
              className="px-2 py-0.5 text-xs font-mono text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors"
            >
              {enrichPaused ? "Resume" : "Pause"}
            </button>
          </div>
        )}
        {!enriching && !contributors.every((c) => c.enriched) && (
          <button
            onClick={onEnrich}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent to-primary text-primary-foreground font-mono text-xs font-bold rounded-lg shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
          >
            <Users className="h-4 w-4" />
            Enrich Profiles
          </button>
        )}
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
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Location</th>
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
                  {c.email && c.email !== "not found" && c.email !== "error" ? (
                    <a href={`mailto:${c.email}`} className="font-mono text-xs text-primary hover:underline">{c.email}</a>
                  ) : c.email === "not found" ? (
                    <span className="font-mono text-xs text-muted-foreground">not found</span>
                  ) : c.email === "error" ? (
                    <span className="font-mono text-xs text-destructive">error</span>
                  ) : findingEmail[c.login] ? (
                    <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  ) : (
                    <button
                      onClick={() => handleFindEmail(c.login)}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono text-accent border border-accent/30 rounded hover:bg-accent/10 transition-colors"
                      title="Find email from commit patches"
                    >
                      <Mail className="h-3 w-3" />
                      Find
                    </button>
                  )}
                </td>
                <td className="px-5 py-3">
                  {c.location ? (
                    <span className="font-mono text-xs text-foreground truncate max-w-[120px] inline-block" title={c.location}>{c.location}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">—</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Social accounts from API */}
                    {c.social_accounts && c.social_accounts.length > 0 && c.social_accounts.map((s: SocialAccount, idx: number) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline font-mono capitalize"
                        title={s.provider}
                      >
                        {s.provider === "twitter" ? "𝕏" : s.provider}
                      </a>
                    ))}
                    {/* Fallback twitter_username */}
                    {c.twitter_username && (!c.social_accounts || !c.social_accounts.some((s: SocialAccount) => s.provider === "twitter")) && (
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
                    {/* Blog link */}
                    {(() => {
                      const blogUrl = sanitizeBlogUrl(c.blog);
                      const hasBlogInSocials = c.social_accounts?.some((s: SocialAccount) => s.url === blogUrl);
                      return blogUrl && !hasBlogInSocials ? (
                        <a
                          href={blogUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          title="Blog/Website"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null;
                    })()}
                    {/* Empty state */}
                    {!c.twitter_username && (!c.social_accounts || c.social_accounts.length === 0) && !c.blog && (
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
