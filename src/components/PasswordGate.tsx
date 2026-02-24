import { useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PasswordGateProps {
  children: React.ReactNode;
}

const PasswordGate = ({ children }: PasswordGateProps) => {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem("site_auth") === "true");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authenticated) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-password", {
        body: { password },
      });
      if (fnError) throw fnError;
      if (data?.valid) {
        sessionStorage.setItem("site_auth", "true");
        setAuthenticated(true);
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 text-center">
        <Lock className="h-10 w-10 text-primary mx-auto" />
        <h1 className="text-xl font-bold font-mono text-foreground">Password Required</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          autoFocus
          className="w-full h-12 px-4 bg-card border border-border rounded-lg font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        {error && <p className="text-destructive text-sm font-mono">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm font-semibold rounded-md hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {loading ? "Verifying..." : "Enter"}
        </button>
      </form>
    </div>
  );
};

export default PasswordGate;
