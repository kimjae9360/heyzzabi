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

        if (actionId === 'accept_task' && value) {
          const taskId = value;
          const task = await prisma.task.findUnique({ where: { task_id: taskId } });
          if (task) {
            const now = new Date();
            const dueDate = new Date(now.getTime() + (task.estimated_hours || 8) * 60 * 60 * 1000);
            
            await prisma.task.update({
              where: { task_id: taskId },
              data: { 
                status: 'IN_PROGRESS', 
                start_date: now,
                end_date: dueDate
              }
            });
            
            return NextResponse.json({
              replace_original: true,
              text: `✅ 업무 배분이 수락되었습니다! (업무명: ${task.title})`
            });
          }
        }

        if (actionId === 'reject_task' && value) {
          const taskId = value;
          const task = await prisma.task.findUnique({ where: { task_id: taskId } });
          if (task) {
            await prisma.task.update({
              where: { task_id: taskId },
              data: { 
                status: 'PENDING_DISTRIBUTION', 
                assignee_id: null,
                rejected_reason: '담당자가 Slack에서 배분을 거절했습니다.'
              }
            });
            
            // Revert workload
            if (task.assignee_id) {
              const assignee = await prisma.user.findUnique({ where: { user_id: task.assignee_id } });
              if (assignee) {
                const workloadDelta = Math.max(0, assignee.current_workload - (task.estimated_hours || 4) * 3);
                await prisma.user.update({ where: { user_id: assignee.user_id }, data: { current_workload: workloadDelta } });
              }
            }
            
            return NextResponse.json({
              replace_original: true,
              text: `❌ 업무 배분이 거절되었습니다. (업무명: ${task.title})`
            });
          }
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
