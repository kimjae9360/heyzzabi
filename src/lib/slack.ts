import { prisma } from '@/lib/prisma';

interface SlackMessageOptions {
  text: string;
  blocks?: any[];
  targetChannelId?: string;
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

    const payload: any = { channel: typeof message === 'object' && message.targetChannelId ? message.targetChannelId : channelId };

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

export async function lookupSlackUserByEmail(email: string): Promise<string | null> {
  try {
    const slackConn = await prisma.integrationConnection.findUnique({
      where: { provider: 'slack' },
    });

    if (!slackConn || !slackConn.access_token) return null;

    let botToken = '';
    try {
      const payloadData = JSON.parse(slackConn.access_token);
      botToken = payloadData.botToken;
    } catch {
      return null; // Webhook only
    }

    if (!botToken) return null;

    const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${botToken}`,
      },
    });

    const data = await res.json();
    if (data.ok && data.user && data.user.id) {
      return data.user.id;
    }
    return null;
  } catch (error) {
    console.error('Error looking up slack user', error);
    return null;
  }
}

export async function sendTaskAssignmentNotification(task: any, assigneeEmail: string, assigneeName: string) {
  const slackUserId = await lookupSlackUserByEmail(assigneeEmail);
  if (!slackUserId) return false;

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: "새로운 업무가 배분되었습니다." }
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*업무명:* ${task.title}\n*예상 소요 시간:* ${task.estimated_hours || 0}시간\n*난이도:* ${task.difficulty || '보통'}` }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✅ 수락 (진행)" },
          style: "primary",
          value: task.task_id,
          action_id: "accept_task"
        },
        {
          type: "button",
          text: { type: "plain_text", text: "❌ 거절" },
          style: "danger",
          value: task.task_id,
          action_id: "reject_task"
        }
      ]
    }
  ];

  return await sendSlackNotification({
    text: `새로운 업무가 배분되었습니다: ${task.title}`,
    blocks,
    targetChannelId: slackUserId // Custom property to route to user directly
  });
}
