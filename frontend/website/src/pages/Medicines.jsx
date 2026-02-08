import React, { useState, useEffect } from "react";
import api from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmergencyButton from "@/components/ui/EmergencyButton";

import {
  Pill,
  Upload,
  Plus,
  Check,
  X,
  Clock,
  Loader2,
  Bell,
  AlertCircle,
  Trash2,
  Pencil,
  Calendar,
  Package,
} from "lucide-react";

import { format, addDays, subDays, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Format "09:00" or "09:30" to "9:00 AM" / "9:30 PM"
function formatTimeForDisplay(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "—";
  const [h, m] = timeStr.trim().split(":").map(Number);
  if (Number.isNaN(h)) return timeStr;
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  const min = Number.isNaN(m) ? "00" : String(m).padStart(2, "0");
  return `${hour}:${min} ${ampm}`;
}

// Medicines due today (status pending) with their next reminder time
function getDueTodayMedicines(medicines) {
  const today = format(new Date(), "yyyy-MM-dd");
  return medicines
    .filter((m) => (m.daily_status || {})[today] === "pending" || !(m.daily_status || {})[today])
    .map((m) => ({
      medicine: m,
      dueAt: (m.custom_times && m.custom_times[0]) || m.reminder_time || "09:00",
    }))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

// Check if we're within the same 15-min window as reminder time (for notifications)
function isReminderTimeNow(dueTimeStr) {
  if (!dueTimeStr) return false;
  const [h, m] = dueTimeStr.trim().split(":").map(Number);
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const reminderMin = (h || 0) * 60 + (m || 0);
  return Math.abs(currentMin - reminderMin) <= 15;
}

// Your prescription extraction API endpoint
const API_BASE = import.meta.env.VITE_API_URL
  ? `${String(import.meta.env.VITE_API_URL).replace(/\/$/, "")}/api/v1`
  : "http://localhost:5050/api/v1";
const PRESCRIPTION_API_URL = `${API_BASE}/medicines/extract-file`;

console.log("🔗 PRESCRIPTION_API_URL:", PRESCRIPTION_API_URL);

export default function Medicines() {
  const [profile, setProfile] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [extractedMedicines, setExtractedMedicines] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [addError, setAddError] = useState(null);
  const [detailsMedicine, setDetailsMedicine] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "denied");
  const [notifiedToday, setNotifiedToday] = useState({}); // { [medicineId]: true } so we don't re-notify
  const [editingMedicine, setEditingMedicine] = useState(null); // when set, we're in edit mode for this medicine
  const [editForm, setEditForm] = useState({});
  const [aiInfo, setAiInfo] = useState(null);
  const [loadingAiInfo, setLoadingAiInfo] = useState(false);

  const [newMedicine, setNewMedicine] = useState({
    name: "",
    dosage: "",
    frequency: "once a day",
    duration: 5,
    reminder_time: "09:00",
  });

  /* ------------------ LOAD DATA ------------------ */

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (detailsMedicine) {
        setAiInfo(null);
    }
  }, [detailsMedicine]);

  const fetchMedicineInfo = async () => {
    if (!detailsMedicine) return;
    setLoadingAiInfo(true);
    try {
        const { data } = await api.post("/medicines/info", { name: detailsMedicine.name });
        setAiInfo(data);
    } catch (err) {
        console.error("AI info failed", err);
    } finally {
        setLoadingAiInfo(false);
    }
  };

  // Browser reminders: check every minute if it's reminder time for any due-today medicine
  useEffect(() => {
    if (notificationPermission !== "granted" || !medicines.length) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const interval = setInterval(() => {
      const dueToday = getDueTodayMedicines(medicines);
      dueToday.forEach(({ medicine, dueAt }) => {
        if (!isReminderTimeNow(dueAt)) return;
        const id = medicine.id ?? medicine._id;
        const key = `${id}-${today}`;
        if (notifiedToday[key]) return;
        try {
          new Notification("MediSaathi – Medicine reminder", {
            body: `Time to take: ${medicine.name}${medicine.dosage ? ` (${medicine.dosage})` : ""}`,
            icon: "/vite.svg",
          });
          setNotifiedToday((prev) => ({ ...prev, [key]: true }));
        } catch (_) {}
      });
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [notificationPermission, medicines, notifiedToday]);

  const enableReminders = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
  };

  const loadData = async () => {
    try {
      const { data: meData } = await api.get("/auth/me");
      const user = meData?.user ?? meData;
      if (user) {
        const profileRes = await api.get("/auth/profile").catch(() => ({ data: null }));
        setProfile(profileRes?.data ?? user.profile);
      }
      const { data: meds } = await api.get("/medicines");
      setMedicines(Array.isArray(meds) ? meds : (meds ?? []));
    } catch (err) {
      console.error("Failed to load medicines:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------ UPLOAD PRESCRIPTION (REAL API) ------------------ */

  const handlePrescriptionUpload = async (e) => {
  if (!e.target.files?.[0]) return;

  const file = e.target.files[0];
  
  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!validTypes.includes(file.type)) {
    setUploadError("Please upload a JPG, PNG, or PDF file");
    return;
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    setUploadError("File size must be less than 10MB");
    return;
  }

  setUploadProcessing(true);
  setUploadError(null);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    const response = await fetch(PRESCRIPTION_API_URL, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    console.log("📥 Response status:", response.status);

    // Parse the JSON response first
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || 'Failed to process prescription');
    }

    if (!result.success || !result.medicines || result.medicines.length === 0) {
      setUploadError(result.message || "No medicines detected in the prescription");
      setUploadProcessing(false);
      return;
    }

    // Successfully extracted medicines
    setExtractedMedicines(result.medicines);
    
    // If only one medicine, auto-populate the form
    if (result.medicines.length === 1) {
      const med = convertExtractedToForm(result.medicines[0]);
      setNewMedicine(med);
      setShowAddDialog(true);
    } else {
      // Multiple medicines - show selection dialog
      setShowAddDialog(true);
    }

  } catch (err) {
    console.error("Prescription upload failed:", err);
    setUploadError(err.message || "Failed to process prescription");
  } finally {
    setUploadProcessing(false);
    // Reset file input
    e.target.value = '';
  }
};
  /* ------------------ CONVERT EXTRACTED FORMAT TO FORM FORMAT ------------------ */

  const convertExtractedToForm = (extractedMed) => {
    // Convert intakeTimes to frequency string
    let frequency = "once a day";
    const intakeCount = extractedMed.intakeTimes?.length || 0;
    
    if (intakeCount === 2) frequency = "twice a day";
    else if (intakeCount === 3) frequency = "thrice a day";
    else if (intakeCount > 3) frequency = "four times a day";

    // Use first intake time for reminder, or first custom time
    let reminderTime = "09:00";
    if (extractedMed.intakeTimes && extractedMed.intakeTimes.length > 0) {
      const firstIntake = extractedMed.intakeTimes[0];
      // Map intake times to approximate clock times
      const timeMap = {
        "Before Breakfast": "07:00",
        "After Breakfast": "09:00",
        "Before Lunch": "11:30",
        "After Lunch": "14:00",
        "Before Dinner": "18:00",
        "After Dinner": "20:00",
      };
      reminderTime = timeMap[firstIntake] || "09:00";
    } else if (extractedMed.customTimes && extractedMed.customTimes.length > 0) {
      reminderTime = extractedMed.customTimes[0];
    }

    // Build dosage string
    const dosage = extractedMed.type === "tablet" 
      ? `${extractedMed.doseCount || 1} tablet(s)`
      : extractedMed.type === "syrup"
      ? `${extractedMed.doseCount || 5}ml`
      : `${extractedMed.doseCount || 1} dose(s)`;

    return {
      name: extractedMed.name || "",
      dosage: dosage,
      frequency: frequency,
      duration: extractedMed.durationDays || 7,
      reminder_time: reminderTime,
      // Store original extracted data for reference
      _extracted: extractedMed,
    };
  };

  /* ------------------ ADD MEDICINE ------------------ */

  const handleAddMedicine = async () => {
    setAddError(null);
    try {
      const startDate = new Date();
      const endDate = addDays(startDate, newMedicine.duration);

      const daily_status = {};
      for (let i = 0; i < newMedicine.duration; i++) {
        daily_status[format(addDays(startDate, i), "yyyy-MM-dd")] = "pending";
      }
      const reminderTime = newMedicine.reminder_time || "09:00";

      await api.post("/medicines", {
        name: newMedicine.name,
        dosage: newMedicine.dosage || null,
        frequency: newMedicine.frequency || "once a day",
        custom_times: [reminderTime],
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        daily_status,
        is_active: true,
      });

      resetDialog();
      loadData();
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.message;
      console.error("Add medicine failed:", msg, err);
      setAddError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    }
  };

  /* ------------------ ADD ALL EXTRACTED MEDICINES ------------------ */

  const handleAddAllExtracted = async () => {
    try {
      for (const extractedMed of extractedMedicines) {
        const medData = convertExtractedToForm(extractedMed);
        const startDate = new Date();
        const endDate = addDays(startDate, medData.duration);

        const daily_status = {};
        for (let i = 0; i < medData.duration; i++) {
          daily_status[format(addDays(startDate, i), "yyyy-MM-dd")] = "pending";
        }
        const reminderTime = medData.reminder_time || "09:00";

        await api.post("/medicines", {
          name: medData.name,
          dosage: medData.dosage || null,
          frequency: medData.frequency || "once a day",
          custom_times: [reminderTime],
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          daily_status,
          is_active: true,
        });
      }

      resetDialog();
      loadData();
    } catch (err) {
      console.error("Add all medicines failed:", err);
    }
  };

  /* ------------------ UPDATE STATUS ------------------ */

  const handleMedicineAction = async (medicine, action) => {
    const id = medicine.id ?? medicine._id;
    const today = format(new Date(), "yyyy-MM-dd");
    const newDailyStatus = { ...(medicine.daily_status || {}), [today]: action };
    try {
      await api.patch(`/medicines/${id}`, { daily_status: newDailyStatus });
      loadData();
    } catch (err) {
      console.error("Medicine update failed:", err);
    }
  };

  const handleDeleteMedicine = async () => {
    if (!medicineToDelete) return;
    const id = medicineToDelete.id ?? medicineToDelete._id;
    try {
      await api.delete(`/medicines/${id}`);
      setDetailsMedicine(null);
      setShowDeleteConfirm(false);
      setMedicineToDelete(null);
      loadData();
    } catch (err) {
      console.error("Delete medicine failed:", err);
    }
  };

  const openDeleteConfirm = (medicine) => {
    setMedicineToDelete(medicine);
    setShowDeleteConfirm(true);
  };

  const startEdit = (medicine) => {
    setEditingMedicine(medicine);
    const times = (medicine.custom_times && medicine.custom_times[0]) || medicine.reminder_time || "09:00";
    setEditForm({
      name: medicine.name ?? "",
      dosage: medicine.dosage ?? "",
      form: medicine.form ?? "",
      frequency: medicine.frequency ?? "once a day",
      custom_times: Array.isArray(medicine.custom_times) ? medicine.custom_times : [times],
      start_date: medicine.start_date ?? "",
      end_date: medicine.end_date ?? "",
      dose_count: medicine.dose_count ?? 1,
      unit: medicine.unit ?? "tablet",
      quantity_current: medicine.quantity_current ?? "",
      quantity_unit: medicine.quantity_unit ?? "",
      refill_reminder_days: medicine.refill_reminder_days ?? "",
      is_critical: !!medicine.is_critical,
      notes: medicine.notes ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingMedicine(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingMedicine) return;
    const id = editingMedicine.id ?? editingMedicine._id;
    const payload = {
      name: editForm.name,
      dosage: editForm.dosage || null,
      form: editForm.form || null,
      frequency: editForm.frequency || null,
      custom_times: editForm.custom_times?.length ? editForm.custom_times : null,
      start_date: editForm.start_date || null,
      end_date: editForm.end_date || null,
      dose_count: editForm.dose_count,
      unit: editForm.unit || null,
      quantity_current: editForm.quantity_current !== "" ? Number(editForm.quantity_current) : null,
      quantity_unit: editForm.quantity_unit || null,
      refill_reminder_days: editForm.refill_reminder_days !== "" ? Number(editForm.refill_reminder_days) : null,
      is_critical: editForm.is_critical,
      notes: editForm.notes || null,
    };
    try {
      const { data } = await api.patch(`/medicines/${id}`, payload);
      setDetailsMedicine(data);
      setEditingMedicine(null);
      setEditForm({});
      loadData();
    } catch (err) {
      console.error("Update medicine failed:", err);
    }
  };

  /* ------------------ HELPERS ------------------ */

  const resetDialog = () => {
    setShowAddDialog(false);
    setExtractedMedicines([]);
    setUploadError(null);
    setAddError(null);
    setNewMedicine({
      name: "",
      dosage: "",
      frequency: "once a day",
      duration: 5,
      reminder_time: "09:00",
    });
  };

  const getProgress = (medicine) => {
    const values = Object.values(medicine.daily_status || {});
    if (values.length === 0) return 0;
    const taken = values.filter((v) => v === "taken").length;
    return Math.round((taken / values.length) * 100);
  };

  const todayStatus = (medicine) =>
    medicine.daily_status?.[format(new Date(), "yyyy-MM-dd")] || "pending";

  /* ------------------ LOADING ------------------ */

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  /* ------------------ UI ------------------ */

  return (
    <div className="min-h-screen relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100">
       {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10 space-y-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5 }} 
              className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight"
            >
              Medicine Cabinet
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-4 text-sm font-medium"
            >
              <div className="bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/40 shadow-sm text-teal-800 flex items-center gap-2">
                 <Pill className="w-4 h-4" />
                 {medicines.length} Active Prescriptions
              </div>
              
              {medicines.length > 0 && (
                <>
                  <div className="bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/40 shadow-sm text-gray-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    Next: <span className="font-bold">{getNextReminder(medicines)}</span>
                  </div>
                  {getDueTodayMedicines(medicines).length > 0 && (
                     <div className="bg-amber-100/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-200/50 text-amber-800 flex items-center gap-2 animate-pulse">
                        <Bell className="w-4 h-4" />
                        {getDueTodayMedicines(medicines).length} Due Today
                     </div>
                  )}
                  {typeof Notification !== "undefined" && notificationPermission !== "granted" && (
                    <button onClick={enableReminders} className="text-teal-600 hover:text-teal-800 underline decoration-teal-300">
                      Enable Notifications
                    </button>
                  )}
                </>
              )}
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 self-start md:self-auto"
          >
            <label className="cursor-pointer group">
              <input 
                hidden 
                type="file" 
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handlePrescriptionUpload} 
              />
              <div className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md text-gray-700 hover:bg-white hover:shadow-lg hover:shadow-gray-200/30 transition-all cursor-pointer font-bold duration-300 transform group-hover:-translate-y-0.5">
                <Upload className="w-5 h-5 text-teal-600" />
                <span>Upload Rx</span>
              </div>
            </label>
            <Button 
                onClick={() => setShowAddDialog(true)} 
                className="bg-gray-900 hover:bg-black text-white px-6 py-6 rounded-2xl shadow-xl shadow-gray-900/20 font-bold text-base transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              <Plus className="w-5 h-5 mr-2" /> Add Medicine
            </Button>
          </motion.div>
        </header>

        {/* Due Today Section */}
        {medicines.length > 0 && getDueTodayMedicines(medicines).length > 0 && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-200/20 to-orange-200/20 rounded-[2.5rem] blur-xl -z-10" />
            <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-xl shadow-amber-900/5">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <Bell className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Due Today</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getDueTodayMedicines(medicines).map(({ medicine, dueAt }) => (
                    <motion.div
                      key={`due-${medicine.id ?? medicine._id}`}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setDetailsMedicine(medicine)}
                      className="cursor-pointer bg-white rounded-2xl p-5 border border-amber-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50 transition-all flex items-center justify-between"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                             <Clock className="w-6 h-6 text-amber-600" />
                          </div>
                          <div>
                             <h4 className="font-bold text-gray-900 text-lg leading-tight">{medicine.name}</h4>
                             <p className="text-amber-700 text-sm font-medium mt-0.5">Due {formatTimeForDisplay(dueAt)}</p>
                          </div>
                       </div>
                       <Button size="icon" variant="ghost" className="text-gray-400 hover:text-amber-600">
                          <Check className="w-5 h-5" />
                       </Button>
                    </motion.div>
                  ))}
                </div>
            </div>
          </motion.section>
        )}

        {/* Upload Error / Extracted Medicines */}
        <AnimatePresence>
            {uploadError && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50/80 backdrop-blur border border-red-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm"
                >
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 text-red-600">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-red-900">Upload Failed</h4>
                        <p className="text-red-700 mt-1">{uploadError}</p>
                    </div>
                    <button onClick={() => setUploadError(null)} className="p-2 hover:bg-red-100 rounded-full text-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </motion.div>
            )}

            {extractedMedicines.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="bg-white/80 backdrop-blur-xl border border-teal-200 shadow-2xl shadow-teal-900/10 rounded-[2.5rem] p-8"
                >
                    <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-600">
                               <Check className="w-7 h-7" />
                           </div>
                           <div>
                               <h3 className="text-2xl font-bold text-gray-900">Prescription Analyzed</h3>
                               <p className="text-gray-500 font-medium">{extractedMedicines.length} medicines found, ready to add.</p>
                           </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <Button 
                                className="flex-1 md:flex-none bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 rounded-xl" 
                                onClick={handleAddAllExtracted}
                            >
                                Import All
                            </Button>
                            <Button 
                                variant="outline" 
                                className="flex-1 md:flex-none border-gray-200 hover:bg-gray-50 h-12 rounded-xl font-bold"
                                onClick={() => setExtractedMedicines([])}
                            >
                                Discard
                            </Button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {extractedMedicines.map((med, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-100 hover:border-teal-200 transition-colors">
                                <div>
                                    <h4 className="font-bold text-gray-900">{med.name}</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {med.doseCount} {med.type} • {med.frequency}
                                    </p>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-teal-600 hover:text-teal-700 font-bold hover:bg-teal-50"
                                    onClick={() => {
                                        setNewMedicine(convertExtractedToForm(med));
                                        setShowAddDialog(true);
                                    }}
                                >
                                    Edit
                                </Button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Empty State / Upload Prompt */}
        {medicines.length === 0 && extractedMedicines.length === 0 && !uploadProcessing && (
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-12 text-center shadow-xl shadow-gray-200/50"
             >
                <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Pill className="w-10 h-10 text-teal-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Medicine Cabinet Empty</h3>
                <p className="text-gray-500 font-medium mb-8 max-w-md mx-auto">
                    Manually add your medicines or upload a prescription for instant AI extraction.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={() => setShowAddDialog(true)} className="bg-teal-500 hover:bg-teal-600 text-white font-bold h-12 px-8 rounded-xl">
                        Add Manually
                    </Button>
                    <label className="cursor-pointer">
                        <input hidden type="file" accept=".jpg,.png,.pdf" onChange={handlePrescriptionUpload} />
                        <div className="inline-flex items-center justify-center h-12 px-8 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 font-bold hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all bg-white/50">
                             Upload Prescription
                        </div>
                    </label>
                </div>
             </motion.div>
        )}

        {/* Upload Loading State */}
        {uploadProcessing && (
             <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-12 text-center border border-white/50 shadow-2xl"
             >
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900">Scanning Prescription...</h3>
                <p className="text-gray-500 font-medium mt-2">Our AI is extracting medication details for you.</p>
             </motion.div>
        )}

        {/* Medicines Grid */}
        {medicines.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {medicines.map((medicine, i) => {
              const status = todayStatus(medicine);
              const progress = getProgress(medicine);
              const reminderTime = (medicine.custom_times && medicine.custom_times[0]) || medicine.reminder_time || "09:00";
              const endDate = medicine.end_date ? new Date(medicine.end_date) : null;
              const daysLeft = endDate && endDate > new Date() ? differenceInDays(endDate, new Date()) : null;
              const isLowStock = medicine.quantity_current != null && medicine.refill_reminder_days != null && medicine.quantity_current <= medicine.refill_reminder_days;

              return (
                <motion.div
                  key={medicine.id ?? medicine._id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -6 }}
                  className="group bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white/40 shadow-xl shadow-gray-200/40 hover:shadow-2xl hover:shadow-gray-200/60 transition-all duration-300 relative overflow-hidden"
                >
                   {/* Card Header */}
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 pr-4">
                         <HoverCard openDelay={200}>
                            <HoverCardTrigger asChild>
                              <h3 className="text-xl font-bold text-gray-900 truncate leading-snug cursor-help underline decoration-dotted decoration-gray-300 underline-offset-4 decoration-2">{medicine.name}</h3>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80 bg-white/95 backdrop-blur-xl border-purple-100 shadow-xl rounded-2xl p-0 overflow-hidden z-50">
                                <MedicineHoverInfo name={medicine.name} />
                            </HoverCardContent>
                         </HoverCard>
                         
                         <div className="flex flex-wrap gap-2 mt-1.5">
                            {medicine.is_critical && (
                                <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    Critical
                                </span>
                            )}
                            {isLowStock && (
                                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    Low Stock
                                </span>
                            )}
                         </div>
                      </div>
                      <div className={`
                         flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center 
                         ${status === 'taken' ? 'bg-green-100 text-green-600' : 
                           status === 'missed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}
                      `}>
                         {status === 'taken' ? <Check className="w-5 h-5" /> : 
                          status === 'missed' ? <X className="w-5 h-5" /> : 
                          <Clock className="w-5 h-5" />}
                      </div>
                   </div>

                   {/* Main Info */}
                   <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <Package className="w-4 h-4 text-teal-500" />
                            <span>{medicine.dosage}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span>{medicine.frequency}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span>Due: {formatTimeForDisplay(reminderTime)}</span>
                        </div>
                        {daysLeft !== null && (
                            <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                                <Calendar className="w-4 h-4 text-purple-500" />
                                <span>{daysLeft} days left</span>
                            </div>
                        )}
                   </div>

                   {/* Progress */}
                   <div className="mb-6">
                       <div className="flex justify-between text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                           <span>Weekly Adherence</span>
                           <span>{progress}%</span>
                       </div>
                       <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div 
                              className={`h-full rounded-full ${progress >= 80 ? 'bg-gradient-to-r from-teal-400 to-teal-500' : progress >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-red-400'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1, delay: 0.2 }}
                          />
                       </div>
                   </div>

                   {/* Actions */}
                   <div className="grid grid-cols-2 gap-2">
                       {status === 'pending' ? (
                           <>
                             <Button 
                                className="bg-green-500 hover:bg-green-600 text-white font-bold h-10 rounded-xl transition-colors border-0"
                                onClick={() => handleMedicineAction(medicine, "taken")}
                             >
                                <Check className="w-4 h-4 mr-1.5" /> Take
                             </Button>
                             <Button 
                                variant="outline"
                                className="border-red-100 text-red-500 hover:bg-red-50 hover:text-red-700 font-bold h-10 rounded-xl"
                                onClick={() => handleMedicineAction(medicine, "missed")}
                             >
                                <X className="w-4 h-4 mr-1.5" /> Skip
                             </Button>
                           </>
                       ) : (
                           <div className="col-span-2 bg-gray-50 rounded-xl py-2 text-center text-sm font-bold text-gray-500 border border-gray-100">
                               Marked as {status}
                           </div>
                       )}
                   </div>
                   
                   <div className="mt-3 text-center">
                       <button 
                         onClick={() => setDetailsMedicine(medicine)}
                         className="text-gray-400 hover:text-teal-600 text-xs font-bold uppercase tracking-widest hover:underline decoration-2 underline-offset-4 transition-all"
                       >
                          View Details & Edit
                       </button>
                   </div>
                </motion.div>
              );
            })}
          </div>
        )} 
      </main>

      {/* Add Medicine Dialog - Styled */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) setAddError(null); }}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-white/20 rounded-3xl shadow-2xl">
          <div className="p-6 bg-gray-50 border-b border-gray-100">
             <DialogHeader>
                <DialogTitle className="text-2xl font-extrabold text-gray-900">Add Medicine</DialogTitle>
                <p className="text-gray-500 font-medium">Add details manually or edit extracted info.</p>
             </DialogHeader>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {addError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 font-medium">
                {addError}
              </div>
            )}
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {newMedicine._extracted && (
                <div className="bg-teal-50 border border-teal-200/50 rounded-2xl p-4 flex gap-3">
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 text-teal-600">
                        <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-teal-900 text-sm">Auto-filled from prescription</p>
                      <p className="text-teal-700 text-xs mt-1 font-medium">
                        Times: {newMedicine._extracted.intakeTimes?.join(", ") || "Custom"} 
                        {newMedicine._extracted.isCritical && " • Critical Medicine"}
                      </p>
                    </div>
                </div>
              )}

              <InputField label="Medicine Name" value={newMedicine.name} onChange={(v) => setNewMedicine({ ...newMedicine, name: v })} placeholder="e.g. Paracetamol" />
              
              <div className="grid grid-cols-2 gap-4">
                  <InputField label="Dosage" value={newMedicine.dosage} onChange={(v) => setNewMedicine({ ...newMedicine, dosage: v })} placeholder="e.g. 500mg" />
                  <InputField label="Duration (days)" type="number" value={newMedicine.duration} onChange={(v) => setNewMedicine({ ...newMedicine, duration: Number(v) })} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Frequency</Label>
                    <Select value={newMedicine.frequency} onValueChange={(v) => setNewMedicine({ ...newMedicine, frequency: v })}>
                      <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:ring-teal-500"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once a day">Once a day</SelectItem>
                        <SelectItem value="twice a day">Twice a day</SelectItem>
                        <SelectItem value="thrice a day">Thrice a day</SelectItem>
                        <SelectItem value="four times a day">Four times a day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <InputField label="Reminder Time" type="time" value={newMedicine.reminder_time} onChange={(v) => setNewMedicine({ ...newMedicine, reminder_time: v })} />
              </div>

              <div className="pt-4">
                  <Button onClick={handleAddMedicine} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 rounded-xl text-base shadow-lg shadow-teal-500/20">
                    Add {newMedicine.name || "Medicine"}
                  </Button>
              </div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog - Styled */}
      <Dialog open={!!detailsMedicine} onOpenChange={(open) => { if (!open) { setDetailsMedicine(null); setEditingMedicine(null); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto w-full max-w-lg p-0 bg-white/95 backdrop-blur-xl border-white/20 rounded-[2rem] shadow-2xl">
           <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <DialogTitle className="text-xl font-extrabold text-gray-900">
                  {editingMedicine ? "Edit Medicine" : "Medicine Details"}
              </DialogTitle>
              {!editingMedicine && detailsMedicine && (
                  <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(detailsMedicine)} className="rounded-full hover:bg-gray-100 text-gray-500">
                          <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteConfirm(detailsMedicine)} className="rounded-full hover:bg-red-50 text-red-500">
                          <Trash2 className="w-4 h-4" />
                      </Button>
                  </div>
              )}
           </div>

          <div className="p-6">
            {detailsMedicine && (
              <div className="space-y-6">
                {editingMedicine?.id === detailsMedicine.id || editingMedicine?._id === detailsMedicine._id ? (
                  /* Edit form */
                  <div className="space-y-4">
                    <InputField label="Name" value={editForm.name} onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} />
                    
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Dosage" value={editForm.dosage} onChange={(v) => setEditForm((f) => ({ ...f, dosage: v }))} />
                        <InputField label="Form" value={editForm.form} onChange={(v) => setEditForm((f) => ({ ...f, form: v }))} placeholder="Tablet, Syrup" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Frequency</Label>
                        <Select value={editForm.frequency} onValueChange={(v) => setEditForm((f) => ({ ...f, frequency: v }))}>
                            <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                            <SelectItem value="once a day">Once a day</SelectItem>
                            <SelectItem value="twice a day">Twice a day</SelectItem>
                            <SelectItem value="thrice a day">Thrice a day</SelectItem>
                            <SelectItem value="four times a day">Four times a day</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                        <InputField label="Time" type="time" value={editForm.custom_times?.[0] || "09:00"} onChange={(v) => setEditForm((f) => ({ ...f, custom_times: [v] }))} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Start Date" type="date" value={editForm.start_date} onChange={(v) => setEditForm((f) => ({ ...f, start_date: v }))} />
                        <InputField label="End Date" type="date" value={editForm.end_date} onChange={(v) => setEditForm((f) => ({ ...f, end_date: v }))} />
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                        <h4 className="text-sm font-bold text-gray-800">Inventory Tracking</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <InputField label="Current Stock" type="number" value={editForm.quantity_current} onChange={(v) => setEditForm((f) => ({ ...f, quantity_current: v }))} />
                            <InputField label="Refill Warning At" type="number" value={editForm.refill_reminder_days} onChange={(v) => setEditForm((f) => ({ ...f, refill_reminder_days: v }))} />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200">
                        <input type="checkbox" id="edit-critical" checked={editForm.is_critical} onChange={(e) => setEditForm((f) => ({ ...f, is_critical: e.target.checked }))} className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                        <Label htmlFor="edit-critical" className="font-medium cursor-pointer flex-1">Mark as Critical Medicine</Label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button onClick={saveEdit} className="flex-1 bg-gray-900 text-white font-bold h-12 rounded-xl">Save Changes</Button>
                        <Button variant="outline" onClick={cancelEdit} className="flex-1 h-12 rounded-xl border-gray-200">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <div className="text-center mb-6">
                         <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-100">
                             <Pill className="w-10 h-10 text-teal-500" />
                         </div>
                         <h2 className="text-2xl font-extrabold text-gray-900">{detailsMedicine.name}</h2>
                         <p className="text-gray-500 font-medium mt-1">{detailsMedicine.dosage} • {detailsMedicine.frequency}</p>
                         
                         <div className="flex justify-center gap-2 mt-3">
                            {detailsMedicine.is_critical && <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-3 py-1 rounded-full">Critical</span>}
                            {detailsMedicine.end_date && new Date(detailsMedicine.end_date) < new Date() && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1 rounded-full">Completed</span>
                            )}
                         </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                         <div>
                             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Time</p>
                             <p className="font-bold text-gray-900 flex items-center gap-2">
                                 <Clock className="w-4 h-4 text-blue-500" />
                                 {(detailsMedicine.custom_times && detailsMedicine.custom_times.length) ? detailsMedicine.custom_times.map(formatTimeForDisplay).join(", ") : (detailsMedicine.reminder_time ? formatTimeForDisplay(detailsMedicine.reminder_time) : "—")}
                             </p>
                         </div>
                         <div>
                             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Duration</p>
                             <p className="font-bold text-gray-900">
                                 {detailsMedicine.end_date ? differenceInDays(new Date(detailsMedicine.end_date), new Date(detailsMedicine.start_date || new Date())) : "?"} days
                             </p>
                         </div>
                         {detailsMedicine.quantity_current != null && (
                            <div className="col-span-2 border-t border-gray-200 pt-3 mt-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Stock Level
                                    </span>
                                    <span className={`font-bold ${detailsMedicine.quantity_current <= (detailsMedicine.refill_reminder_days || 5) ? 'text-amber-600' : 'text-gray-900'}`}>
                                        {detailsMedicine.quantity_current} / {detailsMedicine.quantity_unit || "left"}
                                    </span>
                                </div>
                            </div>
                         )}
                    </div>

                    {/* Weekly Calendar */}
                    <div>
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Last 7 Days</Label>
                      <div className="flex justify-between gap-1">
                        {[6, 5, 4, 3, 2, 1, 0].map((i) => {
                          const d = subDays(new Date(), i);
                          const dateStr = format(d, "yyyy-MM-dd");
                          const dayStatus = (detailsMedicine.daily_status || {})[dateStr];
                          const isToday = i === 0;
                          return (
                            <div key={dateStr} className={`flex flex-col items-center gap-1 ${isToday ? 'opacity-100' : 'opacity-70'}`}>
                              <span className="text-[10px] uppercase font-bold text-gray-400">{format(d, "EEE")}</span>
                              <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border
                                ${dayStatus === "taken" ? 'bg-green-100 border-green-200 text-green-600' : 
                                  dayStatus === "missed" ? 'bg-red-50 border-red-100 text-red-500' : 
                                  'bg-gray-50 border-gray-100 text-gray-300'}
                                ${isToday && 'ring-2 ring-offset-2 ring-teal-500'}
                              `}>
                                 {dayStatus === "taken" ? "✓" : dayStatus === "missed" ? "✕" : "•"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                          <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-purple-600" />
                            AI Insights
                          </Label>
                          {!aiInfo && !loadingAiInfo && (
                              <Button size="sm" variant="ghost" onClick={fetchMedicineInfo} className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 h-8 px-3 text-xs font-bold rounded-lg border border-purple-100">
                                  Load Info
                              </Button>
                          )}
                      </div>
                      
                      {loadingAiInfo && (
                          <div className="flex items-center gap-2 text-gray-500 text-sm p-4 bg-gray-50 rounded-xl justify-center">
                              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                              <span className="font-medium animate-pulse">Gemini is analyzing this medicine...</span>
                          </div>
                      )}

                      {aiInfo && (
                          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100 space-y-4 text-sm">
                              <div>
                                <span className="font-bold text-purple-900 block mb-1">Common Uses</span>
                                <div className="text-purple-800/80 leading-relaxed">
                                  {Array.isArray(aiInfo.uses) ? aiInfo.uses.join(", ") : aiInfo.uses}
                                </div>
                              </div>
                              {aiInfo.side_effects && (
                                  <div>
                                    <span className="font-bold text-purple-900 block mb-1">Side Effects</span>
                                    <p className="text-purple-800/80 leading-relaxed">
                                      {Array.isArray(aiInfo.side_effects) ? aiInfo.side_effects.join(", ") : aiInfo.side_effects}
                                    </p>
                                  </div>
                              )}
                              {aiInfo.warnings && (
                                  <div>
                                    <span className="font-bold text-red-800 block mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Warnings</span>
                                    <p className="text-red-700/80 leading-relaxed font-medium text-xs bg-red-50 p-2 rounded-lg border border-red-100">
                                      {Array.isArray(aiInfo.warnings) ? aiInfo.warnings.join(". ") : aiInfo.warnings}
                                    </p>
                                  </div>
                              )}
                              {aiInfo.dietary_restrictions && (
                                  <div>
                                     <span className="font-bold text-amber-800 block mb-1">Dietary Note</span>
                                     <p className="text-amber-800/80 text-xs leading-relaxed">{aiInfo.dietary_restrictions}</p>
                                  </div>
                              )}
                          </motion.div>
                      )}
                    </div>

                    {/* Status Actions */}
                    <div className="pt-4 border-t border-gray-100">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block center text-center">Update Today&apos;s Status</Label>
                        <div className="flex gap-3 justify-center">
                           <Button 
                              onClick={() => {
                                handleMedicineAction(detailsMedicine, "taken");
                                setDetailsMedicine((m) => m ? { ...m, daily_status: { ...(m.daily_status || {}), [format(new Date(), "yyyy-MM-dd")]: "taken" } } : null);
                              }}
                              className="bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex-1"
                           >
                              Taken
                           </Button>
                           <Button 
                              onClick={() => {
                                handleMedicineAction(detailsMedicine, "missed");
                                setDetailsMedicine((m) => m ? { ...m, daily_status: { ...(m.daily_status || {}), [format(new Date(), "yyyy-MM-dd")]: "missed" } } : null);
                              }}
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold flex-1"
                           >
                              Skipped
                           </Button>
                        </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-white rounded-3xl p-8 border-0 shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-gray-900">Delete Medicine?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 mt-2 font-medium">
              {medicineToDelete && (
                <>Are you sure you want to delete <span className="text-gray-900 font-bold">&quot;{medicineToDelete.name}&quot;</span>? This cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel onClick={() => setMedicineToDelete(null)} className="flex-1 rounded-xl border-gray-200 font-bold h-11 mt-0">Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white flex-1 rounded-xl font-bold h-11"
              onClick={handleDeleteMedicine}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EmergencyButton profile={profile} />
    </div>
  );
}

/* ------------------ HELPERS ------------------ */

const getNextReminder = (meds) => {
  if (!meds || !meds.length) return '—';
  const today = format(new Date(), 'yyyy-MM-dd');
  for (const m of meds) {
    if (m.daily_status?.[today] === 'pending') return `${m.reminder_time || '09:00'}`;
  }
  for (const m of meds) {
    const keys = Object.keys(m.daily_status || {});
    // This logic is a bit simple, ideally we sort reminders properly
    return `${m.reminder_time || '09:00'}`;
  }
  return 'All Done';
};

function InputField({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</Label>
      <Input 
        value={value} 
        type={type} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-teal-100 transition-all font-medium"
      />
    </div>
  );
}

function MedicineHoverInfo({ name }) {
  const { data: aiInfo, isLoading, error } = useQuery({
     queryKey: ["medicine-info", name],
     queryFn: async () => {
        const { data } = await api.post("/medicines/info", { name });
        return data;
     },
     staleTime: 1000 * 60 * 60 * 24, // 24 hours
     retry: false,
     enabled: !!name
  });

  if (isLoading) {
      return (
          <div className="flex items-center justify-center p-6 gap-3 text-purple-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-bold">Asking Gemini...</span>
          </div>
      )
  }

  if (error) {
    const isRateLimit = error.response?.status === 429 || error.message?.includes("429") || error.message?.includes("Quota");
    return (
      <div className="p-4 text-xs text-center">
          {isRateLimit ? (
            <div className="text-amber-600 font-medium">
                <p className="font-bold mb-1">Daily AI Limit Reached</p>
                <p>Please try again later or upgrade plan.</p>
            </div>
          ) : (
            <div className="text-red-500 font-bold">
                <p>Could not load info</p>
                <p className="mt-1 opacity-70 font-normal">{error.response?.data?.detail || error.message || "Unknown error"}</p>
            </div>
          )}
      </div>
    )
  }

  if (!aiInfo) return null;

  return (
      <div className="bg-gradient-to-br from-white to-purple-50/30">
        <div className="bg-purple-100/50 p-3 border-b border-purple-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-purple-700">
                 <Package className="w-3 h-3" />
            </div>
            <span className="text-sm font-extrabold text-purple-900">AI Medical Insights</span>
        </div>
        <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
             <div>
                <span className="text-[10px] font-bold text-purple-900/60 uppercase tracking-widest block mb-1">Common Uses</span>
                 <p className="text-xs text-gray-700 leading-relaxed font-medium">
                   {Array.isArray(aiInfo.uses) ? aiInfo.uses.join(", ") : aiInfo.uses}
                 </p>
             </div>
             
             {aiInfo.side_effects && (
                 <div>
                    <span className="text-[10px] font-bold text-purple-900/60 uppercase tracking-widest block mb-1">Side Effects</span>
                     <p className="text-xs text-gray-600 leading-relaxed">
                       {Array.isArray(aiInfo.side_effects) ? aiInfo.side_effects.join(", ") : aiInfo.side_effects}
                     </p>
                 </div>
             )}

             {aiInfo.warnings && (
                 <div className="bg-red-50 p-2.5 rounded-lg border border-red-100">
                    <span className="text-[10px] font-bold text-red-800 uppercase tracking-widest block mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3"/> Warnings
                    </span>
                     <p className="text-xs text-red-700 leading-relaxed font-medium">
                       {Array.isArray(aiInfo.warnings) ? aiInfo.warnings.join(". ") : aiInfo.warnings}
                     </p>
                 </div>
             )}
             
             {aiInfo.dietary_restrictions && (
                 <div>
                     <span className="text-[10px] font-bold text-amber-800/60 uppercase tracking-widest block mb-1">Dietary Notes</span>
                     <p className="text-xs text-amber-800 leading-relaxed font-medium bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                        {aiInfo.dietary_restrictions}
                    </p>
                 </div>
             )}
        </div>
      </div>
  )
}