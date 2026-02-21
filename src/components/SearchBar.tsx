import { Search } from "lucide-react";
import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

const SearchBar = ({ onSearch, loading }: SearchBarProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
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
  );
};

export default SearchBar;
