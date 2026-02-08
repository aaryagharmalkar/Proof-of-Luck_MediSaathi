import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "@/api/apiClient";
import WebNav from "@/components/ui/WebNav";
import DoctorNav from "@/components/ui/DoctorNav";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [profile, setProfile] = useState(null);

  const hideNav =
    location.pathname === "/" ||
    location.pathname.startsWith("/onboarding") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/signup") ||
    location.pathname.startsWith("/doctor-login") ||
    location.pathname.startsWith("/doctor-onboarding");
  const isDoctorApp = location.pathname.startsWith("/doctor-dashboard");

  useEffect(() => {
    if (!hideNav) {
      loadProfile();
    }
  }, [hideNav, isDoctorApp]);

  const loadProfile = async () => {
    // Prevent 401 redirects by checking token first
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (!token) {
      setProfile(null);
      return;
    }

    try {
      if (isDoctorApp) {
        const { data } = await api.get("/doctors/me").catch(() => ({ data: null }));
        setProfile(data || null);
      } else {
        const { data } = await api.get("/auth/profile");
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfile(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNav && isDoctorApp && <DoctorNav profile={profile} />}
      {!hideNav && !isDoctorApp && <WebNav profile={profile} />}
      {children}
    </div>
  );
}
