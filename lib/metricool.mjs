// Server-only integration boundary. Never import into a client component.
const networks = ["youtube", "facebook", "tiktok"];

export async function checkPublishingConnection(userId, env = process.env, request = fetch) {
  const required = ["METRICOOL_API_TOKEN", "METRICOOL_USER_ID", "METRICOOL_BRAND_ID", "METRICOOL_PILOT_USER_ID"];
  if (required.some(key => !env[key])) {
    return {state:"setup_required", message:"Automatic publishing needs an API connection. Your campaign drafts remain available.", networks:[]};
  }
  // A server-side binding prevents subscribers from accessing the owner's brand.
  // Customer brand bindings must replace this pilot binding before customer launch.
  if (userId !== env.METRICOOL_PILOT_USER_ID) {
    return {state:"not_linked", message:"No publishing account is linked to your app account yet.", networks:[]};
  }
  const url = new URL("https://app.metricool.com/api/admin/simpleProfiles");
  url.searchParams.set("userId", env.METRICOOL_USER_ID);
  url.searchParams.set("blogId", env.METRICOOL_BRAND_ID);
  try {
    const response = await request(url, {headers:{"X-Mc-Auth":env.METRICOOL_API_TOKEN}, cache:"no-store", redirect:"error", signal:AbortSignal.timeout(10000)});
    if (!response.ok) return {state:"connection_error", message:response.status===401 || response.status===403 ? "The publishing provider rejected API access. Check the account plan and API configuration." : "The publishing provider is unavailable. Please retry later.", networks:[]};
    const body = await response.json();
    const brands = Array.isArray(body) ? body : body.data;
    if (!Array.isArray(brands)) throw new Error("Unexpected provider response");
    const brand = brands.find(item => String(item.id ?? item.blogId)===String(env.METRICOOL_BRAND_ID));
    if (!brand) return {state:"not_linked", message:"The configured publishing brand was not found. Contact support.", networks:[]};
    return {state:"connected", message:"Provider connection verified. Scheduling is still being built; no posts will be sent from this screen.", networks:networks.map(network=>({network, connected:Boolean(brand.networksData?.[`${network}Data`])}))};
  } catch {
    return {state:"connection_error", message:"Unable to verify the publishing connection. Please retry later.", networks:[]};
  }
}
