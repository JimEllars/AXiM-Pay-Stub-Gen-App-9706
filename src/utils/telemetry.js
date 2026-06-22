export const trackEvent = (eventName, eventData) => {
  try {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: eventName,
        ...eventData,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    // Fail silently to prevent ad-blockers from crashing the app execution
    console.warn('Telemetry suppressed by client.');
  }
};