import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add response interceptor for error handling if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
