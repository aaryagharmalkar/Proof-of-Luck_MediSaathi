import React, { useState, useEffect } from "react";
import api from "@/api/apiClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";

import { format, addDays } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Your prescription extraction API endpoint
const PRESCRIPTION_API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5050/api/v1"}/medicines/extract-file`;

console.log("🔗 PRESCRIPTION_API_URL:", PRESCRIPTION_API_URL);

export default function Medicines() {
  const [profile, setProfile] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [extractedMedicines, setExtractedMedicines] = useState([]);
  const [uploadError, setUploadError] = useState(null);

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

  const loadData = async () => {
    try {
      const { data: user } = await api.get("/users/me");
      setProfile(user.profile);

      const { data: meds } = await api.get("/medicines");
      setMedicines(meds || []);
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

    console.log("📤 Uploading prescription to:", PRESCRIPTION_API_URL);
    const response = await fetch(PRESCRIPTION_API_URL, {
      method: 'POST',
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
    try {
      const startDate = new Date();
      const endDate = addDays(startDate, newMedicine.duration);

      const daily_status = {};
      for (let i = 0; i < newMedicine.duration; i++) {
        daily_status[format(addDays(startDate, i), "yyyy-MM-dd")] = "pending";
      }

      await api.post("/medicines", {
        ...newMedicine,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        daily_status,
        active: true,
      });

      resetDialog();
      loadData();
    } catch (err) {
      console.error("Add medicine failed:", err);
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

        await api.post("/medicines", {
          ...medData,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          daily_status,
          active: true,
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
    try {
      const today = format(new Date(), "yyyy-MM-dd");

      await api.patch(`/medicines/${medicine._id}`, {
        daily_status: {
          ...medicine.daily_status,
          [today]: action,
        },
      });

      loadData();
    } catch (err) {
      console.error("Medicine update failed:", err);
    }
  };

  /* ------------------ HELPERS ------------------ */

  const resetDialog = () => {
    setShowAddDialog(false);
    setExtractedMedicines([]);
    setUploadError(null);
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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="text-2xl font-bold">Medicines</motion.h1>
            <p className="text-sm text-gray-500 mt-1">Track prescriptions and reminders</p>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow">
                <Pill className="w-4 h-4 text-teal-600" />
                <span className="text-gray-700 font-medium">{medicines.length} active</span>
              </div>
              {medicines.length > 0 && (
                <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Next reminder: <span className="font-medium">{getNextReminder(medicines)}</span></span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input 
                hidden 
                type="file" 
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handlePrescriptionUpload} 
              />
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-200 bg-white text-sm">
                <Upload className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">Upload prescription</span>
              </motion.div>
            </label>
            <Button onClick={() => setShowAddDialog(true)} className="bg-teal-500">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </header>

        {/* Upload / Extract Preview */}
        <div>
          {uploadError && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Upload Error</p>
                  <p className="text-sm text-red-600 mt-1">{uploadError}</p>
                </div>
                <button onClick={() => setUploadError(null)} className="ml-auto">
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          )}

          {extractedMedicines.length > 0 ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500">Extracted {extractedMedicines.length} medicine(s)</p>
                  <h4 className="font-medium text-gray-900">Ready to import</h4>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-teal-500" onClick={handleAddAllExtracted}>
                    <Plus className="w-4 h-4 mr-1" /> Import All
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExtractedMedicines([])}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {extractedMedicines.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{med.name}</p>
                      <p className="text-xs text-gray-500">
                        {med.type} • {med.doseCount} {med.type === 'syrup' ? 'ml' : 'dose(s)'} • {med.frequency} • {med.durationDays} days
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
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
          ) : (
            <label className="cursor-pointer block">
              <input 
                hidden 
                type="file" 
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handlePrescriptionUpload} 
              />
              <motion.div whileHover={{ scale: 1.02 }} className="border-dashed border-2 rounded-lg p-6 text-center bg-white border-gray-100">
                {uploadProcessing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                    <p className="text-sm text-gray-600">Analyzing prescription...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-2 text-gray-600 w-6 h-6" />
                    <div className="text-sm text-gray-600">Upload prescription to auto-extract</div>
                    <div className="text-xs text-gray-400 mt-1">Supports JPG, PNG, PDF (max 10MB)</div>
                  </>
                )}
              </motion.div>
            </label>
          )}
        </div>

        {/* List */}
        {medicines.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-6 border text-center">
            <Pill className="mx-auto mb-2 text-teal-500 w-6 h-6" />
            <h4 className="font-medium">No medicines yet</h4>
            <p className="text-sm text-gray-500 mb-4">Add prescriptions or upload a prescription to get started</p>
            <div className="flex justify-center">
              <Button onClick={() => setShowAddDialog(true)} className="bg-teal-500">
                <Plus className="w-4 h-4 mr-2" /> Add Medicine
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medicines.map((medicine) => {
              const status = todayStatus(medicine);
              const progress = getProgress(medicine);

              return (
                <motion.div
                  key={medicine._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(2,6,23,0.08)' }}
                  transition={{ duration: 0.35 }}
                  className="bg-white p-4 rounded-xl border"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{medicine.name}</h4>
                      <p className="text-sm text-gray-500">{medicine.dosage} • {medicine.frequency}</p>
                      <p className="text-xs text-gray-400 mt-1">Ends {medicine.end_date ? format(new Date(medicine.end_date),'MMM d') : '—'} • {medicine.reminder_time || '—'}</p>
                    </div>
                    <div className="text-right">
                      <div className={cn("text-sm font-semibold rounded-full px-2 py-1", status === 'taken' ? 'bg-green-100 text-green-600' : status==='missed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700')}>
                        {status}
                      </div>
                      <div className="mt-3 text-xs text-gray-500">{progress}%</div>
                    </div>
                  </div>

                  <div className="mt-3 h-2 bg-gray-100 rounded overflow-hidden">
                    <motion.div
                      className="h-full bg-teal-500 rounded"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>

                  <div className="flex gap-2 mt-4">
                    {status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-green-500" onClick={() => handleMedicineAction(medicine,'taken')}><Check className="w-4 h-4 mr-1" /> Taken</Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleMedicineAction(medicine,'missed')}><X className="w-4 h-4 mr-1" /> Missed</Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost">Details</Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )} 
      </main>

      {/* Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Medicine</DialogTitle>
          </DialogHeader>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-3">
          {newMedicine._extracted && (
            <div className="bg-teal-50 border border-teal-200 rounded-md p-3 text-sm">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-teal-600 mt-0.5" />
                <div>
                  <p className="font-medium text-teal-900">Auto-extracted from prescription</p>
                  <p className="text-teal-700 text-xs mt-1">
                    {newMedicine._extracted.intakeTimes?.join(", ")} • {newMedicine._extracted.isCritical && "⚠️ Critical"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <InputField label="Name" value={newMedicine.name} onChange={(v) => setNewMedicine({ ...newMedicine, name: v })} />
          <InputField label="Dosage" value={newMedicine.dosage} onChange={(v) => setNewMedicine({ ...newMedicine, dosage: v })} />
          
          <div>
            <Label>Frequency</Label>
            <Select value={newMedicine.frequency} onValueChange={(v) => setNewMedicine({ ...newMedicine, frequency: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once a day">Once a day</SelectItem>
                <SelectItem value="twice a day">Twice a day</SelectItem>
                <SelectItem value="thrice a day">Thrice a day</SelectItem>
                <SelectItem value="four times a day">Four times a day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <InputField label="Duration (days)" type="number" value={newMedicine.duration} onChange={(v) => setNewMedicine({ ...newMedicine, duration: Number(v) })} />
          <InputField label="Reminder Time" type="time" value={newMedicine.reminder_time} onChange={(v) => setNewMedicine({ ...newMedicine, reminder_time: v })} />

          <Button onClick={handleAddMedicine} className="w-full bg-teal-500">
            <Plus className="w-4 h-4 mr-2" /> Add Medicine
          </Button>
        </motion.div>
        </DialogContent>
      </Dialog>

      <EmergencyButton profile={profile} />
    </div>
  );
}

/* ------------------ HELPERS ------------------ */

const getNextReminder = (meds) => {
  if (!meds || !meds.length) return '—';
  const today = format(new Date(), 'yyyy-MM-dd');
  for (const m of meds) {
    if (m.daily_status?.[today] === 'pending') return `${m.reminder_time || '09:00'} today`;
  }
  for (const m of meds) {
    const keys = Object.keys(m.daily_status || {});
    const pending = keys.find(k => (m.daily_status?.[k] || '') === 'pending');
    if (pending) return `${format(new Date(pending), 'MMM d')} ${m.reminder_time || ''}`;
  }
  return '—';
};

function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} type={type} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}