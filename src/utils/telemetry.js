export const trackEvent = (eventName, eventData = {}) => {
  try {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: eventName,
        app_context: 'pay_stub_generator',
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ...eventData
      });
    }
  } catch (error) {
    console.warn('Telemetry suppressed by client environment.');
  }
};
