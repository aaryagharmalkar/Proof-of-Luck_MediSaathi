import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { useActiveMember } from "@/lib/ActiveMemberContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarImage } from "@/components/ui/AvatarSelector";
import EmergencyButton from "@/components/ui/EmergencyButton";

import {
  User,
  MapPin,
  Stethoscope,
  Building,
  Phone,
  Edit2,
  Save,
  LogOut,
  Loader2,
  Heart,
} from "lucide-react";

import { motion } from "framer-motion";

export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { activeMember, clearActiveMember } = useActiveMember();

  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [editedProfile, setEditedProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* ------------------ LOAD PROFILE ------------------ */

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [meRes, profileRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/auth/profile"),
      ]);
      const userData = meRes.data?.user ?? meRes.data;
      const profileData = profileRes.data;
      if (!userData) {
        navigate("/onboarding");
        return;
      }
      setUser(userData);
      setProfile(profileData);
      setEditedProfile(profileData || {});
    } catch (err) {
      console.error("Failed to load profile:", err);
      if (err.response?.status === 401) {
        logout();
        navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------ SAVE PROFILE ------------------ */

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data } = await api.patch("/auth/profile", editedProfile);
      setProfile(data);
      setEditedProfile(data);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  /* ------------------ LOGOUT ------------------ */

  const handleLogout = async () => {
  try {
    await api.post("/auth/logout");
  } catch (err) {
    console.warn("Backend logout failed, continuing local logout");
  } finally {
    logout(); // clears localStorage + context
    navigate("/");
  }
};


  /* ------------------ LOADING ------------------ */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  /* ------------------ VIEWING AS FAMILY MEMBER ------------------ */
  if (activeMember) {
    return (
      <div className="min-h-screen relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100">
        {/* Background Blobs */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
             <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
             <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
        </div>

        <main className="max-w-4xl mx-auto px-6 py-12 relative z-10 space-y-8">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-gray-200/50 rounded-[2.5rem] p-8"
            >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                 <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Family Profile</h1>
                 <p className="text-gray-500 font-medium">Viewing details for a family member</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  clearActiveMember();
                  loadProfile();
                }}
                className="bg-white hover:bg-teal-50 text-teal-700 border-teal-200 font-bold rounded-xl h-12 px-6 shadow-sm"
              >
                Switch to My Account
              </Button>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8 bg-gray-50/50 rounded-3xl p-8 border border-gray-100">
              <AvatarImage avatar={activeMember.avatar} className="w-32 h-32 rounded-full ring-4 ring-white shadow-lg" />
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{activeMember.name || "Family member"}</h2>
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-teal-100 text-teal-800 text-sm font-bold capitalize">
                    {activeMember.relation || activeMember.relationship || "Family member"}
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                 <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                     <User className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="font-bold text-blue-900 mb-1">Read-Only View</h4>
                    <p className="text-blue-800 text-sm leading-relaxed">
                        You are viewing the profile for <strong>{activeMember.name}</strong>. Switching to family profiles allows you to see their specific health data on the Dashboard and History pages. To edit your own profile or manage family members, switch back to your main account.
                    </p>
                 </div>
            </div>
          </motion.div>
          <EmergencyButton profile={null} />
        </main>
      </div>
    );
  }

  /* ------------------ MY PROFILE UI ------------------ */

  return (
    <div className="min-h-screen relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100">
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10 space-y-8">
        {/* Header Card */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-gray-200/50 rounded-[2.5rem] p-8 relative overflow-hidden"
        >
          {/* Decorative Gradient Bar */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-blue-500" />

          <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
            <div>
                 <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">My Profile</h1>
                 <p className="text-gray-500 font-medium mt-1">Manage your personal information</p>
            </div>

            {!isEditing ? (
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-bold rounded-xl h-11 px-6 shadow-sm"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gray-900 hover:bg-black text-white font-bold rounded-xl h-11 px-8 shadow-lg shadow-gray-900/20"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="relative">
                <div className="absolute inset-0 bg-teal-200 blur-xl opacity-50 rounded-full" />
                <AvatarImage 
                    avatar={profile?.avatar} 
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl relative z-10" 
                />
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h2 className="text-3xl font-extrabold text-gray-900">
                  {safeDisplayValue(profile?.full_name) || safeDisplayValue(profile?.name) || "Profile"}
              </h2>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-bold">
                 <span className="w-2 h-2 rounded-full bg-green-500" />
                 {user?.email}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form Grid */}
        <div className="grid md:grid-cols-2 gap-6"> 
            
            {/* Personal Details */}
            <ProfileSection icon={User} title="Personal Details" color="text-teal-600" bg="bg-teal-50">
              <div className="space-y-4">
                  <EditableRow
                    label="Age"
                    value={editedProfile?.age}
                    isEditing={isEditing}
                    onChange={(v) => setEditedProfile({ ...editedProfile, age: v })}
                    placeholder="e.g. 28"
                  />
                  <StaticRow label="Gender" value={profile?.gender} />
                  <EditableRow
                    label="Location"
                    value={editedProfile?.location}
                    isEditing={isEditing}
                    onChange={(v) => setEditedProfile({ ...editedProfile, location: v })}
                    placeholder="City, Country"
                  />
              </div>
            </ProfileSection>

            {/* Medical Info */}
            <ProfileSection icon={Stethoscope} title="Medical Info" color="text-blue-600" bg="bg-blue-50">
               <div className="space-y-4">
                  <EditableRow
                    label="Primary Doctor"
                    value={typeof editedProfile?.primary_doctor === "object" ? editedProfile?.primary_doctor?.name : editedProfile?.primary_doctor}
                    isEditing={isEditing}
                    onChange={(v) => setEditedProfile({
                      ...editedProfile,
                      primary_doctor: { ...(editedProfile?.primary_doctor || {}), name: v },
                    })}
                    placeholder="Dr. Name"
                  />
                  <EditableRow
                    label="Hospital"
                    value={typeof editedProfile?.primary_doctor === "object" ? editedProfile?.primary_doctor?.hospital : editedProfile?.hospital}
                    isEditing={isEditing}
                    onChange={(v) => setEditedProfile({
                      ...editedProfile,
                      primary_doctor: { ...(editedProfile?.primary_doctor || {}), hospital: v },
                    })}
                    placeholder="Hospital Name"
                  />
               </div>
            </ProfileSection>

            {/* Emergency Contact */}
            <div className="md:col-span-2">
                <ProfileSection icon={Phone} title="Emergency Contact" color="text-red-600" bg="bg-red-50">
                    <div className="grid md:grid-cols-3 gap-6">
                        <EditableRow
                            label="Name"
                            value={typeof editedProfile?.emergency_contact === "object" ? editedProfile?.emergency_contact?.name : editedProfile?.emergency_contact_name}
                            isEditing={isEditing}
                            onChange={(v) => setEditedProfile({
                            ...editedProfile,
                            emergency_contact: { ...(editedProfile?.emergency_contact || {}), name: v },
                            })}
                            placeholder="Contact Name"
                        />
                        <EditableRow
                            label="Phone"
                            value={typeof editedProfile?.emergency_contact === "object" ? editedProfile?.emergency_contact?.phone : editedProfile?.emergency_contact_phone}
                            isEditing={isEditing}
                            onChange={(v) => setEditedProfile({
                            ...editedProfile,
                            emergency_contact: { ...(editedProfile?.emergency_contact || {}), phone: v },
                            })}
                            placeholder="+91..."
                        />
                        <EditableRow
                            label="Relationship"
                            value={typeof editedProfile?.emergency_contact === "object" ? editedProfile?.emergency_contact?.relationship : editedProfile?.emergency_contact_relationship}
                            isEditing={isEditing}
                            onChange={(v) => setEditedProfile({
                            ...editedProfile,
                            emergency_contact: { ...(editedProfile?.emergency_contact || {}), relationship: v },
                            })}
                            placeholder="e.g. Parent"
                        />
                    </div>
                </ProfileSection>
            </div>
        </div>

        {/* Logout */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
        >
            <Button
            variant="outline"
            className="w-full bg-white hover:bg-red-50 text-red-600 border-red-100 hover:border-red-200 font-bold h-14 rounded-2xl shadow-sm text-lg transition-all"
            onClick={handleLogout}
            >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
            </Button>
        </motion.div>
      </main>

      <EmergencyButton profile={profile} />
    </div>
  );
}

/* ------------------ REUSABLE UI ------------------ */

function ProfileSection({ icon: Icon, title, children, color = "text-gray-600", bg = "bg-gray-100" }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 border border-white/60 shadow-lg shadow-gray-200/40 h-full flex flex-col"
    >
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-exrabold text-xl text-gray-800 tracking-tight">{title}</h3>
      </div>
      <div className="flex-1">
         {children}
      </div>
    </motion.div>
  );
}

function safeDisplayValue(value) {
  if (value == null) return "";
  if (typeof value === "object") return "";
  return String(value);
}

function EditableRow({ label, value, isEditing, onChange, placeholder }) {
  const display = safeDisplayValue(value);
  return (
    <div className="flex flex-col space-y-1.5">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</span>
      {isEditing ? (
        <Input
          value={display}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-white border-gray-200 h-11 rounded-xl text-base"
        />
      ) : (
        <div className="font-bold text-gray-800 text-lg px-1">{display || "—"}</div>
      )}
    </div>
  );
}

function StaticRow({ label, value }) {
  const display = safeDisplayValue(value);
  return (
    <div className="flex flex-col space-y-1.5">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</span>
      <div className="font-bold text-gray-800 text-lg px-1 capitalize">{display || "—"}</div>
    </div>
  );
}
