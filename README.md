# TaskFlow

TaskFlow is a lightweight task management app with a small API layer, frontend assets, and PostgreSQL-backed auth/data helpers.

## Project structure

- `index.html`, `style.css`, `script.js` - frontend UI
- `api/` - serverless API routes for auth and data access
- `lib/` - shared database and authentication helpers
- `schema.sql` - database schema

## Dependencies

- `@vercel/postgres`
- `bcryptjs`
- `jsonwebtoken`

## Local setup

1. Install dependencies.
2. Configure any required environment variables.
3. Run the app with your preferred local workflow or deployment target.
