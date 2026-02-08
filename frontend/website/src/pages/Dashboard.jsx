import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from '@/utils';
import { AvatarImage } from "@/components/ui/AvatarSelector";
import HealthCalendar from "@/components/dashboard/HealthCalendar";
import QuickActions from "@/components/dashboard/QuickActions";
import EmptyStateCard from "@/components/dashboard/EmptyStateCard";
import UpcomingCard from "@/components/dashboard/UpcomingCard";
import EmergencyButton from "@/components/ui/EmergencyButton";
import ConsultationSummaryCard from "@/components/dashboard/ConsultationSummaryCard";
import AIAskBar from "@/components/dashboard/AIAskBar";
import { Calendar, Pill, FileText, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { useActiveMember } from "@/lib/ActiveMemberContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { activeMember } = useActiveMember();
  const activeMemberName = activeMember?.name;

  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  /* ------------------ LOAD DATA ------------------ */

  useEffect(() => {
    loadData();
  }, [activeMember]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // User profile (hackathon-safe)
let profileData = null;
try {
  const res = await api.get("/auth/me");
  profileData = res.data?.user ?? res.data;
  if (profileData) {
    const profileRes = await api.get("/auth/profile").catch(() => ({ data: null }));
    if (profileRes?.data) profileData = { ...profileData, ...profileRes.data };
  }
} catch {
  profileData = { name: "Guest User" };
}
setProfile(profileData);

      const params = activeMember?.id ? { member_id: activeMember.id } : {};
      
      // Appointments (load from Supabase)
      try {
        const { data: appts } = await api.get("/appointments", { params });
        setAppointments(Array.isArray(appts) ? appts : []);
      } catch (err) {
        console.error("Failed to load appointments:", err);
        // Fallback to localStorage if API fails (only for main user)
        if (!activeMember?.id) {
          const localAppts = JSON.parse(localStorage.getItem("appointments") || "[]");
          setAppointments(localAppts);
        } else {
          setAppointments([]);
        }
      }

      // Medicines
      const { data: meds } = await api.get("/medicines", { params });
      setMedicines(Array.isArray(meds) ? meds : (meds?.medicines ?? []));

      // Health records
      const { data: recsRes } = await api.get("/health/records", { params });
      setRecords(recsRes?.records ?? (Array.isArray(recsRes) ? recsRes : []));
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

  // Animation variants
  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } }
  };
  const itemVariant = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  /* ------------------ UI ------------------ */

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 bg-opacity-90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div>
            <p className="text-gray-500 text-sm font-medium">Welcome back</p>
            <h1 className="text-xl font-bold text-gray-900">
              {activeMemberName
                ? activeMemberName
                : profile?.full_name || "Guest"}
            </h1>
          </motion.div>

          <Link to="/profile">
             <AvatarImage avatar={profile?.avatar_id} className="w-10 h-10 border border-gray-200" />
          </Link>
        </div>
      </div>
      

      {/* Main */}
      <motion.main 
        className="max-w-6xl mx-auto px-6 py-8 space-y-12" 
        variants={containerVariants} 
        initial="hidden" 
        animate="show"
      >
        
        {/* 1. Hero / Consultation Summary */}
        <motion.section variants={itemVariant}>
            <ConsultationSummaryCard summary={null} />
        </motion.section>

        {/* 2. AI Ask Bar */}
        <motion.section variants={itemVariant} className="flex flex-col items-center max-w-4xl mx-auto w-full">
            <div className="w-full text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6 text-teal-500" />
                    How can I help you?
                </h2>
                <p className="text-gray-500">Ask about symptoms, medicines, or reports</p>
            </div>
            <AIAskBar />
        </motion.section>

        {/* 3. Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (Calendar) */}
          <motion.div variants={itemVariant} className="lg:col-span-8 space-y-8">
            <motion.div variants={itemVariant}>
              <HealthCalendar
                appointments={scheduledAppointments}
                medicines={medicines}
                compact={false}
              />
            </motion.div>

            {/* Upcoming Appointments Section */}
            <motion.div variants={itemVariant} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-6">
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
                    title="No Appointments"
                    description="Schedule your first visit"
                    actionText="Book Now"
                    link="doctor-scheduler"
                    color="blue"
                  />
                </motion.div>
              )}
            </motion.div>
          </motion.div>

            {/* Right Column (Quick Actions & Meds) */}
            <div className="lg:col-span-4 space-y-6">
            <motion.div variants={itemVariant}>
              <QuickActions />
            </motion.div>

              {/* Medicines List */}
              <motion.div variants={itemVariant} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                          <Pill className="w-5 h-5 text-purple-500" /> Active Meds
                      </h3>
                      <Link to={createPageUrl('medicines')} className="text-sm font-semibold text-teal-600 hover:text-teal-700">Manage</Link>
                  </div>

                 {activeMedicines.length > 0 ? (
                    <EmptyStateCard 
                       icon={Pill} 
                       title="Active Medicines" 
                       description={`${activeMedicines.length} in progress`} 
                       actionText="View List"
                       link="medicines"
                       color="purple"
                    />
                 ) : (
                    <EmptyStateCard 
                       icon={Pill} 
                       title="No Medicines" 
                       description="Nothing active" 
                       actionText="Add Meds"
                       link="medicines"
                       color="purple"
                    />
                 )}
              </motion.div>

              {/* Reports / Records */}
              <motion.div variants={itemVariant}>
                  <EmptyStateCard 
                     icon={FileText} 
                     title="Medical Records" 
                     description="Upload reports for AI analysis." 
                     actionText="Upload" 
                     link="medical-summariser"
                     color="teal"
                  />
              </motion.div>
          </div>
        </div>
      </motion.main>

      <EmergencyButton profile={profile} />
    </div>
  );
}
