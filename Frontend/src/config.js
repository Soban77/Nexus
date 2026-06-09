// Central API base URL. Supports both CRA (`REACT_APP_API_URL`) and Vite (`VITE_API_URL`).
const envApiUrl = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  '';

export const API_BASE_URL = envApiUrl;

export default API_BASE_URL;
