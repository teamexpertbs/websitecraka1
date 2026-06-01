---
name: DB Migration Approach
description: How to apply schema changes when drizzle-kit push fails on this project's Neon/CockroachDB host
---

The `pnpm --filter @workspace/db run push` command fails on this host with:
> could not parse "{int,int8,int2}" as type regtype[]

**Workaround:** Use a raw SQL script via Node.js, loading `pg` from the pnpm store directly:
```js
const pg = require("/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg");
```

Run ALTER TABLE … ADD COLUMN IF NOT EXISTS statements manually.

**Why:** drizzle-kit's schema introspection queries fail on this specific Neon/CockroachDB version due to type OID parsing. Raw SQL works fine.

**How to apply:** Write a .cjs script, use `node /tmp/migrate.cjs` from the workspace root (env vars like NEON_DATABASE_URL are inherited from the shell environment).
