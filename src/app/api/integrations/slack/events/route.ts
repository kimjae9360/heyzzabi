import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSlackNotification } from '@/lib/slack';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Slack sends URL encoded data for Interactive Components (buttons)
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      const payloadStr = params.get('payload');
      
      if (!payloadStr) {
        return NextResponse.json({ error: 'No payload' }, { status: 400 });
      }

      const payload = JSON.parse(payloadStr);

      // Handle Interactive Component Actions (e.g., Button clicks)
      if (payload.type === 'block_actions') {
        const action = payload.actions[0];
        const actionId = action.action_id;
        const value = action.value;
        const userId = payload.user.id;

        // Example: approval logic
        if (actionId === 'approve_task' && value) {
          const taskId = value;
          
          await prisma.task.update({
            where: { task_id: taskId },
            data: { 
              status: 'IN_PROGRESS', 
              start_date: new Date()
            }
          });
          
          // Send a message back replacing the original button message
          return NextResponse.json({
            replace_original: true,
            text: `업무 배분이 승인되었습니다! (<@${userId}>님이 승인)`
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    // JSON parsing for Events API (e.g. url_verification)
    const body = await request.json();
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Handle standard events (e.g., app_mention)
    if (body.type === 'event_callback') {
      const event = body.event;
      // TODO: Handle AI chatbot features or other message events here.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Slack event error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
