import { Transform } from 'class-transformer';
import { 
  sanitizeString, 
  sanitizeEmail, 
  sanitizeName, 
  sanitizeText, 
  sanitizeCode 
} from './sanitization.util';

/**
 * Decorator to sanitize string input
 */
export const SanitizeString = () => Transform(({ value }) => sanitizeString(value));

/**
 * Decorator to sanitize email input
 */
export const SanitizeEmail = () => Transform(({ value }) => sanitizeEmail(value));

/**
 * Decorator to sanitize name input (first name, last name, etc.)
 */
export const SanitizeName = () => Transform(({ value }) => sanitizeName(value));

/**
 * Decorator to sanitize text input (descriptions, comments, etc.)
 */
export const SanitizeText = () => Transform(({ value }) => sanitizeText(value));

/**
 * Decorator to sanitize code input (gym codes, unique codes, etc.)
 */
export const SanitizeCode = () => Transform(({ value }) => sanitizeCode(value));