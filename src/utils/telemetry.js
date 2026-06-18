
export const trackEvent = (eventName, properties = {}) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    app_context: 'pay_stub_generator',
    timestamp: new Date().toISOString(),
    ...properties
  });

  fetch('/api/v1/telemetry/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: eventName, app_context: 'pay_stub_generator', timestamp: new Date().toISOString(), ...properties })
  }).catch(() => {});
};
