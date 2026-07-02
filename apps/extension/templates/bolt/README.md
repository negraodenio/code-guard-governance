# CodeGuard Bolt Integration Template

This is a **client-side** integration template suitable for Bolt.new or StackBlitz environments where you might want to run code analysis directly in the browser.

## Using in Bolt

1. Ask Bolt to install the SDK:
   > "Install @codeguard/sdk"

2. Create a new component (or copy `src/App.tsx`).

3. Import and use the client:
   ```typescript
   import { createClient } from '@codeguard/sdk';
   ```

## ⚠️ Important Browser Note

The SDK makes direct HTTP calls to `api.codeguard.ai`. 
If you use this in a public production app, **do not hardcode your API Key**. Instead, create a backend proxy (see the Next.js or Lovable templates).

For internal Bolt prototypes or secure demos, using the key directly is acceptable.
