# AXiM-Pay-Stub-Gen-App-9706
Repository created by Greta

## Deployment Security Notes
To deploy the Cloudflare Worker, the `AXIM_API_KEY` must be set securely via the Wrangler CLI. Do not hardcode this key in the repository.

Run the following command:
```bash
wrangler secret put AXIM_API_KEY --env production
```

Ensure all edge secrets are configured securely via Wrangler CLI before deploying to production:

```bash
wrangler secret put AXIM_SERVICE_KEY --env production
wrangler secret put QUEST_LABS_API_KEY --env production
wrangler secret put QUEST_LABS_APP_ID --env production
```

### Cloudflare Runtime Verification & Secure Secrets Configuration Checklist
1. Unbranded CORS configurations (`allowedOrigins` array in `worker.js`) are securely mapped to specific domains: `https://app.axim.us.com`, `https://api.axim.us.com` without any wildcards `*`.
2. Public asset routing flags (`_redirects` setting routing patterns via `/* /index.html 200`) are verified to be active in the `public` directory.
3. Sensitive runtime indicators are used exclusively via environment variables in `worker.js` (`env.AXIM_SERVICE_KEY`, `env.QUEST_LABS_API_KEY`, `env.QUEST_LABS_APP_ID`).
4. To provision secrets, use the following commands:
   ```bash
   wrangler secret put AXIM_SERVICE_KEY --env production
   wrangler secret put QUEST_LABS_API_KEY --env production
   wrangler secret put QUEST_LABS_APP_ID --env production
   ```
