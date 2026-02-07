import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";

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
      const { data } = await api.get("/users/me");
      if (!data) {
        navigate("/onboarding");
        return;
      }

      setUser(data);
      setProfile(data.profile);
      setEditedProfile(data.profile);
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
      const { data } = await api.put("/users/profile", editedProfile);
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

  /* ------------------ UI ------------------ */

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 border">
          <div className="flex justify-between mb-6">
            <h1 className="text-2xl font-bold">Profile</h1>

            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-teal-500 hover:bg-teal-600"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <AvatarImage avatar={profile?.avatar_id} className="w-20 h-20" />
            <div>
              <h2 className="text-2xl font-bold">{profile?.name}</h2>
              <p className="text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <ProfileSection icon={User} title="Personal Details">
          <EditableRow
            label="Age"
            value={editedProfile?.age}
            isEditing={isEditing}
            onChange={(v) => setEditedProfile({ ...editedProfile, age: v })}
          />
          <StaticRow label="Gender" value={profile?.gender} />
          <EditableRow
            label="Location"
            value={editedProfile?.location}
            isEditing={isEditing}
            onChange={(v) => setEditedProfile({ ...editedProfile, location: v })}
          />
        </ProfileSection>

        {/* Medical Info */}
        <ProfileSection icon={Stethoscope} title="Medical Information">
          <EditableRow
            label="Primary Doctor"
            value={editedProfile?.primary_doctor}
            isEditing={isEditing}
            onChange={(v) => setEditedProfile({ ...editedProfile, primary_doctor: v })}
          />
          <EditableRow
            label="Hospital"
            value={editedProfile?.hospital}
            isEditing={isEditing}
            onChange={(v) => setEditedProfile({ ...editedProfile, hospital: v })}
          />
        </ProfileSection>

        {/* Emergency Contact */}
        <ProfileSection icon={Phone} title="Emergency Contact">
          <EditableRow
            label="Name"
            value={editedProfile?.emergency_contact_name}
            isEditing={isEditing}
            onChange={(v) =>
              setEditedProfile({ ...editedProfile, emergency_contact_name: v })
            }
          />
          <EditableRow
            label="Phone"
            value={editedProfile?.emergency_contact_phone}
            isEditing={isEditing}
            onChange={(v) =>
              setEditedProfile({ ...editedProfile, emergency_contact_phone: v })
            }
          />
          <EditableRow
            label="Relationship"
            value={editedProfile?.emergency_contact_relationship}
            isEditing={isEditing}
            onChange={(v) =>
              setEditedProfile({ ...editedProfile, emergency_contact_relationship: v })
            }
          />
        </ProfileSection>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </main>

      <EmergencyButton profile={profile} />
    </div>
  );
}

/* ------------------ REUSABLE UI ------------------ */

function ProfileSection({ icon: Icon, title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 border space-y-4"
    >
      <h3 className="font-semibold flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

function EditableRow({ label, value, isEditing, onChange }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      {isEditing ? (
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-40 text-right"
        />
      ) : (
        <span className="font-medium">{value || "Not set"}</span>
      )}
    </div>
  );
}

function StaticRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium capitalize">{value || "Not set"}</span>
    </div>
  );
}
