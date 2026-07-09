// Reuses the SERVER_URL wiring already set per-environment in wrangler.jsonc
// (dev-api.namamicleans.com vs api.namamicleans.com) instead of adding a new
// env var - one less thing to keep in sync across environments.
const isDev = process.env.SERVER_URL?.includes("dev-api") ?? false;

export default function DevBanner() {
  if (!isDev) return null;

  return (
    <div className="w-full bg-amber-400 text-amber-950 text-center text-xs font-semibold py-1 tracking-wide">
      DEV ENVIRONMENT — not production data
    </div>
  );
}
