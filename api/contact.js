import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const toEmail = process.env.CONTACT_TO_EMAIL ?? 'cmwaters19@gmail.com';
const fromEmail = process.env.CONTACT_FROM_EMAIL ?? 'Prolific Systems <onboarding@resend.dev>';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY' });
  }

  const { email, message } = req.body ?? {};
  const trimmedEmail = typeof email === 'string' ? email.trim() : '';
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedEmail || !trimmedMessage) {
    return res.status(400).json({ error: 'Email and message are required' });
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: trimmedEmail,
      subject: 'New Prolific Systems enquiry',
      text: [
        'New enquiry from the Prolific Systems site.',
        '',
        `Email: ${trimmedEmail}`,
        '',
        'Message:',
        trimmedMessage,
      ].join('\n'),
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to send message' });
  }
}
