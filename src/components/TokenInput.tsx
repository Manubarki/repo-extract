import { useState } from "react";
import { Key } from "lucide-react";

interface TokenInputProps {
  token: string;
  onTokenChange: (token: string) => void;
}

const TokenInput = ({ token, onTokenChange }: TokenInputProps) => {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center gap-2 max-w-2xl mx-auto">
      <Key className="h-4 w-4 text-muted-foreground shrink-0" />
      <input
        type={show ? "text" : "password"}
        value={token}
        onChange={(e) => onTokenChange(e.target.value)}
        placeholder="GitHub token (optional, increases rate limit)"
        className="flex-1 h-9 px-3 bg-secondary border border-border rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
      />
      <button
        onClick={() => setShow(!show)}
        className="text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
      >
        {show ? "hide" : "show"}
      </button>
    </div>
  );
};

export default TokenInput;
