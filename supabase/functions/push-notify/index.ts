// Fan a new `notifications` row out to the user's devices via the Expo push API.
//
// Wiring: a Supabase **Database Webhook** on `public.notifications` INSERT posts
// here. Payload:
//   { type: "INSERT", table: "notifications", record: { id, user_id, type, title, body, data } }
//
// Env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically):
//   WEBHOOK_SECRET   — optional; if set, the webhook must send x-webhook-secret
//
// Deploy:  supabase functions deploy push-notify --no-verify-jwt
// See docs/PUSH_NOTIFICATIONS_SETUP.md.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
}

// notification type -> which per-category preference gates it (null = always send
// as long as `push` is on).
const CATEGORY: Record<string, 'messages' | 'enquiries' | 'events' | 'community' | null> = {
  message: 'messages',
  enquiry: 'enquiries',
  event_reminder: 'events',
  community_reply: 'community',
  community_like: 'community',
  listing_saved: null,
  roommate_saved: null,
  system: null,
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function pruneToken(token: string) {
  await supabase.from('push_tokens').delete().eq('expo_push_token', token);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let record: NotificationRecord | undefined;
  try {
    const payload = await req.json();
    if (payload?.type !== 'INSERT' || payload?.table !== 'notifications') {
      return Response.json({ skipped: 'not a notification insert' });
    }
    record = payload.record;
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  if (!record?.user_id) return Response.json({ skipped: 'no user' });

  // Respect the user's preferences.
  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_prefs')
    .eq('id', record.user_id)
    .maybeSingle();

  const prefs = (profile?.notification_prefs ?? {}) as Record<string, unknown>;
  const pushOn = prefs.push !== false; // default on
  const category = CATEGORY[record.type] ?? null;
  const categoryOn = category ? prefs[category] !== false : true;
  if (!pushOn || !categoryOn) {
    return Response.json({ skipped: 'preference off', type: record.type });
  }

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', record.user_id);

  const list = (tokens ?? []).map((t) => t.expo_push_token as string).filter(Boolean);
  if (!list.length) return Response.json({ skipped: 'no devices' });

  const data = { ...(record.data ?? {}), type: record.type, notification_id: record.id };
  const messages = list.map((to) => ({
    to,
    title: record!.title,
    body: record!.body ?? '',
    data,
    sound: 'default',
    channelId: 'default',
    priority: 'high',
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    console.error('push-notify: Expo API', res.status, await res.text());
    return Response.json({ error: 'expo push failed', status: res.status }, { status: 200 });
  }

  // Prune tokens Expo tells us are dead.
  const body = await res.json().catch(() => null);
  const tickets: { status?: string; details?: { error?: string } }[] = body?.data ?? [];
  await Promise.all(
    tickets.map((ticket, i) =>
      ticket?.details?.error === 'DeviceNotRegistered' ? pruneToken(list[i]) : undefined,
    ),
  );

  return Response.json({ sent: list.length });
});
