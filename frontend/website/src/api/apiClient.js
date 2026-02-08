import axios from "axios";
import { getApiBaseUrl } from "./baseUrl";

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 30000,
});

/* ------------------ REQUEST INTERCEPTOR ------------------ */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
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
      localStorage.removeItem("access_token");
      const reqUrl = error.config?.url || "";
      const isBackgroundRequest = 
        reqUrl.includes("/auth/me") || 
        reqUrl.includes("/auth/profile") || 
        reqUrl.includes("/members") || 
        reqUrl.includes("/doctors/me");

      if (!reqUrl.includes("/auth/signin") && !reqUrl.includes("/auth/signup") && !isBackgroundRequest) {
        const path = window.location.pathname;
        if (path.startsWith("/doctor-dashboard")) {
          if (path !== "/doctor-login") window.location.href = "/doctor-login";
        } else if (path !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
