const PRODUCTION_ORIGIN = 'https://my-music-promotion-secretary-x96x.vercel.app';
const PRODUCTION_DATABASE = 'eycvgtlrvjrmduejqplb';

function sandboxMode(env = process.env) {
  const mode = env.MUSIC_APP_ENV || 'production';
  if (!['production', 'sandbox'].includes(mode)) throw Error('Invalid application environment.');
  return mode === 'sandbox';
}

function applicationOrigin(env = process.env) {
  if (!sandboxMode(env)) {
    if (env.VERCEL_ENV === 'preview') throw Error('Preview deployments require an isolated Sandbox configuration.');
    return PRODUCTION_ORIGIN;
  }
  const raw = env.MUSIC_SANDBOX_ORIGIN || '';
  let origin, database;
  try { origin = new URL(raw); database = new URL(env.NEXT_PUBLIC_SUPABASE_URL); }
  catch { throw Error('Sandbox website and database URLs must be configured.'); }
  if (raw !== origin.origin || origin.protocol !== 'https:' || !origin.hostname.endsWith('.vercel.app') || origin.origin === PRODUCTION_ORIGIN)
    throw Error('Sandbox requires its own HTTPS Vercel origin without a path or trailing slash.');
  if (database.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(database.hostname) || database.origin !== env.NEXT_PUBLIC_SUPABASE_URL || database.hostname === PRODUCTION_DATABASE + '.supabase.co')
    throw Error('Sandbox requires a separate Supabase project. Production database access is forbidden.');
  // Reject inherited production integrations; never silently switch their credentials.
  const forbidden = ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'METRICOOL_OAUTH_CLIENT_ID', 'STRIPE_SECRET_KEY', 'STRIPE_TEST_SECRET_KEY', 'BILLING_BRIDGE_TOKEN'];
  if (forbidden.some(key => env[key])) throw Error('Remove production and unrelated integration credentials from the Sandbox environment.');
  if (env.BILLING_MODE && env.BILLING_MODE !== 'test') throw Error('Sandbox cannot use live billing.');
  return origin.origin;
}

function tiktokCredentials(env = process.env) {
  const prefix = sandboxMode(env) ? 'TIKTOK_SANDBOX_CLIENT_' : 'TIKTOK_CLIENT_';
  return {id: env[prefix + 'KEY']?.trim(), secret: env[prefix + 'SECRET']?.trim()};
}

module.exports = {PRODUCTION_ORIGIN, applicationOrigin, sandboxMode, tiktokCredentials};
