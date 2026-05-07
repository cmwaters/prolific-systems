export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ error: 'Missing Telegram configuration' });
  }

  const { email, message } = req.body ?? {};
  const trimmedEmail = typeof email === 'string' ? email.trim() : '';
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!trimmedEmail || !trimmedMessage) {
    return res.status(400).json({ error: 'Email and message are required' });
  }

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        disable_web_page_preview: true,
        text: [
          'New Prolific Systems enquiry',
          '',
          `Email: ${trimmedEmail}`,
          '',
          'Message:',
          trimmedMessage,
        ].join('\n'),
      }),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      throw new Error(`Telegram sendMessage failed: ${telegramResponse.status} ${errorText}`);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to send Telegram message' });
  }
}
