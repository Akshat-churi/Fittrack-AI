/**
 * analytics.js
 *
 * Central event log system for FitTrack AI.
 * Captures user, workout, social, goal, pro, nutrition, and challenge events
 * in real-time, storing them in localStorage.
 *
 * Dispatches a custom event to sync with the Admin Dashboard dynamically.
 */

const EVENTS_KEY = 'fittrack_event_log';

/**
 * Logs an event with timestamp and associated userId.
 *
 * @param {string} eventType
 * @param {object} [metadata]
 */
export const logEvent = (eventType, metadata = {}) => {
  try {
    const events = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
    
    // Attempt to get active user
    let userId = 'anonymous';
    try {
      const activeUser = JSON.parse(localStorage.getItem('fittrack_auth_user') || 'null');
      if (activeUser?.id) userId = activeUser.id;
    } catch {}

    const newEvent = {
      eventType,
      userId,
      timestamp: new Date().toISOString(),
      metadata,
    };

    events.push(newEvent);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));

    // Dispatch global event for live React synchronization
    window.dispatchEvent(
      new CustomEvent('fittrack_analytics_event', { detail: newEvent })
    );

    console.info(`[Analytics] Event logged: "${eventType}"`, newEvent);
  } catch (error) {
    console.error('[Analytics] Failed to log event:', error);
  }
};

/**
 * Returns all stored events.
 * @returns {Array<{ eventType: string, userId: string, timestamp: string, metadata: object }>}
 */
export const getEvents = () => {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * Clears all event logs.
 */
export const clearEvents = () => {
  localStorage.removeItem(EVENTS_KEY);
  window.dispatchEvent(new CustomEvent('fittrack_analytics_event'));
};
