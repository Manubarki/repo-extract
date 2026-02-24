const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 px-4 pb-8">
      <div className="max-w-2xl mx-auto">
        {/* Disclaimer box */}
        <div className="rounded-xl border border-border bg-card/80 p-6 text-center space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center justify-center gap-2">
            <span>⚠️</span> Disclaimer
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This tool is for educational purposes only. By using it, you agree to comply with{" "}
            <a
              href="https://docs.github.com/en/site-policy/github-terms/github-terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub's Terms of Service
            </a>
            , respect privacy, and use data responsibly. Not for spam or malicious use.
          </p>
        </div>

        {/* Copyright + links */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            © {year} Repo Extract · Built with ❤️
          </p>
          <div className="flex items-center justify-center gap-2 text-xs">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub
            </a>
            <span className="text-muted-foreground">·</span>
            <a
              href="https://docs.github.com/en/rest"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              API Docs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
