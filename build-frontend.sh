#!/bin/sh
echo "==> Current directory: $(pwd)"
echo "==> Listing artifacts directory:"
ls -la artifacts/ 2>/dev/null || echo "artifacts/ not found"
echo "==> Building craka-osint frontend..."
cd artifacts/craka-osint && npx vite build --config vite.config.ts
