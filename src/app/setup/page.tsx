export default function SetupPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-cloud px-4">
      <div className="panel relative w-full max-w-lg p-8">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate">Setup</p>
        <h1 className="font-display text-2xl font-semibold text-ink">Supabase setup required</h1>
        <p className="mt-2 text-sm text-slate">
          The app is running, but{" "}
          <code className="font-mono text-emerald">.env.local</code> still has placeholder keys. Add
          your real Supabase credentials to continue.
        </p>

        <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-ink">
          <li>
            Open{" "}
            <a
              className="text-emerald underline underline-offset-2"
              href="https://supabase.com/dashboard/project/_/settings/api"
              target="_blank"
              rel="noreferrer"
            >
              Supabase → Project Settings → API
            </a>
          </li>
          <li>
            Copy Project URL and anon public key into{" "}
            <code className="font-mono text-emerald">.env.local</code>
          </li>
          <li>Also copy the service_role key (needed for creating staff users)</li>
          <li>
            Run{" "}
            <code className="font-mono text-emerald">supabase/migrations/001_schema.sql</code>
          </li>
          <li>
            Restart with <code className="font-mono text-emerald">npm run dev</code>
          </li>
        </ol>

        <pre className="mt-6 overflow-x-auto rounded-[10px] border border-border bg-cloud p-4 font-mono text-xs text-slate">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...`}
        </pre>
      </div>
    </div>
  );
}
