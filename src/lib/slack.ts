import { prisma } from '@/lib/prisma';

interface SlackMessageOptions {
  text: string;
  blocks?: any[];
}

export async function sendSlackNotification(message: string | SlackMessageOptions) {
  try {
    const slackConn = await prisma.integrationConnection.findUnique({
      where: { provider: 'slack' },
    });

    if (!slackConn || !slackConn.access_token) {
      return false;
    }

    let payloadData;
    try {
      payloadData = JSON.parse(slackConn.access_token);
    } catch {
      payloadData = { webhookUrl: slackConn.access_token };
    }

    // Webhook 호환성 유지
    if (payloadData.webhookUrl || slackConn.access_token.startsWith('https://hooks.slack.com/')) {
      const webhookUrl = payloadData.webhookUrl || slackConn.access_token;
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: typeof message === 'string' ? message : message.text }),
      });
      return response.ok;
    }

    const { botToken, channelId } = payloadData;
    if (!botToken || !channelId) return false;

    const payload: any = { channel: channelId };

    if (typeof message === 'string') {
      payload.text = message;
    } else {
      payload.text = message.text;
      if (message.blocks) payload.blocks = message.blocks;
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('Failed to send slack notification', result);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending slack notification', error);
    return false;
  }
}
