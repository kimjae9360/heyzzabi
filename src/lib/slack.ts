import { prisma } from '@/lib/prisma';

export async function sendSlackNotification(message: string) {
  try {
    const slackConn = await prisma.integrationConnection.findUnique({
      where: { provider: 'slack' },
    });

    if (!slackConn || !slackConn.access_token) {
      return false;
    }

    const webhookUrl = slackConn.access_token;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send slack notification', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending slack notification', error);
    return false;
  }
}
