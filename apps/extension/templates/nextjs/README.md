# CodeGuard Next.js Integration Template

This template demonstrates how to integrate CodeGuard AI compliance scanning into a Next.js application using API Routes.

## Setup

1. Install the SDK:
   ```bash
   npm install @codeguard/sdk
   ```

2. Add your API Key to `.env.local`:
   ```bash
   CODEGUARD_API_KEY=your_key_here
   ```

3. Copy `pages/api/scan.ts` to your project's `pages/api` directory (or `app/api/scan/route.ts` if using App Router).

## Usage

Send a POST request to `/api/scan`:

```json
{
  "code": "const password = '123';",
  "region": "BR"
}
```

## Security Note

Always run the scan serverside (API Route) to keep your `CODEGUARD_API_KEY` secret. Never expose it in client-side code unless using a proxy.
