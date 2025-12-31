# 🏠 Inkhouse

> A modern, feature-rich blog platform for writers to share their stories, ideas, and perspectives.

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

## ✨ Features

### 🔐 Authentication & Authorization

- **JWT-based authentication** with secure bcrypt password hashing
- **Role-based access control** (Admin & Writer roles)
- **Membership request system** for new writers to join the platform
- Session management with refresh tokens

### ✍️ Content Management

- **Rich text editor** powered by React Quill with full formatting support
- **Excalidraw integration** for creating and embedding diagrams
- **Image uploads** via Cloudinary with automatic optimization
- **Draft and publish workflow** for content creation
- **Post categorization** and tagging
- **SEO-friendly URLs** with normalized titles

### 💬 Engagement Features

- **Threaded comment system** with nested replies
- **Like system** for posts (supports both authenticated and anonymous users)
- **Author profiles** with bio, avatar, and social links
- **Search functionality** to discover content

### 📧 Subscription & Distribution

- **Email subscription system** with customizable frequency (daily/weekly/monthly)
- **Category-based subscriptions** to follow specific topics
- **RSS feed** for content syndication
- **Email notifications** for new posts

### 🎨 User Experience

- **Dark/Light theme** support with system preference detection
- **Responsive design** optimized for all devices
- **Fast page loads** with Next.js optimization
- **Accessible UI** with semantic HTML and ARIA labels

### 👨‍💼 Admin Dashboard

- **Membership request management** (approve/reject writers)
- **User management** with role assignment
- **Content moderation** tools
- **Analytics overview** (coming soon)

## 🛠️ Technology Stack

### Frontend

- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://reactjs.org/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first styling
- **[Lucide React](https://lucide.dev/)** - Icon library

### Backend

- **Next.js API Routes** - Serverless API endpoints
- **[Supabase](https://supabase.com/)** - PostgreSQL database with Row Level Security
- **[JWT](https://jwt.io/)** - Token-based authentication
- **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)** - Password hashing

### Content & Media

- **[React Quill](https://github.com/zenoamaro/react-quill)** - Rich text editor
- **[Excalidraw](https://excalidraw.com/)** - Diagram and drawing tool
- **[Cloudinary](https://cloudinary.com/)** - Image hosting and optimization
- **[html-react-parser](https://github.com/remarkablemark/html-react-parser)** - Safe HTML rendering

### Email

- **[Nodemailer](https://nodemailer.com/)** - Email sending

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher
- **npm**, **yarn**, **pnpm**, or **bun**
- **Supabase account** ([sign up here](https://supabase.com/))
- **Cloudinary account** ([sign up here](https://cloudinary.com/))

## 🚀 Getting Started

### 1. Clone the Repository (Fork it before cloning for development)

```bash
git clone https://github.com/yourusername/inkhouse.git
cd inkhouse
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# JWT Secrets (generate random strings)
JWT_SECRET=your_jwt_secret_key
REFRESH_SECRET=your_refresh_token_secret_key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note:** Generate secure random strings for `JWT_SECRET` and `REFRESH_SECRET` using:
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 4. Set Up the Database

#### a. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project
3. Copy your project URL and keys to `.env.local`

#### b. Run Database Schema

1. Open the SQL Editor in your Supabase dashboard
2. Copy the contents of `scripts/setup-supabase.sql`
3. Execute the SQL to create all tables, indexes, and policies

### 5. Create an Admin User

```bash
node scripts/create-admin.js
```

This will create an admin account. **Important:** Update the script with your own credentials before running, or change the password immediately after creation.

### 6. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📁 Project Structure

```
inkhouse/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── posts/        # Post CRUD operations
│   │   │   ├── comments/     # Comment management
│   │   │   ├── likes/        # Like system
│   │   │   ├── users/        # User management
│   │   │   ├── admin/        # Admin operations
│   │   │   ├── membership/   # Membership requests
│   │   │   ├── subscribe/    # Email subscriptions
│   │   │   └── rss/          # RSS feed generation
│   │   ├── admin/            # Admin dashboard
│   │   ├── dashboard/        # Writer dashboard
│   │   ├── post/             # Individual post pages
│   │   ├── author/           # Author profile pages
│   │   ├── login/            # Login page
│   │   └── join/             # Membership request page
│   ├── components/            # React components
│   │   ├── auth/             # Authentication components
│   │   ├── comments/         # Comment components
│   │   ├── common/           # Shared components
│   │   ├── editor/           # Post editor components
│   │   ├── layout/           # Layout components
│   │   └── posts/            # Post-related components
│   ├── contexts/              # React contexts
│   │   ├── AuthContext.tsx   # Authentication state
│   │   └── ThemeContext.tsx  # Theme management
│   ├── lib/                   # Utility libraries
│   │   ├── auth.ts           # JWT utilities
│   │   ├── cloudinary.ts     # Cloudinary config
│   │   └── supabase.ts       # Supabase client
│   ├── types/                 # TypeScript type definitions
│   └── styles/                # Global styles
├── scripts/                   # Utility scripts
│   ├── setup-supabase.sql    # Database schema
│   └── create-admin.js       # Admin user creation
├── public/                    # Static assets
└── package.json
```

## 🔌 API Routes

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Posts

- `GET /api/posts` - List posts (with pagination & search)
- `GET /api/posts/[id]` - Get single post
- `POST /api/posts` - Create post (authenticated)
- `PUT /api/posts/[id]` - Update post (authenticated)
- `DELETE /api/posts/[id]` - Delete post (authenticated)

### Comments

- `GET /api/comments?postId=[id]` - Get post comments
- `POST /api/comments` - Create comment

### Likes

- `POST /api/likes` - Toggle like on post
- `GET /api/likes/[postId]` - Get like count

### Users

- `GET /api/users/[username]` - Get user profile
- `GET /api/users/[username]/posts` - Get user's posts
- `PUT /api/users/profile` - Update profile (authenticated)

### Admin

- `GET /api/admin/membership-requests` - List membership requests
- `PUT /api/admin/membership-requests/[id]` - Approve/reject request
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/[id]` - Update user role/status

### Other

- `POST /api/subscribe` - Subscribe to newsletter
- `GET /api/rss` - RSS feed
- `POST /api/upload-image` - Upload image to Cloudinary

## 🗄️ Database Schema

The database consists of 8 main tables:

- **users** - User accounts with roles and profiles
- **posts** - Blog posts with content and metadata
- **comments** - Threaded comments on posts
- **likes** - Post likes (supports anonymous users via IP hash)
- **membership_requests** - Writer application requests
- **subscribers** - Email subscription list
- **sessions** - JWT refresh token storage
- **email_logs** - Email sending history

See `scripts/setup-supabase.sql` for the complete schema with indexes and Row Level Security policies.

## 📜 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint

# Database
node scripts/create-admin.js  # Create admin user
```

## 🚢 Deployment

### Deploy to Vercel

1. **Push to GitHub**

   ```bash
   git push origin main
   ```

2. **Import to Vercel**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**

   - Add all variables from `.env.local` to Vercel
   - Update `NEXT_PUBLIC_APP_URL` to your production domain

4. **Deploy**
   - Vercel will automatically build and deploy your application

### Database Migration

For production deployment:

1. Create a production Supabase project
2. Run `scripts/setup-supabase.sql` in the production database
3. Create an admin user using the production credentials
4. Update environment variables in Vercel

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a pull request.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework for production
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Cloudinary](https://cloudinary.com/) - Image and video management
- [Excalidraw](https://excalidraw.com/) - Virtual whiteboard for sketching
- [Vercel](https://vercel.com/) - Deployment and hosting platform

## 📧 Support

For support, open an issue in the GitHub repository.

---

**Built with ❤️ by the Inkhouse team**
