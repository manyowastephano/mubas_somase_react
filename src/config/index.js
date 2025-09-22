// src/config/index.js
//export const BASE_URL = 'http://localhost:8000';
//export const API_BASE_URL = `${BASE_URL}/api`;


// src/config/index.js
export const BASE_URL = process.env.REACT_APP_BASE_URL || 'https://mubassomase-1.onrender.com';
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `${BASE_URL}/api`;

console.log('API_BASE_URL:', API_BASE_URL);
console.log('BASE_URL:', BASE_URL);