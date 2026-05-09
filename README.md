# Full-Stack TypeScript Monorepo

A premium, scalable monorepo setup featuring a React frontend, Node.js backend, and shared TypeScript types.

## 🏗 Project Structure

- `apps/frontend`: React + Vite + Tailwind CSS
- `backend`: Node.js + Express + TypeScript (Root level)
- `packages/shared`: Shared types and utilities
- `infra`: Infrastructure configuration (Docker Compose)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker](https://www.docker.com/) & Docker Compose
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd my-monorepo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   *Note: Update the values in `.env` as needed. The default database port is set to `5433` to avoid common conflicts.*

4. **Start the database**:
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

### Running the Application

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts all applications in development mode |
| `npm run build` | Builds all applications for production |
| `npm run lint` | Runs linting across all workspaces |
| `npm run db:migrate` | Runs all SQL migrations in `backend/migrations` |
| `npm run db:seed` | Runs the seed script in `backend/scripts/seed.ts` |

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend**: [http://localhost:3000](http://localhost:3000)

## 🗄 Database Management

### Migrations
Migration files are located in `backend/migrations`. To run them:
```bash
npm run db:migrate
```

### Seeding
A seed script template is provided in `backend/scripts/seed.ts`. To run it:
```bash
npm run db:seed
```

## 🛠 Tech Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS 3, TypeScript
- **Backend**: Node.js, Express 5, TypeScript, PostgreSQL (pg)
- **Database**: PostgreSQL 17 (via Docker)
- **Monorepo Management**: npm Workspaces

## 💡 Best Practices

- **Shared Types**: Always define your data models in `packages/shared`. This ensures type safety between the frontend and backend.
- **Type-Only Imports**: When importing types from the shared package in the frontend, use `import type { ... }` to comply with `verbatimModuleSyntax`.
- **Environment Variables**: Use the `.env` file for all configuration. Never commit the `.env` file to version control.

## 📄 License

This project is licensed under the ISC License.
