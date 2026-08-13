-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "job_title" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "employee_no" TEXT NOT NULL,
    "hire_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "profile_image" TEXT,
    "last_login_at" DATETIME,
    "current_workload" INTEGER NOT NULL DEFAULT 0,
    "stack" TEXT,
    "certifications" TEXT,
    "past_projects" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "project_id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "start_date" DATETIME,
    "end_date" DATETIME,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "author_id" TEXT NOT NULL,
    CONSTRAINT "Project_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Meeting" (
    "meeting_id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "meeting_date" DATETIME NOT NULL,
    "location" TEXT,
    "meeting_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "project_id" TEXT,
    "organizer_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    CONSTRAINT "Meeting_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("project_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Meeting_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "User" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Meeting_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeetingParticipant" (
    "participant_id" TEXT NOT NULL PRIMARY KEY,
    "attendance_status" TEXT NOT NULL DEFAULT 'ATTENDED',
    "role" TEXT NOT NULL DEFAULT 'PARTICIPANT',
    "meeting_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "MeetingParticipant_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "Meeting" ("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeetingParticipant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Planning" (
    "planning_id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejected_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "approved_by" TEXT,
    "approved_at" DATETIME,
    "project_id" TEXT NOT NULL,
    "meeting_id" TEXT,
    "author_id" TEXT NOT NULL,
    CONSTRAINT "Planning_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("project_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Planning_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "Meeting" ("meeting_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Planning_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Planning_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "User" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "task_id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_DISTRIBUTION',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "estimated_hours" INTEGER,
    "difficulty" TEXT,
    "rejected_reason" TEXT,
    "delay_reason" TEXT,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "assignee_id" TEXT,
    "project_id" TEXT,
    "planning_id" TEXT,
    "meeting_id" TEXT,
    CONSTRAINT "Task_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "User" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("project_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_planning_id_fkey" FOREIGN KEY ("planning_id") REFERENCES "Planning" ("planning_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "Meeting" ("meeting_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskAssignmentLog" (
    "log_id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TaskAssignmentLog_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task" ("task_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskAssignmentLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "notification_id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("user_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employee_no_key" ON "User"("employee_no");
