import { GitHubRepo } from "@/types/github";
import { Star, GitFork, Clock } from "lucide-react";

interface RepoCardProps {
  repo: GitHubRepo;
  onClick: (repo: GitHubRepo) => void;
  index?: number;
}

const RepoCard = ({ repo, onClick, index = 0 }: RepoCardProps) => {
  return (
    <div
      onClick={() => onClick(repo)}
      className="bg-card border border-border rounded-lg p-5 hover:border-primary/40 hover:shadow-[0_0_20px_hsl(152_68%_50%/0.08)] hover:-translate-y-1 transition-all duration-300 group animate-fade-in cursor-pointer"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <img
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              className="w-5 h-5 rounded-full"
            />
            <span className="font-mono text-sm text-primary truncate">
              {repo.full_name}
            </span>
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
      </div>
    </div>
  );
};

export default RepoCard;
