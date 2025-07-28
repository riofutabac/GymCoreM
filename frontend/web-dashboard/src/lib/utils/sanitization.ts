/**
 * Input sanitization utilities for form data
 * Provides secure sanitization functions to prevent XSS and injection attacks
 */

/**
 * Sanitizes a string by removing/escaping potentially dangerous characters
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (input: string): string => {
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
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return '';
  
  return email
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
export const sanitizeName = (name: string): string => {
  if (typeof name !== 'string') return '';
  
  return name
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Allow only letters, spaces, hyphens, and apostrophes
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
export const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') return '';
  
  return text
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove HTML tags but allow basic formatting
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
 * Sanitizes a numeric input
 * @param input - Numeric input to sanitize
 * @returns Sanitized number or 0 if invalid
 */
export const sanitizeNumber = (input: string | number): number => {
  if (typeof input === 'number') {
    return isNaN(input) || !isFinite(input) ? 0 : input;
  }
  
  if (typeof input !== 'string') return 0;
  
  // Remove non-numeric characters except decimal point and minus sign
  const cleaned = input.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
};

/**
 * Sanitizes a barcode input
 * @param barcode - Barcode to sanitize
 * @returns Sanitized barcode
 */
export const sanitizeBarcode = (barcode: string): string => {
  if (typeof barcode !== 'string') return '';
  
  return barcode
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Allow only alphanumeric characters and common barcode symbols
    .replace(/[^a-zA-Z0-9-_]/g, '')
    // Limit length
    .substring(0, 50);
};

/**
 * Sanitizes a phone number
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number
 */
export const sanitizePhone = (phone: string): string => {
  if (typeof phone !== 'string') return '';
  
  return phone
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Allow only numbers, spaces, hyphens, parentheses, and plus sign
    .replace(/[^0-9\s\-\(\)\+]/g, '')
    // Limit length
    .substring(0, 20);
};

/**
 * Sanitizes a URL
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url: string): string => {
  if (typeof url !== 'string') return '';
  
  const cleaned = url.trim().replace(/\0/g, '');
  
  // Only allow http and https URLs
  try {
    const urlObj = new URL(cleaned);
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return urlObj.toString().substring(0, 2048);
    }
  } catch {
    // Invalid URL
  }
  
  return '';
};

/**
 * Sanitizes an object by applying appropriate sanitization to each field
 * @param obj - Object to sanitize
 * @param schema - Schema defining how to sanitize each field
 * @returns Sanitized object
 */
export const sanitizeObject = <T extends Record<string, any>>(
  obj: T,
  schema: Record<keyof T, 'string' | 'email' | 'name' | 'text' | 'number' | 'barcode' | 'phone' | 'url'>
): T => {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    const sanitizationType = schema[key as keyof T];
    
    switch (sanitizationType) {
      case 'string':
        sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
        break;
      case 'email':
        sanitized[key as keyof T] = sanitizeEmail(value) as T[keyof T];
        break;
      case 'name':
        sanitized[key as keyof T] = sanitizeName(value) as T[keyof T];
        break;
      case 'text':
        sanitized[key as keyof T] = sanitizeText(value) as T[keyof T];
        break;
      case 'number':
        sanitized[key as keyof T] = sanitizeNumber(value) as T[keyof T];
        break;
      case 'barcode':
        sanitized[key as keyof T] = sanitizeBarcode(value) as T[keyof T];
        break;
      case 'phone':
        sanitized[key as keyof T] = sanitizePhone(value) as T[keyof T];
        break;
      case 'url':
        sanitized[key as keyof T] = sanitizeUrl(value) as T[keyof T];
        break;
      default:
        sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
    }
  }
  
  return sanitized;
};