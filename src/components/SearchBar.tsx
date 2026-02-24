import { Search, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
  token: string;
  onTokenChange: (token: string) => void;
}

const SearchBar = ({ onSearch, loading, token, onTokenChange }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [showToken, setShowToken] = useState(false);

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
          type={showToken ? "text" : "password"}
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder="GitHub Personal Access Token (optional)"
          autoComplete="new-password"
          name="gh_token_nofill"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          className="w-full h-12 px-4 pr-24 bg-card border border-border rounded-lg font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          {token && (
            <button
              type="button"
              onClick={() => onTokenChange("")}
              className="h-8 px-2 text-xs font-mono text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear
            </button>
          )}
        </div>
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
