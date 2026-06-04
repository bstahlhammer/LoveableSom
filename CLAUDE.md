## Deploying

Always deploy with `npm run deploy` — never `npm run build && npx wrangler deploy` directly.
The deploy script gates on a clean git working tree; it will refuse to build if there are uncommitted changes.

## Development Conventions

For any feature work:
1. First draft a spec at specs/NNN-name.md covering: goals, non-goals,
   user-facing behavior, edge cases, acceptance criteria.
2. Wait for my approval on the spec before writing any code.
3. Implement against the approved spec. If you drift, stop and ask.
4. Verify the implementation against the acceptance criteria before
   saying you're done.
