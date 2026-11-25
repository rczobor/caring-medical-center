import { expect, test } from '@playwright/test';
import worker, { type Env, visitorKey } from '../worker/index';

// The Worker's handler, called directly with a fake email binding. No browser needed.
type Sent = Parameters<NonNullable<Env['EMAIL']>['send']>[0];

const valid = {
  name: 'Teszt Elek',
  email: 'teszt@pelda.hu',
  phone: '+36 30 123 4567',
  message: 'Időpontot szeretnék kérni.\nDélután jó lenne.',
  consent: true,
  website: '',
};

function setup(env: Partial<Env> = {}) {
  const sent: Sent[] = [];
  const post = (body: unknown, init: RequestInit = {}) =>
    worker.fetch(
      new Request('https://example.test/api/kapcsolat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        ...init,
      }),
      {
        EMAIL: { send: async (message) => (sent.push(message), { messageId: 'test' }) },
        CONTACT_TO: 'inbox@example.com',
        CONTACT_FROM: 'form@example.com',
        ...env,
      },
    );
  return { sent, post };
}

test('a valid message is emailed to the clinic with the visitor as Reply-To', async () => {
  const { sent, post } = setup();
  expect((await post(valid)).status).toBe(202);
  expect(sent).toHaveLength(1);
  const [email] = sent;
  expect(email?.to).toBe('inbox@example.com');
  expect(email?.from.email).toBe('form@example.com');
  expect(email?.replyTo).toEqual({ email: 'teszt@pelda.hu', name: 'Teszt Elek' });
  expect(email?.subject).toBe('Üzenet a weboldalról: Teszt Elek');
  expect(email?.text).toContain('Telefon: +36 30 123 4567');
  expect(email?.text).toContain('Időpontot szeretnék kérni.\nDélután jó lenne.');
});

test('the preferred clinic labels the email, and "not yet" is spelled out', async () => {
  const { sent, post } = setup();
  await post({ ...valid, clinic: 'Caring Medical Buda' });
  await post({ ...valid, clinic: '' });
  expect(sent.map((e) => e.subject)).toEqual(['Üzenet a weboldalról: Teszt Elek (Caring Medical Buda)', 'Üzenet a weboldalról: Teszt Elek']);
  expect(sent[0]?.text).toContain('Rendelő: Caring Medical Buda');
  expect(sent[1]?.text).toContain('Rendelő: még nem tudja');
  // The clinic never changes who gets the message.
  expect(sent.every((e) => e.to === 'inbox@example.com')).toBe(true);
});

test('a message from the English pages asks the clinic to answer in English', async () => {
  const { sent, post } = setup();
  expect((await post({ ...valid, language: 'en' })).status).toBe(202);
  expect(sent[0]?.subject).toBe('Angol nyelvű üzenet a weboldalról: Teszt Elek');
  expect(sent[0]?.text).toContain('kérjük, angolul válaszoljon');
});

test('invalid submissions are refused without sending', async () => {
  const { sent, post } = setup();
  for (const body of [
    { ...valid, consent: false },
    { ...valid, consent: 'on' },
    { ...valid, name: '   ' },
    { ...valid, email: 'nem-email' },
    { ...valid, phone: undefined },
    { ...valid, message: 'x'.repeat(3001) },
    // A line break in a single-line field would end up in the subject.
    { ...valid, name: 'Teszt\nBcc: masik@pelda.hu' },
    { ...valid, clinic: 'Buda\nBcc: masik@pelda.hu' },
    { ...valid, clinic: 42 },
    null,
    'szöveg',
  ]) {
    expect((await post(body)).status, JSON.stringify(body)).toBe(400);
  }
  expect((await post(undefined, { body: '{nem json' })).status).toBe(400);
  expect(sent).toHaveLength(0);
});

test('a cross-site "no-cors" post, which can only be text/plain, is refused', async () => {
  const { sent, post } = setup();
  expect((await post(valid, { headers: { 'content-type': 'text/plain;charset=UTF-8' } })).status).toBe(415);
  expect(sent).toHaveLength(0);
});

test('a filled-in spam trap looks accepted but sends nothing', async () => {
  const { sent, post } = setup();
  expect((await post({ ...valid, website: 'https://spam.example' })).status).toBe(202);
  expect(sent).toHaveLength(0);
});

test('without the email binding, as on branch previews, the form gets a failure', async () => {
  const request = new Request('https://example.test/api/kapcsolat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(valid),
  });
  expect((await worker.fetch(request, {})).status).toBe(503);
});

test('a failed send is reported as a failure', async () => {
  const { post } = setup({ EMAIL: { send: () => Promise.reject(Object.assign(new Error('nope'), { code: 'E_SENDER_DOMAIN_NOT_AVAILABLE' })) } });
  expect((await post(valid)).status).toBe(502);
});

test('a visitor over the rate limit is turned away before sending', async () => {
  const { sent, post } = setup({ CONTACT_LIMIT: { limit: async () => ({ success: false }) } });
  expect((await post(valid)).status).toBe(429);
  expect(sent).toHaveLength(0);
});

test('only POST /api/kapcsolat is handled', async () => {
  const { post } = setup();
  expect((await post(valid, { method: 'PUT' })).status).toBe(405);
  const other = await worker.fetch(new Request('https://example.test/api/mas'), {});
  expect(other.status).toBe(404);
});

test('IPv6 visitors share a rate limit across their /64', () => {
  expect(visitorKey('203.0.113.7')).toBe('203.0.113.7');
  expect(visitorKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd')).toBe('2001:db8:1:2');
  expect(visitorKey('2001:db8:1:2::1')).toBe('2001:db8:1:2');
  expect(visitorKey('2001:db8::1')).toBe('2001:db8:0:0');
  expect(visitorKey('::1')).toBe('0:0:0:0');
});
