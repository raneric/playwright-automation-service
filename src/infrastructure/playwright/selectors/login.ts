/**
 * Centralized selectors for the Login page.
 * Change selectors here and every consumer updates automatically.
 */
export const LoginSelectors = {
  username: 'login-username',
  password: 'login-password',
  submitBtn: 'login-submit-btn',
  error: 'login-error',
} as const;