// Welcome email — sent once, in the background, when a new user is created.
//
// Wiring: a Supabase **Database Webhook** on `auth.users` INSERT posts here.
// The webhook payload looks like:
//   { type: "INSERT", table: "users", schema: "auth", record: { email, raw_user_meta_data, ... } }
//
// It sends through **Resend** (https://resend.com). Set these function secrets:
//   RESEND_API_KEY       — required; the function is a no-op without it
//   WELCOME_EMAIL_FROM   — e.g. "Hommie <hello@hommieapp.com>" (must be a Resend-verified domain)
//   WEBHOOK_SECRET        — optional; if set, the webhook must send it as `x-webhook-secret`
//
// Deploy:  supabase functions deploy welcome-email --no-verify-jwt
// See docs/WELCOME_EMAIL_SETUP.md for the full runbook.

interface WebhookPayload {
  type: string;
  table: string;
  record?: {
    email?: string | null;
    raw_user_meta_data?: Record<string, unknown> | null;
  } | null;
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = Deno.env.get('WELCOME_EMAIL_FROM') ?? 'Hommie <hello@hommieapp.com>';
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

function firstNameFrom(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta) return null;
  const raw =
    (meta.first_name as string) ||
    (meta.given_name as string) ||
    (typeof meta.name === 'string' ? meta.name.split(' ')[0] : '') ||
    (typeof meta.full_name === 'string' ? meta.full_name.split(' ')[0] : '');
  return raw?.trim() || null;
}

function isLandlord(meta: Record<string, unknown> | null | undefined): boolean {
  return (meta?.role as string) === 'landlord';
}

function renderEmail(firstName: string | null, landlord: boolean): { subject: string; html: string; text: string } {
  const hi = firstName ? `Hi ${firstName},` : 'Hi there,';
  const lead = landlord
    ? 'Thanks for joining Hommie. You can now list your properties and reach students looking for a place across Cyprus.'
    : 'Thanks for joining Hommie — the app for student life in Cyprus: housing, roommates, jobs, events and a community that has your back.';
  const nextSteps = landlord
    ? ['Set up your landlord workspace', 'Create your first listing with photos and rent', 'Reply to student enquiries from Messages']
    : ['Finish your profile so we can tailor things to you', 'Browse accommodation and save the places you like', 'Find roommates and see what students are talking about'];

  const steps = nextSteps.map((s) => `<li style="margin:6px 0;">${s}</li>`).join('');

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#F5F5F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16151D;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F8;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #E8E7EE;border-radius:20px;overflow:hidden;">
          <tr><td style="padding:28px 28px 0 28px;">
            <div style="font-size:22px;font-weight:800;color:#4F46E5;letter-spacing:-0.02em;">Hommie</div>
          </td></tr>
          <tr><td style="padding:20px 28px 28px 28px;">
            <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;">Welcome to Hommie</h1>
            <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#3B3A45;">${hi}</p>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3B3A45;">${lead}</p>
            <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#6B6A78;">A few things to try</p>
            <ul style="margin:0 0 20px 0;padding-left:20px;font-size:15px;line-height:1.6;color:#3B3A45;">${steps}</ul>
            <a href="https://hommieapp.com" style="display:inline-block;background:#4F46E5;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">Open Hommie</a>
          </td></tr>
          <tr><td style="padding:0 28px 28px 28px;">
            <p style="margin:16px 0 0 0;font-size:12px;line-height:1.6;color:#9E9DAB;border-top:1px solid #E8E7EE;padding-top:16px;">
              You're getting this because you created a Hommie account. Questions? Just reply to this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `${hi}\n\n${lead}\n\nA few things to try:\n${nextSteps.map((s) => `- ${s}`).join('\n')}\n\nOpen Hommie: https://hommieapp.com\n\nYou're getting this because you created a Hommie account.`;

  return { subject: 'Welcome to Hommie', html, text };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const email = payload.record?.email?.trim();
  if (payload.type !== 'INSERT' || !email) {
    return new Response(JSON.stringify({ skipped: 'not a new user with an email' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!RESEND_API_KEY) {
    console.warn('welcome-email: RESEND_API_KEY not set — skipping send for', email);
    return new Response(JSON.stringify({ skipped: 'no RESEND_API_KEY' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const meta = payload.record?.raw_user_meta_data ?? null;
  const { subject, html, text } = renderEmail(firstNameFrom(meta), isLandlord(meta));

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: email, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('welcome-email: Resend error', res.status, body);
    return new Response(JSON.stringify({ error: 'send failed', status: res.status }), {
      status: 200, // don't fail the webhook; a missed welcome email isn't critical
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ sent: email }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
