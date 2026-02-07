import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from '@/utils';
import { AvatarImage } from "@/components/ui/AvatarSelector";
import HealthCalendar from "@/components/dashboard/HealthCalendar";
import QuickActions from "@/components/dashboard/QuickActions";
import EmptyStateCard from "@/components/dashboard/EmptyStateCard";
import UpcomingCard from "@/components/dashboard/UpcomingCard";
import EmergencyButton from "@/components/ui/EmergencyButton";
import { Calendar, Pill, FileText, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";

export default function Dashboard() {
  const activeMemberId = localStorage.getItem("active_member_id");
const activeMemberName = localStorage.getItem("active_member_name");

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  /* ------------------ LOAD DATA ------------------ */

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // User profile (hackathon-safe)
let profileData = null;
try {
  const res = await api.get("/users/me");
  profileData = res.data;
} catch {
  // fallback so dashboard still works
  profileData = { name: "Guest User" };
}
setProfile(profileData);


      
      // Appointments (mock + backend safe)
// Always read localStorage (hackathon source of truth)
const localAppts = JSON.parse(
  localStorage.getItem("appointments") || "[]"
);

// Try backend, but don't trust it yet
// 🔐 Hackathon mode: localStorage is the single source of truth
setAppointments(localAppts);




      // Medicines
      const { data: meds } = await api.get("/medicines?active=true");
      setMedicines(meds || []);

      // Health records
      const { data: recs } = await api.get("/health-records");
      setRecords(recs || []);
    } catch (err) {
      console.error("Dashboard load failed:", err);
      if (err.response?.status === 401) {
        logout();
        navigate("/");
      }
    } finally {
      setIsLoading(false);
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

  const scheduledAppointments = appointments.map((a) => ({
  ...a,
  status: a.status || "scheduled",
}));

  const activeMedicines = medicines.filter((m) => m.active);

  // Animation variants for staggered entrance
  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } }
  };
  const itemVariant = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
  };

  /* ------------------ UI ------------------ */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 bg-gradient-to-r from-teal-50/30 to-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-gray-500">Hello 👋</p>
<motion.h1
  className="text-2xl font-bold text-gray-900"
  initial={{ scale: 0.99 }}
  animate={{ scale: 1 }}
  transition={{ duration: 0.4 }}
>
  {localStorage.getItem("active_member_name")
    ? `How’s ${localStorage.getItem("active_member_name")} feeling today?`
    : "Hope you're feeling well today"}
</motion.h1>

          </motion.div>

          <motion.div
            className="cursor-pointer"
            onClick={() => navigate("/profile")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AvatarImage avatar={profile?.avatar_id} className="w-12 h-12" />
          </motion.div>
        </div>
      </div>
      

      {/* Main */}
      <motion.main className="max-w-7xl mx-auto px-6 py-8" variants={containerVariants} initial="hidden" animate="show">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div variants={itemVariant}>
              <HealthCalendar
                appointments={scheduledAppointments}
                medicines={medicines}
                compact
              />
            </motion.div>

            {/* Appointments */}
            <motion.div variants={itemVariant}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Upcoming Appointments</h3>
<Link to="/appointments" className="text-sm text-teal-600">
  View all
</Link>
              </div>

              {scheduledAppointments.length ? (
                <div className="space-y-3">
                  {scheduledAppointments.slice(0, 3).map((apt, idx) => (
  <motion.div key={apt.id || apt._id || idx}>
    <UpcomingCard type="appointment" data={apt} />
  </motion.div>
))}

                </div>
              ) : (
                <motion.div variants={itemVariant}>
                  <EmptyStateCard
                    icon={Calendar}
                    title="No appointments"
                    description="Schedule your first doctor visit"
                    actionLabel="Add Appointment"
                    actionPage="doctor-scheduler"
                    color="blue"
                  />
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <motion.div variants={itemVariant}>
              <QuickActions />
            </motion.div>

            {/* Medicines */}
            <motion.div variants={itemVariant}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Active Medicines</h3>
                <Link to={createPageUrl('medicines')} className="text-sm text-teal-600">View all</Link>
              </div>

              {activeMedicines.length ? (
                <div className="space-y-3">
                  {activeMedicines.slice(0, 3).map((med, idx) => (
  <motion.div key={med.id || med._id || idx}>
    <UpcomingCard type="medicine" data={med} />
  </motion.div>
))}

                </div>
              ) : (
                <motion.div variants={itemVariant}>
                  <EmptyStateCard
                    icon={Pill}
                    title="No medicines"
                    description="Add your prescriptions"
                    actionLabel="Add Medicine"
                    actionPage="medicines"
                    color="teal"
                  />
                </motion.div>
              )}
            </motion.div>

            {/* Records */}
            <motion.div variants={itemVariant}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Health Records</h3>
                <Link to={createPageUrl('history')} className="text-sm text-teal-600">View all</Link>
              </div>

              {records.length ? (
                <div className="bg-white rounded-xl p-4 border">
                  <p className="text-sm text-gray-600">
                    {records.length} records uploaded
                  </p>
                </div>
              ) : (
                <motion.div variants={itemVariant}>
                  <EmptyStateCard
                    icon={FileText}
                    title="No reports"
                    description="Upload your medical reports"
                    actionLabel="Upload Report"
                    actionPage="medical-summariser"
                    color="purple"
                  />
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.main>

      <EmergencyButton profile={profile} />
    </div>
  );
}
