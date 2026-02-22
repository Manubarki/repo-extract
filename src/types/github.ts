export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  updated_at: string;
}

export interface GitHubContributor {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
  isAnonymous?: boolean;
  // Enriched profile fields
  name?: string | null;
  bio?: string | null;
  company?: string | null;
  blog?: string | null;
  twitter_username?: string | null;
  location?: string | null;
  enriched?: boolean;
  email?: string | null;
}

export interface SearchState {
  query: string;
  repos: GitHubRepo[];
  loading: boolean;
  error: string | null;
}

export interface ContributorState {
  contributors: GitHubContributor[];
  loading: boolean;
  error: string | null;
  progress: { current: number; total: number } | null;
}
