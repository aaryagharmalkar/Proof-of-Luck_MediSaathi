import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/api/apiClient";
import { motion } from "framer-motion";
import { Calendar, Users, Loader2, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { format, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await api.get("/doctors/me");
        const doctor = meRes.data;
        if (!doctor?.onboarding_completed) {
          navigate("/doctor-onboarding");
          return;
        }
        const [apptsRes, patientsRes] = await Promise.all([
          api.get("/doctors/me/appointments"),
          api.get("/doctors/me/patients"),
        ]);
        setAppointments(apptsRes.data || []);
        setPatients(patientsRes.data || []);
      } catch (e) {
        if (e.response?.status === 401) {
          navigate("/doctor-login");
          return;
        }
        if (e.response?.status === 404) {
          navigate("/doctor-onboarding");
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const handleApprove = async (appointmentId) => {
    setApprovingId(appointmentId);
    try {
      await api.patch(`/doctors/me/appointments/${appointmentId}`, { status: "confirmed" });
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: "confirmed" } : a))
      );
    } catch (e) {
      console.error("Approve failed", e);
      alert(e.response?.data?.detail || "Failed to approve");
    } finally {
      setApprovingId(null);
    }
  };

  const getDaysInMonth = (date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const days = eachDayOfInterval({ start, end });
    const startBlank = start.getDay();
    return { days, startBlank };
  };

  const { days, startBlank } = getDaysInMonth(currentDate);
  const monthYear = format(currentDate, "MMMM yyyy");

  const getApptsForDay = (day) => {
    const d = format(day, "yyyy-MM-dd");
    return appointments.filter((a) => a.date === d);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white border-b border-gray-100 bg-gradient-to-r from-teal-50/30 to-white rounded-t-2xl px-6 py-6">
          <p className="text-gray-500">Doctor dashboard</p>
          <h1 className="text-2xl font-bold text-gray-900">Upcoming appointments</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Calendar</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentDate((d) => subMonths(d, 1))}
                  className="p-2 rounded-lg border hover:bg-gray-50"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-700">{monthYear}</span>
                <button
                  onClick={() => setCurrentDate((d) => addMonths(d, 1))}
                  className="p-2 rounded-lg border hover:bg-gray-50"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startBlank }).map((_, i) => (
                  <div key={`b-${i}`} className="aspect-square" />
                ))}
                {days.map((day) => {
                  const dayAppts = getApptsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm ${
                        isToday ? "bg-teal-100 text-teal-800 font-medium" : "hover:bg-gray-50"
                      }`}
                    >
                      {format(day, "d")}
                      {dayAppts.length > 0 && (
                        <div className="w-2 h-2 rounded-full bg-teal-500 mt-0.5" title={dayAppts.length + " appointments"} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upcoming list + Patients */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Upcoming</h3>
                <Link to="/doctor-dashboard/patients" className="text-sm text-teal-600">View all</Link>
              </div>
              {appointments.length === 0 ? (
                <p className="text-sm text-gray-500">No upcoming appointments</p>
              ) : (
                <div className="space-y-2">
                  {appointments.slice(0, 5).map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{apt.date}</p>
                        <p className="text-xs text-gray-500">{apt.time_slot} · {apt.symptoms ? apt.symptoms.slice(0, 30) + "…" : "—"}</p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${apt.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {apt.status === "confirmed" ? "Confirmed" : "Pending approval"}
                        </span>
                      </div>
                      {apt.status === "scheduled" && (
                        <button
                          onClick={() => handleApprove(apt.id)}
                          disabled={approvingId === apt.id}
                          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
                        >
                          {approvingId === apt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Approve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Your patients</h3>
                <Link to="/doctor-dashboard/patients" className="text-sm text-teal-600">View all</Link>
              </div>
              {patients.length === 0 ? (
                <p className="text-sm text-gray-500">No patients yet</p>
              ) : (
                <div className="space-y-2">
                  {patients.slice(0, 4).map((p) => (
                    <Link
                      key={p.user_id}
                      to={`/doctor-dashboard/patients/${p.user_id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-teal-100 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-medium">
                        {(p.full_name || "P")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{p.full_name || "Patient"}</p>
                        <p className="text-xs text-gray-500">{p.upcoming_count || 0} upcoming</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
