import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5050/api/v1",
  withCredentials: true,
});

/* ------------------ REQUEST INTERCEPTOR ------------------ */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ------------------ RESPONSE INTERCEPTOR ------------------ */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      const reqUrl = error.config?.url || "";
      // Don't auto-redirect when the failing request is signin/signup
      if (!reqUrl.includes("/auth/signin") && !reqUrl.includes("/auth/signup")) {
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
      // otherwise allow the calling code (e.g. Login form) to handle error
    }
    return Promise.reject(error);
  }
);

export default api;