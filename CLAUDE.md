# CLAUDE.md

This file provides guidance to Claude Code when working with the Inkhouse codebase.

## Project Overview

Inkhouse is a multi-user blog platform built with Next.js 16, designed for writers to share their stories. It features a request-to-join membership system where admins approve new writers.

**Live URL**: inkhouse.haripriya.org
**Repo**: github.com/hariship/inkhouse

## Tech Stack

- **Framework**: Next.js 16.1 with App Router
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL)
- **Image Storage**: Cloudinary
- **Rich Text Editor**: React Quill
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Auth**: JWT (httpOnly cookies)

## Development Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── login/                      # Login page
│   ├── join/                       # Membership request
│   ├── post/[slug]/                # Post detail
│   ├── author/[username]/          # Author profile
│   ├── dashboard/                  # Writer dashboard
│   │   ├── new/                    # Create post
│   │   ├── edit/[id]/              # Edit post
│   │   └── profile/                # Edit profile
│   ├── admin/                      # Admin panel
│   │   ├── requests/               # Membership requests
│   │   ├── members/                # User management
│   │   └── posts/                  # Post moderation
│   └── api/                        # API routes
├── components/
│   ├── auth/                       # AuthGuard
│   ├── layout/                     # Navbar, DashboardLayout
│   ├── posts/                      # PostEditor
│   └── comments/                   # CommentsSection
├── contexts/                       # AuthContext
├── lib/                            # supabase, cloudinary, auth helpers
└── types/                          # TypeScript definitions
```

## Key Features

### Authentication
- Request-to-join membership with admin approval
- JWT auth with access/refresh tokens
- Role-based access (admin, writer)

### Writer Dashboard
- Create/edit posts with React Quill editor
- Image upload to Cloudinary
- Draft auto-save to localStorage
- Profile management

### Public Pages
- Homepage with post grid
- Post detail with author card
- Author profile pages
- Search and pagination

### Engagement
- Native comments (threaded)
- Likes (user/anonymous)
- RSS feed
- Newsletter subscription

### Admin Panel
- Stats dashboard
- Membership request approval
- User management (roles, status)
- Post moderation

## Database Schema

Key tables (see `scripts/setup-supabase.sql`):
- `users` - Writers and admins
- `membership_requests` - Join requests
- `posts` - Blog posts with author reference
- `comments` - Threaded comments
- `likes` - Post likes
- `subscribers` - Newsletter
- `sessions` - JWT refresh tokens

## Environment Variables

See `.env.example` for required variables:
- Supabase URL and keys
- Cloudinary credentials
- JWT secrets
- SMTP settings (for emails)

## API Routes

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user
- `POST /api/auth/refresh` - Refresh token

### Membership
- `POST /api/membership/request` - Submit request
- `GET /api/membership/requests` - List (admin)
- `PATCH /api/membership/[id]` - Approve/reject

### Posts
- `GET /api/posts` - List published
- `POST /api/posts` - Create
- `GET/PATCH/DELETE /api/posts/[id]` - Single post
- `GET /api/posts/my` - User's posts

### Other
- `GET /api/author/[username]` - Author profile
- `GET/POST /api/comments` - Comments
- `GET/POST /api/likes` - Likes
- `GET /api/rss` - RSS feed
- `POST /api/subscribe` - Newsletter
