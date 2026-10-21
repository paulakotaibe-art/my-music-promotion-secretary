import { createClient } from "@supabase/supabase-js";
import { checkPublishingConnection } from "../../../../lib/metricool.mjs";

export const dynamic = "force-dynamic";
function reply(body, status=200) {
  return Response.json(body, {status, headers:{"Cache-Control":"private, no-store"}});
}
export async function GET(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ") || header.length > 16384) return reply({message:"Please sign in again."},401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return reply({message:"Account verification is temporarily unavailable."},503);
  try {
    const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data, error} = await client.auth.getUser(header.slice(7));
    if (error || !data.user) return reply({message:"Please sign in again."},401);
    return reply(await checkPublishingConnection(data.user.id));
  } catch {
    return reply({message:"Unable to verify your account. Please retry."},503);
  }
}
