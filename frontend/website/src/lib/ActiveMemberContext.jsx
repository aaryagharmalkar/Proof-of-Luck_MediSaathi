import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "@/api/apiClient";

const STORAGE_ID = "active_member_id";
const STORAGE_NAME = "active_member_name";

const ActiveMemberContext = createContext(null);

export function ActiveMemberProvider({ children }) {
  const location = useLocation();
  const [activeMember, setActiveMemberState] = useState(null);
  const [membersList, setMembersList] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const isDoctorRoute = location.pathname.startsWith("/doctor-dashboard") || location.pathname.startsWith("/doctor-login") || location.pathname.startsWith("/doctor-onboarding");

  const loadMembers = useCallback(async () => {
    // Check for token first to optimize and avoid 401s for guests
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");

    if (isDoctorRoute || !token) {
      setMembersList([]);
      setActiveMemberState(null);
      return;
    }
    setMembersLoading(true);
    try {
      const { data } = await api.get("/members");
      const list = Array.isArray(data) ? data : [];
      setMembersList(list);
      const id = localStorage.getItem(STORAGE_ID);
      const name = localStorage.getItem(STORAGE_NAME);
      if (id && name) {
        const found = list.find((m) => String(m.id) === String(id));
        if (found) setActiveMemberState(found);
        else setActiveMemberState({ id, name });
      } else {
        setActiveMemberState(null);
      }
    } catch {
      setMembersList([]);
      setActiveMemberState(null);
    } finally {
      setMembersLoading(false);
    }
  }, [isDoctorRoute]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const setActiveMember = useCallback((member) => {
    if (!member) {
      localStorage.removeItem(STORAGE_ID);
      localStorage.removeItem(STORAGE_NAME);
      setActiveMemberState(null);
      return;
    }
    localStorage.setItem(STORAGE_ID, member.id);
    localStorage.setItem(STORAGE_NAME, member.name || "Family member");
    setActiveMemberState(member);
  }, []);

  const clearActiveMember = useCallback(() => {
    localStorage.removeItem(STORAGE_ID);
    localStorage.removeItem(STORAGE_NAME);
    setActiveMemberState(null);
  }, []);

  const refreshMembers = useCallback(() => {
    loadMembers();
  }, [loadMembers]);

  return (
    <ActiveMemberContext.Provider
      value={{
        activeMember,
        setActiveMember,
        clearActiveMember,
        membersList,
        membersLoading,
        loadMembers,
        refreshMembers,
      }}
    >
      {children}
    </ActiveMemberContext.Provider>
  );
}

export function useActiveMember() {
  const ctx = useContext(ActiveMemberContext);
  if (!ctx) {
    throw new Error("useActiveMember must be used within ActiveMemberProvider");
  }
  return ctx;
}
