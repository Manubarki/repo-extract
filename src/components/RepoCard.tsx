import { GitHubRepo } from "@/types/github";
import { Star, GitFork, Clock } from "lucide-react";

interface RepoCardProps {
  repo: GitHubRepo;
  onExtract: (repo: GitHubRepo) => void;
  extracting: boolean;
}

const RepoCard = ({ repo, onExtract, extracting }: RepoCardProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-5 hover:border-primary/40 transition-all group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <img
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              className="w-5 h-5 rounded-full"
            />
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-primary hover:underline truncate"
            >
              {repo.full_name}
            </a>
          </div>
          {repo.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {repo.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-mono">
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
          </div>
        </div>
        <button
          onClick={() => onExtract(repo)}
          disabled={extracting}
          className="shrink-0 px-4 py-2 bg-secondary text-secondary-foreground font-mono text-xs font-medium rounded-md border border-border hover:border-primary/40 hover:text-primary disabled:opacity-40 transition-all"
        >
          {extracting ? "Extracting..." : "Extract"}
        </button>
      </div>
    </div>
  );
};

export default RepoCard;
