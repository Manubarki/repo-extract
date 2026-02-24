import { Search } from "lucide-react";
import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
  token: string;
  onTokenChange: (token: string) => void;
}

const SearchBar = ({ onSearch, loading, token, onTokenChange }: SearchBarProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GitHub repositories..."
            className="w-full h-14 pl-12 pr-28 bg-card border border-border rounded-lg font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 bg-primary text-primary-foreground font-mono text-sm font-semibold rounded-md hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {/* Token input */}
      <div className="relative">
        <input
          type="password"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder="GitHub Personal Access Token (optional)"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          className="w-full h-12 px-4 pr-20 bg-card border border-border rounded-lg font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        {token && (
          <button
            type="button"
            onClick={() => onTokenChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 text-xs font-mono text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Info text */}
      <div className="space-y-0.5 px-1">
        <p className="font-mono text-xs text-muted-foreground">
          <span>💡</span>{" "}
          <span className="font-semibold text-foreground">Why add a token?</span>{" "}
          GitHub limits: <span className="font-semibold text-destructive">60 requests/hour</span> without token,{" "}
          <span className="font-semibold text-primary">5,000 requests/hour</span> with token.
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          <span>🔒</span> Stored in session memory only ·{" "}
          <a
            href="https://github.com/settings/tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Create token
          </a>
        </p>
      </div>
    </div>
  );
};

export default SearchBar;
