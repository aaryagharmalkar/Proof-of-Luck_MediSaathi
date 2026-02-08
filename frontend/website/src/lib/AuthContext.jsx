import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/api/apiClient";
import { getApiBaseUrl } from "@/api/baseUrl";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");

    if (!token) {
      setIsLoadingAuth(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/me");
      setUser(data?.user ?? data);
      setIsAuthenticated(true);
    } catch (err) {
      clearSession();
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (credentials) => {
    setAuthError(null);
    try {
      const { data } = await api.post("/auth/signin", credentials);
      const token = data.access_token;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("access_token", token);
      }
      setUser(data?.user ?? data);
      setIsAuthenticated(true);
      return { ok: true, onboarding_completed: data?.onboarding_completed };
    } catch (err) {
      let msg = err.response?.data?.detail || err.response?.data?.message || "Login failed";
      if (!err.response) {
        msg = err.code === "ECONNABORTED"
          ? "Request timed out. Check your connection and that the backend is running at " + getApiBaseUrl().replace(/\/api\/v1$/, "")
          : "Cannot reach server. Check that the backend is running and VITE_API_URL is correct.";
      }
      setAuthError(typeof msg === "string" ? msg : "Login failed");
      return { ok: false };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    setUser(null);
    setIsAuthenticated(false);
  };


  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        authError,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
