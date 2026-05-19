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
