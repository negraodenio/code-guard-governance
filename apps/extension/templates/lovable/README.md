# CodeGuard Lovable (Supabase Edge) Template

This template is optimized for Lovable projects that use Supabase Edge Functions. It allows you to run compliance scans without spinning up a dedicated Node.js server.

## Setup

1. Initialize Supabase in your project if needed:
   ```bash
   supabase init
   ```

2. Create the function:
   ```bash
   supabase functions new codeguard-scan
   ```

3. Copy the content of `index.ts` to `supabase/functions/codeguard-scan/index.ts`.

4. Set your Environment Secret:
   ```bash
   supabase secrets set CODEGUARD_API_KEY=your_key_here
   ```

5. Deploy:
   ```bash
   supabase functions deploy codeguard-scan
   ```

## Usage from Lovable Frontend

```javascript
/* Inside your Lovable React Component */
const { data, error } = await supabase.functions.invoke('codeguard-scan', {
  body: {
    code: 'const user = { pass: "123" }',
    region: 'EU'
  }
})

if (data.result.issues.length > 0) {
  console.log("Compliance Issues Found!");
}
```
