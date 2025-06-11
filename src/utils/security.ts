import DOMPurify from 'dompurify';

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input.trim());
};

// URL sanitization
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url, window.location.origin);
    // Allow only relative paths
    if (parsed.origin !== window.location.origin) {
      return '/';
    }
    return parsed.pathname + parsed.search;
  } catch {
    return '/';
  }
};

// XSS protection headers (for SSR)
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' *.trusted.cdn.com;
    style-src 'self' 'unsafe-inline' *.trusted.cdn.com;
    img-src 'self' data: *.trusted.cdn.com;
    font-src 'self' *.trusted.cdn.com;
    connect-src 'self' api.yourapp.com;
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
  `.replace(/\s+/g, ' ').trim()
};

// CSRF protection
export const getCSRFToken = () => {
  const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return token ? token[1] : null;
};

// Password strength validation
export const validatePassword = (password: string): boolean => {
  const minLength = 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return (
    password.length >= minLength &&
    hasUpper &&
    hasLower &&
    hasNumber &&
    hasSpecial
  );
};