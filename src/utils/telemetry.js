
export const trackEvent = (event, payload = {}) => {
  fetch('/api/v1/telemetry/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ...payload })
  }).catch(() => {});
};