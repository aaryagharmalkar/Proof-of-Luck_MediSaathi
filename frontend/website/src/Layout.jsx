import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "@/api/apiClient";
import WebNav from "@/components/ui/WebNav";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [profile, setProfile] = useState(null);

  const hideNav =
    location.pathname.startsWith("/onboarding") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/signup");

  useEffect(() => {
    if (!hideNav) {
      loadProfile();
    }
  }, [hideNav]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get("/auth/profile");
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfile(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNav && <WebNav profile={profile} />}
      {children}
    </div>
  );
}
