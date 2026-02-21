import { Search, GitBranch, Download, Users } from "lucide-react";

const steps = [
  { step: "1", title: "Search", desc: "Type a GitHub repo name or keyword and hit Search." },
  { step: "2", title: "Pick a repo", desc: "Choose a repository from the results list." },
  { step: "3", title: "Extract", desc: "Click Extract to pull all contributors with enriched profiles." },
  { step: "4", title: "Export", desc: "Download the full list as a CSV file in one click." },
];

const HowItWorks = () => (
  <div className="mt-10 mb-2 animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
    <p className="text-center text-muted-foreground font-mono text-xs uppercase tracking-widest mb-6">
      How it works
    </p>
    <div className="grid grid-cols-4 gap-3">
      {steps.map((s, i) => (
        <div
          key={s.step}
          className="relative text-center p-4 rounded-lg border border-border/50 bg-card/50 animate-fade-in"
          style={{ animationDelay: `${200 + i * 100}ms`, animationFillMode: 'both' }}
        >
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-mono text-sm font-bold mb-3">
            {s.step}
          </div>
          <div className="font-mono text-xs text-foreground font-semibold">{s.title}</div>
          <div className="font-mono text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</div>
        </div>
      ))}
    </div>
  </div>
);

export default HowItWorks;
