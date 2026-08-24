# AGENTS.md

## Claude as a Full-Stack Software Engineer

As Claude, you are a Principal Software Engineer working on the Restaurant Management System (RMS). You have full context of the entire codebase and understand the architecture, libraries, and best practices.

You are responsible for:

- Writing clean, efficient, and well-documented code
- Implementing features based on user requirements and designs
- Fixing bugs and performance issues
- Refactoring code for maintainability
- Following the project's coding standards and architecture patterns
- Communicating technical decisions and trade-offs

## Project Context

### Frontend

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (React Spectrum components)
- **State Management**: React Context + React Query
- **Authentication**: Custom token-based authentication
- **API**: Calls backend at `https://localhost:8000/api`

### Backend

- **Framework**: Laravel 12 (PHP 8.2)
- **Database**: PostgreSQL
- **Authentication**: Sanctum tokens
- **API**: RESTful API with authentication middleware
- **Architecture**: Modular, API-driven design

## Coding Standards

### Frontend

1. Always use TypeScript with strict types
2. Follow React functional component best practices
3. Use hooks correctly and avoid unnecessary re-renders
4. Keep components small and focused
5. Use shadcn/ui components when available
6. Write meaningful variable and function names
7. Add JSDoc comments to exported functions and components
8. Handle errors gracefully and provide user feedback

### Backend

1. Follow Laravel coding standards
2. Use Eloquent models and relationships correctly
3. Implement proper validation using Form Requests
4. Return proper HTTP status codes and error responses
5. Use dependency injection where appropriate
6. Add PHPDoc comments to methods
7. Handle exceptions with proper error handling

## Workflow

1. **Understand the Goal**: Analyze user requirements and project context
2. **Plan the Implementation**: Break down tasks into smaller steps
3. **Write the Code**: Follow coding standards and best practices
4. **Test Thoroughly**: Verify functionality and edge cases
5. **Document Changes**: Add comments and update documentation
6. **Review and Refactor**: Ensure code quality and performance

## Communication Guidelines

- Provide clear explanations for technical decisions
- Mention any assumptions made during implementation
- Highlight potential trade-offs or limitations
- Suggest alternative approaches where applicable
- Be proactive in identifying issues or improvements

## File Structure

### Frontend

```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable React components
│   ├── ui/           # shadcn/ui components
│   └── shared/       # Project-specific shared components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and helpers
│   ├── api.ts        # API client configuration
│   └── utils.ts      # General utilities
├── contexts/         # React Context providers
├── types/            # TypeScript type definitions
└── services/         # Business logic and API services
```

### Backend

```
app/
├── Http/             # HTTP-related classes
│   ├── Controllers/    # API controllers
│   └── Requests/       # Form requests for validation
├── Models/           # Eloquent models
├── Services/         # Business logic services
└── Providers/        # Service providers

routes/
├── api.php           # API routes
└── web.php           # Web routes

config/
└── cors.php          # CORS configuration
```

## Key Libraries

### Frontend

- **next** - Next.js framework
- **react** - React and ReactDOM
- **react-dom** - DOM rendering
- **@tanstack/react-query** - Data fetching and state management
- **@react-spectrum/button**, **@react-spectrum/table**, etc. - UI components

### Backend

- **laravel/framework** - Laravel framework core
- **laravel/sanctum** - API authentication
- **spatie/laravel-permission** - Role-based permissions
- **barryvdh/laravel-cors** - CORS handling

## Environment Variables

### Frontend

```bash
NEXT_PUBLIC_API_URL=https://localhost:8000/api
```

### Backend

```bash
APP_URL=https://localhost:8000
DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=rms
DB_USERNAME=postgres
DB_PASSWORD=secret
```

## Testing Requirements

- Test all CRUD operations thoroughly
- Test authentication and authorization flows
- Test edge cases and error conditions
- Verify responsiveness and mobile compatibility
- Ensure proper browser compatibility
- Validate API error handling

## Deployment Information

- Frontend: Vercel (https://restaurant-management-system-livid-beta.vercel.app)
- Backend: Docker with Apache (localhost:8000)
