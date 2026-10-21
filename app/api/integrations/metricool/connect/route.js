import { NextResponse } from "next/server";
import {authenticate} from "../../../../../lib/server-auth";
import {APP_ORIGIN,COOKIE,cookieOptions,createAuthorization,seal} from "../../../../../lib/metricool-oauth.mjs";
export const dynamic="force-dynamic";
export async function POST(request) {
  const token=(request.headers.get("authorization") || "").replace(/^Bearer /,"");
  let auth;
  try {auth=await authenticate(token);} catch {return NextResponse.json({message:"Please sign in again."},{status:401});}
  if(request.headers.get("origin")!==APP_ORIGIN) return NextResponse.json({message:"Connect from the production dashboard."},{status:403});
  try {
    const pending=createAuthorization(auth.user.id,token);
    const response=NextResponse.json({url:pending.url},{headers:{"Cache-Control":"private, no-store"}});
    response.cookies.set(COOKIE,seal(pending.state),cookieOptions);
    return response;
  } catch {return NextResponse.json({message:"The account connection is not configured yet."},{status:503});}
}
