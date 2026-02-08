import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Trash2, 
  Loader2, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle2, 
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/api/apiClient";

export default function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  /* ---------------- LOAD APPOINTMENTS ---------------- */

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const { data } = await api.get("/appointments");
      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load appointments:", error);
      // Fallback to localStorage
      const localAppts = JSON.parse(localStorage.getItem("appointments") || "[]");
      setAppointments(localAppts);
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------- DELETE ---------------- */

  const deleteAppointment = async (appointmentId) => {
    if (!window.confirm("Cancel this appointment?")) return;

    try {
      await api.delete(`/appointments/${appointmentId}`);
      setAppointments(appointments.filter(a => a.id !== appointmentId));
    } catch (error) {
      console.error("Failed to delete appointment:", error);
      alert("Failed to cancel appointment. Please try again.");
    }
  };

  /* ---------------- UI ---------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100">
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Appointments
            </h1>
            <p className="text-gray-500 mt-2 text-lg">
              Manage your upcoming visits and history.
            </p>
          </div>
          <button
            onClick={() => navigate("/doctor-scheduler")}
            className="group bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-gray-300/50 transition-all duration-300 flex items-center gap-2 w-fit"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Book New Visit
          </button>
        </div>

        {appointments.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl shadow-gray-200/40 rounded-[2.5rem] p-12 text-center"
          >
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-teal-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No appointments scheduled</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              You haven't booked any visits yet. Find a doctor and schedule your first consultation.
            </p>
            <button
              onClick={() => navigate("/doctor-scheduler")}
              className="text-teal-600 font-bold hover:text-teal-700 hover:underline"
            >
              Find a doctor &rarr;
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence>
              {appointments.map((apt, i) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="group bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl shadow-gray-200/40 rounded-[2.5rem] p-6 hover:shadow-2xl hover:shadow-gray-200/60 transition-all duration-300 relative overflow-hidden"
                >
                  {/* Decorative Gradient Bar */}
                  <div className={`absolute top-0 left-0 w-2 h-full ${
                    apt.status === 'confirmed' ? 'bg-gradient-to-b from-teal-400 to-teal-600' : 'bg-gradient-to-b from-amber-300 to-amber-500'
                  }`} />

                  <div className="flex flex-col md:flex-row gap-6 pl-4">
                    {/* Time/Date Column */}
                    <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-1 min-w-[120px] md:border-r border-gray-100 pr-6">
                      <div className="bg-gray-50 rounded-2xl p-3 text-center min-w-[80px]">
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {new Date(apt.date || Date.now()).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="block text-2xl font-extrabold text-gray-900">
                          {new Date(apt.date || Date.now()).getDate()}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gray-600 flex items-center gap-1.5 mt-2">
                        <Clock className="w-4 h-4 text-teal-500" />
                        {apt.time_slot || apt.time}
                      </div>
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 space-y-3">
                       <div className="flex items-start justify-between">
                         <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                              {apt.doctor_name || "Doctor"}
                              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] uppercase tracking-wide font-bold">
                                {apt.specialization || "General"}
                              </span>
                            </h3>
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                               <MapPin className="w-3.5 h-3.5" />
                               {apt.location || "Online Consultation"}
                            </p>
                         </div>
                         
                         {/* Status Badge */}
                         <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                            apt.status === 'confirmed' 
                            ? 'bg-teal-50 text-teal-700 border border-teal-100' 
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                         }`}>
                            {apt.status === 'confirmed' ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Confirmed
                                </>
                            ) : (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Pending
                                </>
                            )}
                         </div>
                       </div>
                       
                       {/* Notes or Extras */}
                        {apt.notes && (
                            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 mt-2">
                                <span className="font-semibold text-gray-800">Notes:</span> {apt.notes}
                            </div>
                        )}
                    </div>

                    {/* Actions Column */}
                    <div className="flex items-center md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                        <button
                          onClick={() => deleteAppointment(apt.id)}
                          className="w-full md:w-auto p-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          title="Cancel Appointment"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="md:hidden">Cancel</span>
                        </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
