/**
 * Application configuration
 */

export const config = {
  /**
   * Backend API base URL
   * Override with VITE_API_BASE_URL environment variable
   */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",

  /**
   * Enable demo mode (uses mock data instead of real API)
   * Override with VITE_DEMO_MODE=true
   */
  demoMode: import.meta.env.VITE_DEMO_MODE === "true",

  /**
   * Delay between mock SSE events in demo mode (milliseconds)
   */
  mockEventDelay: 600,
};
