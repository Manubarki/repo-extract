const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 mt-16">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="space-y-2">
          <h3 className="font-mono text-xs font-semibold text-foreground uppercase tracking-wider">
            Disclaimer
          </h3>
          <p className="font-mono text-xs text-muted-foreground leading-relaxed">
            Repo Extract is an independent tool and is not affiliated with, endorsed by, or sponsored by GitHub, Inc.
            All data is retrieved via the public GitHub API. Use of this tool is subject to GitHub's API terms of service
            and rate limits. We do not store your GitHub token — it is kept in your browser session only and cleared when
            you close the tab.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-mono text-xs font-semibold text-foreground uppercase tracking-wider">
            Terms of Use
          </h3>
          <p className="font-mono text-xs text-muted-foreground leading-relaxed">
            This tool is provided "as is" without warranty of any kind. You are solely responsible for how you use the
            extracted data, including compliance with applicable privacy laws and regulations (e.g., GDPR, CCPA). Do not
            use extracted contributor information for unsolicited contact, spam, or any purpose that violates applicable
            laws. By using this tool, you agree to these terms.
          </p>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="font-mono text-xs text-muted-foreground text-center">
            © {year} Repo Extract. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
