# Aurelia

> Your personal culinary archive.

Aurelia is a luxury, refined culinary management application designed for passionate home cooks and culinary professionals. It combines structured recipe curation, intelligent meal planning, dynamic grocery lists, and an AI culinary companion into a seamless editorial experience.

## Features

- **Personal Culinary Archive**: Organize, search, and curate your personal recipe collection with precision and elegance.
- **AI Recipe Extraction & Import**: Convert raw, unstructured text or cookbook imagery into beautifully structured recipes with ingredient scaling and automatic step timers.
- **Aurelia AI Chef**: Grounded culinary mentorship offering context-aware recipe advice, substitutions, and kitchen wisdom based exclusively on your personal archive.
- **Meal Planning & Groceries**: Plan weekly meals with drag-and-drop ease and auto-aggregate synchronized shopping lists.
- **Distraction-Free Cook Mode**: Hands-free, step-by-step cooking interface with built-in voice timers.

## Getting Started

First, install the dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [https://aurelia-gamma-one.vercel.app/](https://aurelia-gamma-one.vercel.app/) with your browser to explore the application.

## The 14 Screens of Aurelia

1. **Screen 1: Dashboard** (`/`) — Culinary overview, seasonal highlights, upcoming meals, and recent recipe activity.
2. **Screen 2: Recipe Library** (`/recipes`) — Full culinary archive with instant fuzzy search, tag filtering, and sorting.
3. **Screen 3: Recipe Detail** (`/recipes/[id]`) — Immersive editorial recipe display, dynamic ingredient scaling, and instruction checklists.
4. **Screen 4: Recipe Collections** (`/collections`, `/collections/[id]`) — Curated thematic groupings and culinary playlists.
5. **Screen 5: Weekly Meal Planner** (`/meal-planner`) — 7-day culinary schedule with breakfast, lunch, dinner, and snack slots.
6. **Screen 6: Dynamic Shopping List** (`/shopping`) — Aggregated grocery list organized by aisle with cross-off tracking and pantry clearance.
7. **Screen 7: Aurelia AI Chef** (`/ai-chef`) — Grounded culinary advisor providing substitutions, wine pairings, and technique advice.
8. **Screen 8: Distraction-Free Cook Mode** (`/recipes/[id]/cook`) — Step-by-step cooking companion with screen wake lock and simultaneous timers.
9. **Screen 9: Settings** (`/settings`) — Profile configuration, diet preferences, appearance mode, and security controls.
10. **Screen 10: Authentication** (`/login`, `/signup`, `/forgot-password`, `/auth/callback`) — Secure email & password authentication and session management.
11. **Screen 11: AI Recipe Import** (`/recipes/import`) — Structured recipe extraction from unformatted culinary text.
12. **Screen 12: Recipe Creation & Editing** (`/recipes/new`, `/recipes/[id]/edit`) — Comprehensive recipe authoring with metadata, timings, ingredients, and steps.
13. **Screen 13: Global App Shell & Fallbacks** (`/not-found`, `/error`, `/global-error`) — Responsive sidebar, mobile navigation bar, and resilient editorial error boundaries.
14. **Screen 14: Loading States & Perceived Performance** — Route-level skeleton architectures across all views.

## Environment Variables

Copy `.env.example` to `.env.local` to configure your environment:

| Variable | Scope | Description | Default / Example |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | Supabase project endpoint URL | `https://your-ref.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | Supabase anonymous public API key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Supabase privileged service role key | `eyJhbGciOi...` |
| `NEXT_PUBLIC_APP_URL` | Public / Client | Canonical app URL for auth callbacks | `https://aurelia-gamma-one.vercel.app` |
| `AI_PROVIDER` | Server-only | Primary AI engine (`gemini` or `openai`) | `gemini` |
| `GEMINI_API_KEY` | Server-only | Google AI Studio API key | `AIzaSy...` |
| `GEMINI_MODEL` | Server-only | Google Gemini model identifier | `gemini-3.6-flash` |
| `OPENAI_API_KEY` | Server-only | OpenAI API key (optional) | `sk-...` |
| `OPENAI_MODEL` | Server-only | OpenAI model identifier (optional) | `gpt-4o-mini` |

## Quality & Testing

- Unit & integration tests: `npm test`
- Type checking: `npx tsc --noEmit`
- Linting: `npm run lint`
- Production build: `npm run build`
- End-to-end tests: `npx playwright test`
- Git formatting & style check: `git diff --check`
