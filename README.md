# 🚀 ReachInbox – Full-Stack Email Job Scheduler & Dashboard

A production-grade, distributed email scheduling service and real-time dashboard built for scale, resilience, and reliability. This project powers cold email outreach sequences with BullMQ delayed queues, Redis-backed sliding window rate limiters, multi-sender Ethereal SMTP delivery, Elasticsearch search indexing, live Slack alerts, and Google OAuth authentication.

---

## 📌 Table of Contents
1. [Tech Stack](#-tech-stack)
2. [Architecture Overview](#-architecture-overview)
   - [How Scheduling Works (No Cron)](#1-how-scheduling-works-no-cron)
   - [Persistence Across Server Restarts & Idempotency](#2-persistence-across-server-restarts--idempotency)
   - [Concurrency, Provider Delay Throttling & Rate Limiting](#3-concurrency-provider-delay-throttling--rate-limiting)
   - [Live Slack Notification on Rate Limit Hit](#4-live-slack-notification-on-rate-limit-hit)
   - [Elasticsearch Indexing & Search](#5-elasticsearch-indexing--search)
3. [Features Implemented (Requirement Mapping)](#-features-implemented)
4. [External Accounts & Prerequisites](#-external-accounts--prerequisites)
5. [Step-by-Step Setup & Installation](#-step-by-step-setup--installation)
   - [1. Backend Setup](#1-backend-setup)
   - [2. Database & Redis Setup](#2-database--redis-setup)
   - [3. Frontend Setup](#3-frontend-setup)
6. [Running the Application](#-running-the-application)
7. [Testing the 4 Key Demo Scenarios](#-testing-the-4-key-demo-scenarios)
   - [Scenario 1: Scheduling Emails (CSV Lead Upload)](#scenario-1-scheduling-emails-csv-lead-upload)
   - [Scenario 2: Server Restart Resilience Test](#scenario-2-server-restart-resilience-test)
   - [Scenario 3: Hourly Rate Limiting & Live Slack Notification](#scenario-3-hourly-rate-limiting--live-slack-notification)
   - [Scenario 4: Elasticsearch Search & BullMQ Dashboard](#scenario-4-elasticsearch-search--bullmq-dashboard)
8. [Assumptions, Trade-Offs & Design Choices](#-assumptions-trade-offs--design-choices)
9. [Submission Information](#-submission-information)

---

## 🛠 Tech Stack

### Backend
- **Language**: TypeScript (`ES2022`, Node.js)
- **Framework**: Express.js
- **Queue Engine**: BullMQ (backed by Redis)
- **Database**: PostgreSQL with Prisma ORM
- **SMTP**: Ethereal Email (Nodemailer fake SMTP with preview URLs)
- **Search Engine**: Elasticsearch (`@elastic/elasticsearch`) with automatic Database search fallback
- **Queue Observability**: `@bull-board/express` & `@bull-board/ui` (mounted at `/admin/queues`)
- **Integrations**: Google OAuth token verification (`google-auth-library`), Slack Webhook & OAuth API (`axios`)

### Frontend
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS + Custom Dark Theme matching ReachInbox Figma design
- **Icons**: Lucide React
- **Lead Parsing**: PapaParse (CSV & Text parsing)
- **Authentication**: `@react-oauth/google` Google Login with 1-click fallback
- **Notifications**: Sonner (toasts) & date-fns

---

## 🏛 Architecture Overview

### 1. How Scheduling Works (No Cron)
- **Zero Cron**: No OS-level cron jobs, `node-cron`, or agenda are used.
- When an email schedule request arrives via `POST /api/emails/schedule`, the backend:
  1. Creates an `EmailJob` in PostgreSQL with status `SCHEDULED`.
  2. Calculates the exact delay in milliseconds: `delayMs = Math.max(0, scheduledAt.getTime() - Date.now())`.
  3. Enqueues the job into BullMQ's delayed queue using `jobId = emailJob.id`.
  4. BullMQ leverages Redis sorted sets (`zset`) under the hood to wake up the job exactly when `delayMs` elapses, triggering our dedicated worker.

### 2. Persistence Across Server Restarts & Idempotency
- **Redis Durability**: BullMQ's state resides in persistent Redis storage. If the server terminates, Redis preserves all pending delayed jobs.
- **Startup Reconciliation Engine (`reconcilePendingJobsOnStartup`)**:
  - Upon server boot, the scheduler checks PostgreSQL for any jobs marked `SCHEDULED` or `RATE_LIMITED`.
  - For each job, it checks if it already exists in BullMQ. If missing (e.g. if Redis was flushed or restarted), it re-enqueues the job with the remaining delay (`Math.max(0, scheduledAt - now)`).
  - If the scheduled time passed while the server was down, the job delay is `0` and sends immediately upon startup.
- **Strict Idempotency**:
  - The BullMQ `jobId` is set to the unique UUID `emailJob.id`. BullMQ automatically rejects duplicate job submissions with the same ID.
  - In the worker, before sending, an idempotency check verifies if `status === 'SENT'`. If so, duplicate sends are aborted.

### 3. Concurrency, Provider Delay Throttling & Rate Limiting
- **Worker Concurrency**:
  - BullMQ worker is configured with `concurrency: config.WORKER_CONCURRENCY` (default: 5 parallel workers).
- **Delay Between Each Email**:
  - To mimic ESP provider throttling (e.g., SendGrid/Amazon SES rate throttling), the worker applies a configurable delay (default: `2 seconds`) between consecutive sends.
- **Sliding-Window Hourly Rate Limiting Per Sender**:
  - Multi-sender support: Each sender has their own credentials and hourly quota.
  - Backed by an atomic Redis counter keyed by `ratelimit:sender:<senderEmail>:<YYYY-MM-DD-HH>`.
  - Atomically executed via Redis `multi()` transaction (`INCR` and `EXPIRE 7200s`).
  - **Behavior when rate limit is exceeded**:
    - **Jobs are NEVER dropped or permanently failed**.
    - The worker calculates the milliseconds until the start of the next hour window (`getMillisecondsUntilNextHour()`).
    - The database record status is transitioned to `RATE_LIMITED` and its `scheduledAt` is updated to the next hour.
    - The job is rescheduled in BullMQ with the postponement delay.
    - An immediate live Slack notification is dispatched.

### 4. Live Slack Notification on Rate Limit Hit
- Users can connect their Slack channel via OAuth or directly via an Incoming Webhook URL.
- The instant an hourly rate limit is hit, `sendSlackRateLimitNotification()` sends a rich Slack block message containing:
  - Sender email address
  - Reached limit (e.g., `5 emails/hour`)
  - Recipient affected
  - Next available dispatch time
- If Slack is not connected, the scheduler safely proceeds without crashing or throwing unhandled errors.

### 5. Elasticsearch Indexing & Search
- All scheduled and sent email records are indexed in Elasticsearch index `email_jobs`.
- The search bar in the frontend performs multi-match full-text fuzzy queries over `recipientEmail`, `subject`, `body`, and `senderEmail`.
- **Resilient Fallback**: If Elasticsearch is not reachable or offline, the search service automatically and transparently falls back to PostgreSQL ILIKE queries.

---

## 📋 Features Implemented

| Requirement Category | Feature | Status |
| :--- | :--- | :--- |
| **Backend Scheduler** | No cron scheduling via BullMQ delayed jobs | ✅ Complete |
| **Backend Persistence**| Server restart resilience with startup reconciliation & idempotency | ✅ Complete |
| **Multi-Sender SMTP** | Ethereal Email fake SMTP with multiple sender accounts & preview links | ✅ Complete |
| **Concurrency** | Configurable BullMQ parallel worker concurrency | ✅ Complete |
| **Delay Throttling** | Minimum delay (2s) between individual email dispatches | ✅ Complete |
| **Hourly Rate Limiter**| Redis atomic counter per sender per hour with auto-rescheduling | ✅ Complete |
| **Slack Integration** | Live Slack alert on hourly rate limit hit (OAuth + Webhook support) | ✅ Complete |
| **Elasticsearch** | Email indexing and full-text search API with DB fallback | ✅ Complete |
| **Queue Visibility** | Live Bull-Board dashboard mounted at `/admin/queues` | ✅ Complete |
| **Frontend Auth** | Google OAuth login with profile display & logout | ✅ Complete |
| **Frontend Dashboard**| Pixel-accurate ReachInbox Figma design (Dark theme) | ✅ Complete |
| **Compose Modal** | Lead CSV/TXT upload & parser, subject, body, sender selector, schedule controls | ✅ Complete |
| **Scheduled Table** | Email, Subject, Sender, Scheduled Time, Status badge, Cancel action | ✅ Complete |
| **Sent Table** | Email, Subject, Sender, Sent Time, Status badge, Ethereal Web preview link | ✅ Complete |

---

## 🔑 External Accounts & Prerequisites

To run this application, here are the credentials you will need:

### 1. Database & Redis (Choose ONE option):
- **Option A (Docker - Recommended)**:
  - If Docker Desktop is installed, simply run:
    ```bash
    docker compose up -d
    ```
- **Option B (Free Cloud Services - Zero Installation)**:
  - **PostgreSQL**: Create a free database at [Neon.tech](https://neon.tech/) or [Supabase.com](https://supabase.com/) &rarr; Copy `DATABASE_URL`.
  - **Redis**: Create a free Redis instance at [Upstash.com](https://upstash.com/) &rarr; Copy `REDIS_URL`.
  - **Elasticsearch**: Docker image included in `docker-compose.yml`, or free trial on Elastic Cloud / Bonsai.io (Search seamlessly falls back to DB if ES is skipped).

### 2. Google OAuth (for Google Login):
- Go to [Google Cloud Console](https://console.cloud.google.com/) &rarr; APIs & Services &rarr; Credentials.
- Create an **OAuth 2.0 Client ID (Web Application)**.
- Set Authorized JavaScript Origins: `http://localhost:5173`.
- Copy your Client ID into `frontend/.env` and `backend/.env`.
*(Note: A 1-click demo login is also built into the frontend for rapid testing without entering keys).*

### 3. Slack App / Webhook (for Live Rate-Limit Alerts):
- Create a Slack Webhook at [api.slack.com/apps](https://api.slack.com/apps) &rarr; **Incoming Webhooks** &rarr; Add New Webhook to Workspace.
- Copy the webhook URL (e.g., `https://hooks.slack.com/services/T.../B.../...`).
- You can paste this directly into the "Connect Slack" modal on the dashboard!

### 4. Ethereal Email (Fake SMTP):
- Zero signup required! Run the included generator script:
  ```bash
  cd backend
  npm run ethereal:create
  ```
  Or the backend will automatically generate one for you on first boot!

---

## ⚙️ Step-by-Step Setup & Installation

### Step 1: Install Dependencies Manually

#### Backend:
```bash
cd backend
npm install
```

#### Frontend:
```bash
cd ../frontend
npm install
```

---

### Step 2: Configure Environment Variables

#### Backend `.env`:
Create `backend/.env` (copy from `backend/.env.example`):
```env
PORT=5000
FRONTEND_URL=http://localhost:5173

# PostgreSQL Connection String (Local Docker or Neon/Supabase)
DATABASE_URL="postgresql://postgres:password123@localhost:5432/reachinbox_scheduler?schema=public"

# Redis URL (Local Docker or Upstash)
REDIS_URL="redis://localhost:6379"

# Elasticsearch URL
ELASTICSEARCH_URL="http://localhost:9200"

# Rate Limiting & Concurrency Configuration
WORKER_CONCURRENCY=5
DEFAULT_DELAY_BETWEEN_EMAILS_SECONDS=2
DEFAULT_MAX_EMAILS_PER_HOUR_PER_SENDER=5

# Google Client ID (optional if testing via demo login)
GOOGLE_CLIENT_ID=""

# Slack Integration (optional default webhook)
SLACK_CLIENT_ID=""
SLACK_CLIENT_SECRET=""
SLACK_REDIRECT_URI="http://localhost:5000/api/slack/oauth/callback"
SLACK_DEFAULT_WEBHOOK_URL=""
```

#### Frontend `.env`:
Create `frontend/.env` (copy from `frontend/.env.example`):
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=""
```

---

### Step 3: Run Database Migrations
In the `backend` directory, apply the Prisma schema to your PostgreSQL database:
```bash
cd backend
npx prisma db push
```

---

## 🚀 Running the Application

### 1. Start Infrastructure (if using Docker)
```bash
docker compose up -d
```

### 2. Start the Backend API & BullMQ Worker
```bash
cd backend
npm run dev
```
You will see:
```
✅ Connected to Database via Prisma
✅ Connected to Redis successfully
🚀 [BullMQ Worker] Started with concurrency = 5
✅ [Startup] Reconciled and restored 0 jobs in BullMQ.
🚀 ReachInbox Scheduler Backend running on port 5000
📊 BullMQ Queue Dashboard: http://localhost:5000/admin/queues
🔗 API Base: http://localhost:5000/api
```

### 3. Start the Frontend Dashboard
```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🧪 Testing the 4 Key Demo Scenarios

### Scenario 1: Scheduling Emails (CSV Lead Upload)
1. Open `http://localhost:5173` and sign in.
2. Click **"+ Compose New Email"**.
3. Click **"Click to upload leads (.csv, .txt)"** and select `samples/sample_leads.csv`.
4. The system detects **8 leads** automatically and displays them as chips.
5. Fill in Subject and Body. Set Start Time to 1 minute from now, delay to 2 seconds, and hourly limit to 5.
6. Click **"Schedule Email(s)"**.
7. Observe the leads populate the **"Scheduled Emails"** tab.
8. When the start time arrives, watch the BullMQ worker pick up each job, wait the 2-second delay, and deliver it via Ethereal SMTP.
9. Switch to the **"Sent Emails"** tab and click **"View in Ethereal"** to preview the rendered email in your browser!

### Scenario 2: Server Restart Resilience Test
1. Schedule 5 emails for 3 minutes in the future.
2. Stop the backend process (`Ctrl + C` in the backend terminal).
3. Wait 30 seconds. Notice Redis and PostgreSQL retain the pending jobs.
4. Restart the backend (`npm run dev`).
5. Observe the startup reconciler log:
   `[Startup] Reconciled and restored jobs in BullMQ.`
6. When the scheduled time arrives, future emails are sent on time without missing or duplicating any jobs.

### Scenario 3: Hourly Rate Limiting & Live Slack Notification
1. In the top header of the dashboard, click **"Connect Slack"**.
2. Paste your Slack Incoming Webhook URL and click **"Save Webhook & Test Ping"**. Click **"Test Alert"** to verify your channel receives the test notification.
3. In the Compose modal, set **Hourly Cap / Sender = 2**, and upload 4 email leads.
4. The first 2 emails will send normally.
5. On the 3rd email, the worker detects that the hourly quota (2/hr) has been exceeded:
   - The job is **NOT** dropped or failed.
   - It is postponed to the next hour window and marked with the amber badge: `Rate Limited (Postponed)`.
   - BullMQ reschedules it in the queue.
   - A **live Slack notification** is delivered to your Slack channel showing the sender, affected recipient, and next window!

### Scenario 4: Elasticsearch Search & BullMQ Dashboard
1. Type a recipient name, company, or subject keyword into the top search bar.
2. The search automatically queries Elasticsearch (or DB fallback) with instant debouncing.
3. Click **"Live BullMQ Board"** in the top header or visit `http://localhost:5000/admin/queues` to inspect live BullMQ delayed, active, and completed queues.

---

## 💡 Assumptions, Trade-Offs & Design Choices

1. **Why BullMQ Delayed Jobs instead of Cron**:
   - Cron jobs inspect tables periodically, creating database polling overhead and race conditions under multi-worker scaling.
   - BullMQ delayed jobs are event-driven, microsecond-accurate, backed by Redis sorted sets (`zset`), and scale effortlessly across multiple distributed worker processes.
2. **Why Sliding Window Hourly Rate Limiting**:
   - Rate limiters using in-memory state fail when multiple worker nodes run in parallel.
   - By anchoring the counter in Redis keyed by `ratelimit:sender:<email>:<hour>`, multiple worker threads or cluster instances execute atomic checks without concurrency collisions.
3. **Resilient Elasticsearch Fallback**:
   - To make testing and local evaluation frictionless, if an evaluator runs the project without Elasticsearch, the search endpoints automatically fall back to PostgreSQL full-text search with zero errors.

---

## 📬 Submission Information
- **Access Granted**: Mitrajit and Yadav036
- **Assignment Form**: https://forms.clickup.com/9005062261/f/8cbwp3n-8876/6NNNJ92DV93PQTAYST
