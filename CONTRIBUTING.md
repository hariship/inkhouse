# Contributing to Inkhouse

First off, thank you for considering contributing to Inkhouse! It's people like you that make Inkhouse such a great platform for writers.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project and everyone participating in it is governed by a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Standards

- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Focus on what is best** for the community
- **Show empathy** towards other community members

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 20.x or higher installed
- A Supabase account for database access
- A Cloudinary account for image uploads
- Git installed and configured

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/YOUR-USERNAME/inkhouse.git
   cd inkhouse
   ```

3. **Add the upstream repository**:

   ```bash
   git remote add upstream https://github.com/ORIGINAL-OWNER/inkhouse.git
   ```

4. **Install dependencies**:

   ```bash
   npm install
   ```

5. **Set up environment variables**:

   - Copy `.env.local.example` to `.env.local` (or create it)
   - Fill in all required environment variables (see README.md)

6. **Set up the database**:

   - Create a Supabase project
   - Run the SQL from `scripts/setup-supabase.sql`
   - Create an admin user with `node scripts/create-admin.js`

7. **Start the development server**:
   ```bash
   npm run dev
   ```

## Development Process

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features (if used)
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Making Changes

1. **Create a new branch** from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes** thoroughly:

   - Run the development server and test manually
   - Ensure no console errors
   - Test on different screen sizes (responsive design)
   - Test both light and dark themes

4. **Commit your changes** using our commit message guidelines

5. **Keep your branch up to date**:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Process

### Before Submitting

- [ ] Your code follows the project's coding standards
- [ ] You've tested your changes thoroughly
- [ ] You've updated documentation if needed
- [ ] Your commits follow the commit message guidelines
- [ ] You've rebased on the latest `main` branch
- [ ] ESLint passes without errors (`npm run lint`)

### Submitting a Pull Request

1. **Go to the original repository** on GitHub
2. **Click "New Pull Request"**
3. **Select your fork and branch**
4. **Fill out the PR template** with:

   - Clear description of changes
   - Related issue numbers (if applicable)
   - Screenshots for UI changes
   - Testing steps

5. **Wait for review** - maintainers will review your PR
6. **Address feedback** if requested
7. **Celebrate** when your PR is merged! 🎉

### PR Title Format

Use clear, descriptive titles:

- `feat: Add dark mode toggle to navbar`
- `fix: Resolve comment threading issue`
- `docs: Update API documentation`
- `refactor: Simplify authentication logic`

## Coding Standards

### TypeScript

- **Use TypeScript** for all new files
- **Define types** for all function parameters and return values
- **Avoid `any`** - use proper types or `unknown`
- **Use interfaces** for object shapes

### React/Next.js

- **Use functional components** with hooks
- **Use client components** (`'use client'`) only when necessary
- **Keep components small** and focused on a single responsibility
- **Use meaningful component names** in PascalCase
- **Extract reusable logic** into custom hooks

### Styling

- **Use Tailwind CSS** utility classes
- **Use CSS variables** for theme colors (defined in `globals.css`)
- **Follow responsive design** principles (mobile-first)
- **Maintain dark mode** compatibility

### File Organization

- **Group related files** in appropriate directories
- **Use index files** for cleaner imports
- **Keep API routes** organized by feature
- **Colocate tests** with source files (when tests are added)

### Code Quality

- **Write clean, readable code**
- **Add comments** for complex logic
- **Remove console.logs** before committing
- **Handle errors** gracefully with user-friendly messages
- **Validate user input** on both client and server

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no code change)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples

```
feat(auth): add password reset functionality

Implement password reset flow with email verification.
Users can now request a password reset link via email.

Closes #123
```

```
fix(comments): resolve threading display issue

Fix bug where nested comments were not displaying
correctly at depth > 2.
```

```
docs(readme): update installation instructions

Add missing environment variables and clarify
Supabase setup steps.
```

### Best Practices

- Use the **imperative mood** ("add" not "added")
- Keep the **subject line under 50 characters**
- Capitalize the subject line
- Don't end the subject line with a period
- Use the body to explain **what and why**, not how
- Reference issues and PRs in the footer

## Issue Reporting

### Before Creating an Issue

- **Search existing issues** to avoid duplicates
- **Check the documentation** - your question might be answered
- **Try the latest version** - the bug might be fixed

### Creating a Good Issue

Include:

- **Clear title** describing the issue
- **Steps to reproduce** (for bugs)
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, browser, Node version)
- **Error messages** or console logs

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed

## Questions?

If you have questions about contributing, feel free to:

- Open a discussion on GitHub
- Reach out to the maintainers
- Ask in the issue you're working on

---

Thank you for contributing to Inkhouse! 🎉
