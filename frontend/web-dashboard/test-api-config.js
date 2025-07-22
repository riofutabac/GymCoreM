// Test script para verificar la configuración de API
import { getApiBaseUrl, API_V1_URL } from './src/lib/api/config.js';

console.log('Testing API configuration...');
console.log('typeof window:', typeof window);
console.log('getApiBaseUrl():', getApiBaseUrl());
console.log('API_V1_URL():', API_V1_URL());
console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
