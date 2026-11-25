// The Worker behind the static site. Cloudflare serves every file in dist/ on its own and
// runs this script only for /api/* (`assets.run_worker_first` in wrangler.jsonc).
//
// POST /api/kapcsolat turns the contact form (src/components/ContactForm.astro) into an
// email to the clinic. Nothing is stored: the message goes straight to the inbox.

interface OutgoingEmail {
  to: string;
  from: { email: string; name: string };
  replyTo: { email: string; name: string };
  subject: string;
  text: string;
}

export interface Env {
  // Branch previews don't inherit bindings or vars, so every one of these can be missing.
  // Without EMAIL, CONTACT_TO or CONTACT_FROM the endpoint answers 503 and the form
  // offers the phone number instead.
  EMAIL?: { send(message: OutgoingEmail): Promise<{ messageId: string }> };
  /** The clinic inbox. The only recipient: nothing a visitor sends picks the address. */
  CONTACT_TO?: string;
  /** Address on an onboarded sending domain. */
  CONTACT_FROM?: string;
  CONTACT_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

const maxLength = { name: 120, email: 200, phone: 40, clinic: 80, message: 3000 };

// The browser's own rule for <input type="email"> (WHATWG), so the server accepts exactly
// what the form's validation lets through.
const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const controlChars = /[\u0000-\u001f\u007f]/;

const status = (code: number) => new Response(null, { status: code });

/**
 * Rate-limit key for a visitor. An IPv6 host usually holds a whole /64 and can pick a new
 * address for every request, so IPv6 is keyed on its first four groups.
 */
export function visitorKey(ip: string) {
  if (!ip.includes(':')) return ip;
  const [head = '', tail] = ip.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const zeros = tail === undefined ? [] : Array<string>(8 - left.length - right.length).fill('0');
  return [...left, ...zeros, ...right].slice(0, 4).join(':');
}

/** A trimmed, non-empty string within `max` characters, or undefined. */
function text(value: unknown, max: number, { multiline = false } = {}) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return undefined;
  // Single-line fields end up in the subject and Reply-To, where a line break has no place.
  if (!multiline && controlChars.test(trimmed)) return undefined;
  return trimmed;
}

async function contact(request: Request, env: Env) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
  // Another site can't send this header without a CORS preflight, which goes unanswered.
  // Without the check, any page could make its visitors' browsers post here ("no-cors"
  // text/plain), each from their own IP, past the rate limit.
  if (!request.headers.get('content-type')?.startsWith('application/json')) return status(415);
  if (!env.EMAIL || !env.CONTACT_TO || !env.CONTACT_FROM) return status(503);

  if (env.CONTACT_LIMIT) {
    const { success } = await env.CONTACT_LIMIT.limit({ key: visitorKey(request.headers.get('cf-connecting-ip') ?? 'unknown') });
    if (!success) return status(429);
  }

  // Any JSON value works here: property reads on a string, number or array give undefined,
  // which fails validation below like a missing field. Only null needs the fallback.
  const body: Partial<Record<string, unknown>> = (await request.json().catch(() => null)) ?? {};

  // The spam trap is filled in only by bots. Answer as if it worked so they move on.
  if (body['website']) return status(202);

  const name = text(body['name'], maxLength.name);
  const email = text(body['email'], maxLength.email);
  const phone = text(body['phone'], maxLength.phone);
  const message = text(body['message'], maxLength.message, { multiline: true });
  // Optional: empty means the visitor doesn't know yet. It only labels the email and
  // never picks the recipient.
  const chosenClinic = body['clinic'] ?? '';
  const clinic = chosenClinic === '' ? undefined : text(chosenClinic, maxLength.clinic);
  if (!name || !email || !emailPattern.test(email) || !phone || !message || body['consent'] !== true) return status(400);
  if (chosenClinic !== '' && !clinic) return status(400);
  // Sent from the English pages, so the clinic knows to answer in English. Anything else is
  // the Hungarian site's form, including one cached from before the field existed.
  const english = body['language'] === 'en';

  try {
    await env.EMAIL.send({
      to: env.CONTACT_TO,
      from: { email: env.CONTACT_FROM, name: 'Caring Medical weboldal' },
      // Replying goes straight to the visitor. They stay out of From, which the clinic's
      // mail server would reject for failing the sender domain's checks.
      replyTo: { email, name },
      subject: `${english ? 'Angol nyelvű üzenet' : 'Üzenet'} a weboldalról: ${name}${clinic ? ` (${clinic})` : ''}`,
      text: [
        'Új üzenet érkezett a weboldal kapcsolatfelvételi űrlapjáról.',
        ...(english ? ['Az angol nyelvű oldalról küldték: kérjük, angolul válaszoljon.'] : []),
        '',
        `Név: ${name}`,
        `Email: ${email}`,
        `Telefon: ${phone}`,
        `Rendelő: ${clinic ?? 'még nem tudja'}`,
        '',
        'Üzenet:',
        message,
        '',
        '---',
        'A küldő elfogadta az adatkezelési tájékoztatót.',
        'A Válasz gombbal a küldő email címére válaszolhat.',
      ].join('\n'),
    });
  } catch (error) {
    // Log the error code only: the message itself is personal data.
    console.error('contact form: sending failed', error instanceof Error && 'code' in error ? error.code : 'unknown');
    return status(502);
  }
  return status(202);
}

export default {
  async fetch(request: Request, env: Env) {
    const { pathname } = new URL(request.url);
    return pathname === '/api/kapcsolat' ? contact(request, env) : status(404);
  },
};
