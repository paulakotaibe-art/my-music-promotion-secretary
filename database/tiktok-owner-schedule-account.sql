-- Keep an owner's edited, not-yet-submitted schedule bound to the new signed creator.
create or replace function app_private.reserve_tiktok_post(p_id uuid,p_draft uuid,p_expected jsonb,p_signature text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();a jsonb;d public.campaign_drafts%rowtype;old public.tiktok_posts%rowtype;at_time timestamptz;release_at timestamptz;brand text;u jsonb;
begin
 if uid is null then raise exception 'Sign in required';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 a:=app_private.tiktok_publishing_access();if not coalesce((a->>'enabled')::boolean,false)then raise exception 'TikTok publishing is not enabled';end if;
 select * into d from public.campaign_drafts where id=p_draft and user_id=uid for update;if not found then raise exception 'Choose your own saved video';end if;
 if coalesce(p_signature,'')='' or not coalesce(p_expected @> jsonb_build_object('id',p_id,'userId',uid,'draftId',p_draft,'mediaUrl',d.media_url,'rightsConfirmed',true,'musicConsent',true,'confirmed',true),false)then raise exception 'Invalid publishing review';end if;
 if not exists(select 1 from public.social_connections where user_id=uid and provider='tiktok' and account_id=p_expected->>'openId')then raise exception 'TikTok account mismatch';end if;
 if (p_expected->>'reviewedAt')::timestamptz<now()-interval '10 minutes' or (p_expected->>'reviewedAt')::timestamptz>now()+interval '1 minute' or p_expected->>'reviewedAt' is null then raise exception 'Review your post again';end if;
 if not (a->>'audited')::boolean and p_expected->>'privacy'<>'SELF_ONLY' then raise exception 'Unaudited TikTok tests must be Only me';end if;
 release_at:=(p_expected->>'publishAt')::timestamptz;at_time:=coalesce(release_at,now());
 if release_at is not null and(release_at<now()+interval '10 minutes' or release_at>now()+interval '28 days')then raise exception 'Choose a date 10 minutes to 28 days ahead';end if;
 select * into old from public.tiktok_posts where user_id=uid and draft_id=p_draft for update;
 if found and(old.id<>p_id or old.state not in ('queued','cancelled')or old.publish_id is not null)then raise exception 'This video already has a publication attempt; check its result';end if;
 if not (a->>'owner')::boolean then
  brand:=app_private.bind_direct_destination(uid,'tiktok',p_expected->>'openId');
  if old.id is null then
   insert into public.campaign_submissions(id,user_id,draft_id,snapshot)values(p_id,uid,p_draft,jsonb_build_object('provider','direct_tiktok','title',d.title,'platforms',jsonb_build_array('tiktok'),'planned_at',at_time,'brand_id',brand,'open_id',p_expected->>'openId'));
  else
   if not exists(select 1 from public.campaign_submissions where id=p_id and user_id=uid and snapshot->>'provider'='direct_tiktok')then raise exception 'Reservation missing';end if;
   update public.campaign_submissions set quota_released=true where id=p_id and user_id=uid;
   u:=app_private.promotion_usage(at_time);if not coalesce((u->>'canPublish')::boolean,false)then raise exception '%',u->>'reason';end if;
   update public.campaign_submissions set quota_released=false,snapshot=jsonb_set(snapshot,'{planned_at}',to_jsonb(at_time))where id=p_id and user_id=uid;
  end if;
 end if;
 insert into public.tiktok_posts(id,user_id,draft_id,open_id,publish_at,state,expected,expected_signature)values(p_id,uid,p_draft,p_expected->>'openId',release_at,case when release_at is null then 'reserved' else 'queued' end,p_expected,p_signature)
 on conflict(user_id,draft_id)do update set open_id=excluded.open_id,publish_at=excluded.publish_at,state=excluded.state,expected=excluded.expected,expected_signature=excluded.expected_signature,outcome=null,outcome_signature=null,updated_at=now(),claimed_at=null;
 return jsonb_build_object('id',p_id,'state',case when release_at is null then 'reserved' else 'queued' end);
end $$;
