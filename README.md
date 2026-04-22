# AXiM-Pay-Stub-Gen-App-9706
Repository created by Greta

## Deployment Security Notes
To deploy the Cloudflare Worker, the `AXIM_API_KEY` must be set securely via the Wrangler CLI. Do not hardcode this key in the repository.

Run the following command:
```bash
wrangler secret put AXIM_API_KEY --env production
```
