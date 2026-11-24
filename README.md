# Levelling Up — Members-Only Video Platform

A clean, production-ready web application built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

"Levelling Up" is an exclusive, members-only platform where users pay by bank transfer (RIB), upload a payment receipt screenshot, and automatically gain access to high-value video lessons once an administrator approves their payment.

---

## 📸 Design Highlights (Exact Match to Mockup)

- **Clean White Aesthetic**: Soft off-white backgrounds (`#FAFAFA`), solid black action buttons & headings, rounded corners (16–24px), crisp thin borders, and soft shadows.
- **Subtle Gold Accent (`#B8860B`)**: Used selectively on key highlight icons (Their language, Their logic, Their emotions, credit card icon, and star ratings).
- **Inter Typography**: Modern, readable, responsive typography from mobile phones to 4K displays.
- **Custom Brand Identity**: Black geometric triangle mark + "Levelling Up".

---

## 🚀 Key Pages & Architecture

1. **Landing Page (`/`)**:
   - Hero headline: *"Real masculinity is not understanding women to control them. It's understanding them without losing yourself."*
   - Subtitle: *"Build emotional intelligence. Improve your relationships. Become the best version of yourself."*
   - "Join now" CTA pill button & hero image matching the silhouette looking over a city skyline.
   - 3 Pillar cards: **Their language**, **Their logic**, and **Their emotions** with gold accent icons.
   - Testimonials: Real member reviews with 5 gold stars.
   - "Get in touch" card with WhatsApp / Email support modal.
   - Minimalist footer with copyright, navigation links, and social icons.

2. **Sign In & Sign Up (`/login`, `/signup`)**:
   - Email & password authentication.
   - Validation, error feedback, and show/hide password toggle.
   - Clean card design with seamless switching between modes.

3. **Payment Page ("Activate your access" at `/activate`)**:
   - Dedicated gate for logged-in users who have not yet been approved.
   - Dynamically loads payment details from the admin `settings` table:
     - **Account Holder Name** (with 1-click [Copy] button)
     - **RIB** (with 1-click [Copy] button)
     - **Price** (with 1-click [Copy] button)
     - **Unique Reference Code** (auto-generated for each user upon signup, e.g. `LU20251124`)
   - Drag-and-drop screenshot upload with file preview, max 5MB limit, and validation.
   - Amber **Pending approval** badge once submitted.
   - If rejected, displays the administrator's exact rejection reason with immediate re-upload capability.

4. **Video Library (`/videos`)**:
   - Accessible only to approved members (enforced client-side and via Postgres RLS).
   - Sidebar navigation: *Videos*, *My Account*, *Settings*, *Logout*.
   - Search bar to filter lessons in real-time.
   - Dual-pane layout / theater player matching the mockup:
     - Left: Grid of video cards with duration badge (`12:45`) and thumbnails.
     - Right: Active protected video player with lesson title and full description below.
   - Player security: `controlsList="nodownload"`, right-click disabled, and signed short-lived playback URLs.

5. **My Account (`/account`)**:
   - Displays user email, member status badge, unique reference code, and registration date.
   - Change password form.
   - Quick navigation to lessons or payment activation.

6. **Admin Panel (`/admin`)**:
   - Strictly protected: non-admins cannot access.
   - **Payments**: Table of pending, approved, and rejected payments with customer name, email, amount, and date.
     - Click thumbnail to open the **Screenshot Lightbox Modal** to verify transaction details.
     - **Approve**: Safely executes atomic transaction updating payment and profile in one step.
     - **Reject**: Modal with pre-configured quick reason chips (*"Reference code missing"*, *"Amount mismatch"*, etc.) or custom reason.
   - **Videos**: Form to upload new lessons with upload progress bar, title, description, duration, and thumbnail; list of all videos with edit, delete, and publish/draft toggle.
   - **Users**: Searchable directory of users with one-click access grant/revoke and admin role toggles.
   - **Settings**: Editable fields for RIB, Account Holder, Bank Name, Price (MAD), WhatsApp, and Email.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router v6.
