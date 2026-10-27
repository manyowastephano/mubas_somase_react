// src/config.js

// This is your React frontend URL
export const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:3000';

// This is your Django backend URL (Port 8000)
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';