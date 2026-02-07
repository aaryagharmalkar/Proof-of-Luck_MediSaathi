import React, { useEffect, useState } from "react";
import api from "@/api/apiClient";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmergencyButton from "@/components/ui/EmergencyButton";

import {
  FileText,
  Mic,
  Calendar,
  Pill,
  AlertTriangle,
  Loader2,
  ChevronRight,
} from "lucide-react";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ------------------ MOCK TREND DATA ------------------ */
const HEMOGLOBIN_TREND = [
  { date: "Jan", value: 14 },
  { date: "Feb", value: 13 },
  { date: "Mar", value: 12 },
  { date: "Apr", value: 11 },
  { date: "May", value: 10 },
  { date: "Jun", value: 9 },
];

export default function History() {
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [activeTab, setActiveTab] = useState("records");
  const [isLoading, setIsLoading] = useState(true);

  /* ------------------ LOAD DATA ------------------ */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [{ data: user }, { data: profile }, { data: records }, { data: appointments }, { data: medicines }] =
        await Promise.all([
          api.get("/users/me"),
          api.get("/health-profile/me"),
          api.get("/health-records"),
          api.get("/appointments"),
          api.get("/medicines"),
        ]);

      setProfile(profile);
      setRecords(records || []);
      setAppointments(appointments || []);
      setMedicines(medicines || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------ HELPERS ------------------ */
  const getRecordIcon = (type) => {
    switch (type) {
      case "audio_summary":
        return <Mic className="w-5 h-5 text-purple-600" />;
      case "report_summary":
        return <FileText className="w-5 h-5 text-blue-600" />;
      case "blood_test":
        return <FileText className="w-5 h-5 text-green-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRecordBg = (type) => {
    switch (type) {
      case "audio_summary":
        return "bg-purple-50";
      case "report_summary":
        return "bg-blue-50";
      case "blood_test":
        return "bg-green-50";
      default:
        return "bg-gray-50";
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
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="appointments">Visits</TabsTrigger>
            <TabsTrigger value="medicines">Meds</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* ------------------ RECORDS ------------------ */}
          <TabsContent value="records" className="space-y-4">
            {records.length === 0 ? (
              <EmptyState icon={FileText} label="No records yet" />
            ) : (
              records.map((record, i) => (
                <motion.div
                  key={record._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white p-4 rounded-xl border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        getRecordBg(record.type)
                      )}
                    >
                      {getRecordIcon(record.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{record.title}</h4>
                      <p className="text-sm text-gray-500">
                        {record.date && format(new Date(record.date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* ------------------ APPOINTMENTS ------------------ */}
          <TabsContent value="appointments" className="space-y-4">
            {appointments.length === 0 ? (
              <EmptyState icon={Calendar} label="No appointments yet" />
            ) : (
              appointments.map((apt, i) => (
                <motion.div
                  key={apt._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white p-4 rounded-xl border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{apt.doctor_name}</h4>
                      <p className="text-sm text-gray-500">{apt.specialization}</p>
                      <p className="text-xs text-gray-400">
                        {apt.date && format(new Date(apt.date), "MMM d, yyyy")}{" "}
                        {apt.time && `at ${apt.time}`}
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs",
                      apt.status === "scheduled" && "bg-blue-50 text-blue-600",
                      apt.status === "completed" && "bg-green-50 text-green-600",
                      apt.status === "cancelled" && "bg-gray-50 text-gray-600"
                    )}>
                      {apt.status}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* ------------------ MEDICINES ------------------ */}
          <TabsContent value="medicines" className="space-y-4">
            {medicines.length === 0 ? (
              <EmptyState icon={Pill} label="No medicines yet" />
            ) : (
              medicines.map((med, i) => {
                const statuses = Object.values(med.daily_status || {});
                const taken = statuses.filter(s => s === "taken").length;
                const missed = statuses.filter(s => s === "missed").length;

                return (
                  <motion.div
                    key={med._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white p-4 rounded-xl border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <Pill className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{med.name}</h4>
                        <p className="text-sm text-gray-500">
                          {med.dosage} • {med.frequency}
                        </p>
                        <div className="text-xs mt-1">
                          <span className="text-green-600">{taken} taken</span>{" "}
                          <span className="text-red-600 ml-2">{missed} missed</span>
                        </div>
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs",
                        med.active ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-600"
                      )}>
                        {med.active ? "Active" : "Completed"}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          {/* ------------------ TRENDS ------------------ */}
          <TabsContent value="trends">
            <div className="bg-white rounded-xl p-4 border">
              <h3 className="font-semibold mb-4">Hemoglobin Trend</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={HEMOGLOBIN_TREND}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[8, 16]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#ef4444"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 bg-red-50 p-3 rounded-lg flex gap-3">
                <AlertTriangle className="text-red-600 w-5 h-5" />
                <div>
                  <h4 className="font-medium text-red-800">Drop Detected</h4>
                  <p className="text-sm text-red-700">
                    Hemoglobin dropped from 14 → 9 g/dL. Consult a doctor.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <EmergencyButton profile={profile} />
    </div>
  );
}

/* ------------------ EMPTY STATE ------------------ */
function EmptyState({ icon: Icon, label }) {
  return (
    <div className="bg-white rounded-xl p-8 border text-center">
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">{label}</p>
    </div>
  );
}