- **Backend / Database**: Supabase (PostgreSQL), Supabase Auth, Supabase Storage.
- **Security**: PostgreSQL Row Level Security (RLS) on all tables and storage buckets, atomic approval/rejection functions with `SECURITY DEFINER`.

---

## 🗄 Database Schema & RLS

The database migration is located at:
[`supabase/migrations/001_init.sql`](file:///c:/Users/Mac/womens%20weebsite/supabase/migrations/001_init.sql)

### Tables:
- `profiles`: `id` (references `auth.users`), `email`, `full_name`, `is_admin`, `status` (`none`, `pending`, `approved`, `rejected`), `reference_code` (unique), timestamps.
- `payments`: `id`, `user_id`, `screenshot_path`, `amount`, `status`, `rejection_reason`, `created_at`, `reviewed_at`.
- `videos`: `id`, `title`, `description`, `video_path`, `thumbnail_path`, `duration`, `is_published`, timestamps.
- `settings`: single row (`id = 1`) with `rib`, `account_holder`, `bank_name`, `price`, `contact_whatsapp`, `contact_email`.

### Storage Buckets:
- `payment-screenshots` (Private): Users can only upload into their own folder (`<auth.uid>/*`); only admin can view all receipts.
- `videos` (Private): Only admin can upload; approved users stream via short-lived signed URLs.
- `thumbnails`: Public/authenticated read, admin upload.

---

## ⚙️ Step-by-Step Setup Guide

### 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **"New Project"**.
3. Choose a name (e.g. `levelling-up`), set a strong database password, and pick a region close to your target audience.
4. Wait 1–2 minutes for the database to provision.

### 2. Run the SQL Migration
1. In your Supabase dashboard, go to the **SQL Editor** tab on the left menu.
2. Click **"New query"**.
3. Copy the entire contents of [`supabase/migrations/001_init.sql`](file:///c:/Users/Mac/womens%20weebsite/supabase/migrations/001_init.sql) and paste it into the editor.
4. Click **Run** (or press Ctrl + Enter).
   - This creates all tables (`profiles`, `payments`, `videos`, `settings`), triggers, helper functions (`is_admin()`, `approve_payment()`, `reject_payment()`), row level security policies, and initial settings data.

### 3. Verify Storage Buckets
The SQL script attempts to create the buckets automatically. To verify:
1. Go to **Storage** in the Supabase Dashboard.
2. Confirm the following buckets exist:
   - `payment-screenshots` (Private)
   - `videos` (Private)
   - `thumbnails` (Public)
3. If any bucket was not created, click **"New bucket"**, enter the name, and toggle Public according to the list above.

### 4. Configure Environment Variables
1. In your Supabase Dashboard, go to **Project Settings** → **API**.
2. Copy your **Project URL** and **anon / public key**.
3. In your project root, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Fill in your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 5. Disable Email Confirmation (Recommended for Fast Testing & Instant Signup)
By default, Supabase email signup requires email confirmation and has a strict free-tier rate limit (~3 emails/hour). To allow instant registration and login without confirmation links:
1. In your Supabase Dashboard, go to **Authentication** → **Providers** → **Email**.
2. Toggle **OFF** **"Confirm email"**.
3. Click **Save**.

### 6. Create Your Admin User
1. Run the app locally (see below) and sign up through the web interface with your email (e.g. `admin@levellingup.com`).
2. In Supabase Dashboard, go to **SQL Editor** and run:
   ```sql
   UPDATE public.profiles
   SET is_admin = true,
       status = 'approved'
   WHERE email = 'your-email@example.com';
   ```
3. Refresh the web app. You now have full access to `/admin` and the video library!

---

## 💻 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🚢 Deployment (Vercel / Netlify / Cloudflare Pages)

1. Push your repository to GitHub.
2. Connect your repository to **Vercel** or **Netlify**.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add your environment variables in the host dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy!

