import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CloudUpload, Loader2, Sprout } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/agri/session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to sync — AgriCandle" },
      {
        name: "description",
        content:
          "Sign in to AgriCandle to sync your commodity prices, notes and season profiles across your phone and computer.",
      },
      { property: "og:title", content: "Sign in to sync — AgriCandle" },
      {
        property: "og:description",
        content: "Keep your agricultural price records on every device, still offline-first.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: "/", replace: true });
  }, [session, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in — syncing your data");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4 py-6">
      <div className="space-y-2 text-center">
        <span className="bg-primary text-primary-foreground inline-flex size-12 items-center justify-center rounded-2xl">
          <Sprout className="size-6" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === "signin" ? "Sign in to AgriCandle" : "Create your account"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Sync your goods, prices, notes and seasons across devices. The app keeps working offline —
          changes queue up and sync when you're back online.
        </p>
      </div>

      <form onSubmit={submit} className="pm-card space-y-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-12"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            className="h-12"
          />
        </div>
        <Button type="submit" className="h-12 w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground w-full text-sm"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>

      <p className="text-muted-foreground text-center text-xs">
        Prefer no account?{" "}
        <Link to="/" className="text-primary font-medium">
          Keep using AgriCandle on this device only
        </Link>{" "}
        — your data stays local until you sign in.
      </p>
    </div>
  );
}
