import { Users, Download, ExternalLink, Star, GitFork } from "lucide-react";

const mockContributors = [
  { login: "torvalds", name: "Linus Torvalds", avatar: "https://avatars.githubusercontent.com/u/1024025?v=4", contributions: 1024, twitter: "Linus__Torvalds", company: "Linux Foundation" },
  { login: "gaearon", name: "Dan Abramov", avatar: "https://avatars.githubusercontent.com/u/810438?v=4", contributions: 847, twitter: "dan_abramov2", company: "Bluesky" },
  { login: "sindresorhus", name: "Sindre Sorhus", avatar: "https://avatars.githubusercontent.com/u/170270?v=4", contributions: 612, blog: "sindresorhus.com", company: null },
  { login: "tj", name: "TJ Holowaychuk", avatar: "https://avatars.githubusercontent.com/u/25254?v=4", contributions: 389, twitter: null, blog: "tjholowaychuk.com", company: "Apex" },
  { login: "yyx990803", name: "Evan You", avatar: "https://avatars.githubusercontent.com/u/499550?v=4", contributions: 256, twitter: "youyuxi", company: "Vue.js" },
];

const DemoPreview = () => {
  return (
    <div className="relative mt-12 mb-4">
      <div className="text-center mb-6">
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          What you'll get
        </p>
      </div>

      <div className="relative">
        {/* Fade overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none rounded-b-lg" />

        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-[0_0_40px_hsl(152_68%_50%/0.06)] animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex items-center gap-2 font-mono text-sm">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-foreground font-semibold">142</span>
              <span className="text-muted-foreground">contributors in</span>
              <span className="text-accent">facebook/react</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary font-mono text-xs font-semibold rounded-md cursor-default">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr className="text-left font-mono text-xs text-muted-foreground">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Contributions</th>
                <th className="px-5 py-3">Socials</th>
                <th className="px-5 py-3">Type</th>
              </tr>
            </thead>
            <tbody>
              {mockContributors.map((c, i) => (
                <tr
                  key={c.login}
                  className="border-t border-border animate-fade-in"
                  style={{ animationDelay: `${200 + i * 100}ms`, animationFillMode: 'both' }}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={c.avatar} alt={c.login} className="w-7 h-7 rounded-full ring-1 ring-border" />
                      <div className="min-w-0">
                        <div className="font-mono text-sm text-foreground font-medium truncate">{c.name}</div>
                        <span className="font-mono text-xs text-primary">@{c.login}</span>
                        {c.company && (
                          <div className="font-mono text-xs text-muted-foreground truncate">{c.company}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-foreground">{c.contributions}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {c.twitter && (
                        <span className="text-xs text-primary font-mono">𝕏</span>
                      )}
                      {c.blog && (
                        <ExternalLink className="h-3.5 w-3.5 text-primary" />
                      )}
                      {!c.twitter && !c.blog && (
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

      {/* Feature callouts */}
      <div className="grid grid-cols-3 gap-4 mt-10">
        {[
          { icon: Users, label: "Contributors", desc: "Names, handles & socials" },
          { icon: Star, label: "Enriched data", desc: "Company, blog & Twitter" },
          { icon: Download, label: "CSV export", desc: "One-click download" },
        ].map((f, i) => (
          <div
            key={f.label}
            className="text-center p-4 rounded-lg border border-border/50 bg-card/50 animate-fade-in"
            style={{ animationDelay: `${600 + i * 120}ms`, animationFillMode: 'both' }}
          >
            <f.icon className="h-5 w-5 text-primary mx-auto mb-2" />
            <div className="font-mono text-xs text-foreground font-semibold">{f.label}</div>
            <div className="font-mono text-xs text-muted-foreground mt-0.5">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DemoPreview;
