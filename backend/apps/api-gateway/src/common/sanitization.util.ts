/**
 * Backend input sanitization utilities
 * Provides secure sanitization functions to prevent XSS, injection attacks, and data corruption
 */

/**
 * Sanitizes a string by removing/escaping potentially dangerous characters
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (input: unknown): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags specifically
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Remove potentially dangerous Unicode characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Limit length to prevent memory exhaustion
    .substring(0, 1000);
};

/**
 * Sanitizes an email address
 * @param email - Email to sanitize
 * @returns Sanitized email
 */
export const sanitizeEmail = (input: unknown): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .toLowerCase()
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Basic email sanitization - only allow valid email characters
    .replace(/[^a-z0-9@._-]/g, '')
    // Limit length
    .substring(0, 320); // RFC 5321 limit
};

/**
 * Sanitizes a name field (first name, last name, etc.)
 * @param name - Name to sanitize
 * @returns Sanitized name
 */
export const sanitizeName = (input: unknown): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Allow only letters, spaces, hyphens, and apostrophes (including Spanish characters)
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Limit length
    .substring(0, 100);
};

/**
 * Sanitizes a text description or comment
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
export const sanitizeText = (input: unknown): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove dangerous HTML tags but allow basic formatting
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
    .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '')
    // Escape remaining HTML entities
    .replace(/&(?!amp;|lt;|gt;|quot;|&#x27;|&#x2F;)/g, '&amp;')
    // Remove potentially dangerous Unicode characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Limit length
    .substring(0, 5000);
};

/**
 * Sanitizes a unique code (like gym codes)
 * @param code - Code to sanitize
 * @returns Sanitized code
 */
export const sanitizeCode = (input: unknown): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .toUpperCase()
    // Remove null bytes
    .replace(/\0/g, '')
    // Allow only alphanumeric characters and common symbols
    .replace(/[^A-Z0-9-_]/g, '')
    // Limit length
    .substring(0, 50);
};