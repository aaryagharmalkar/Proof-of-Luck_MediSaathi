import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIME_OPTIONS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
];

export default function DoctorOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    license_number: "",
    specialization: "",
    fees_inr: 500,
    bio: "",
    availability: DAYS.map((d) => ({ day_of_week: d.value, start_time: "09:00", end_time: "17:00", enabled: false })),
  });

  const update = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setError("");
  };

  const updateAvailability = (dayIndex, field, value) => {
    setForm((p) => ({
      ...p,
      availability: p.availability.map((a, i) =>
        i === dayIndex ? { ...a, [field]: value } : a
      ),
    }));
  };

  const handleVerifyLicense = async () => {
    if (!form.license_number.trim()) {
      setError("Enter license number first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/doctors/verify-license", { license_number: form.license_number.trim() });
      setStep(3);
    } catch (e) {
      setError(e.response?.data?.detail || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && (!form.full_name.trim() || !form.license_number.trim())) {
      setError("Name and license number are required.");
      return;
    }
    if (step === 1) setStep(2);
    else if (step === 2) handleVerifyLicense();
    else if (step === 3) setStep(4);
    else if (step === 4) setStep(5);
  };

  const handleComplete = async () => {
    setLoading(true);
    setError("");
    try {
      await api.patch("/doctors/me", {
        full_name: form.full_name,
        license_number: form.license_number,
        specialization: form.specialization,
        fees_inr: form.fees_inr,
        bio: form.bio,
      });
      const slots = form.availability
        .filter((a) => a.enabled)
        .map((a) => ({
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time,
        }));
      if (slots.length) {
        await api.put("/doctors/me/availability", { slots });
      }
      await api.post("/doctors/me/complete-onboarding");
      navigate("/doctor-dashboard");
    } catch (e) {
      setError(e.response?.data?.detail || "Could not save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/40 to-white flex flex-col items-center py-12 px-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
          <Heart className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-xl text-gray-900">MediSaathi Doctor</span>
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 text-white flex justify-between items-center">
          <span className="font-medium">Setup your profile</span>
          <span className="text-sm opacity-90">Step {step} of 5</span>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-gray-900">Your details & license</h2>
                <div>
                  <Label>Full name *</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => update("full_name", e.target.value)}
                    placeholder="Dr. Full Name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Medical license number *</Label>
                  <Input
                    value={form.license_number}
                    onChange={(e) => update("license_number", e.target.value)}
                    placeholder="e.g. MCI-12345 or NMC-XXXXX"
                    className="mt-1"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-gray-900">Verify license</h2>
                <p className="text-sm text-gray-600">
                  We'll validate your license (mock verification). In production this would use the national medical register.
                </p>
                <div className="bg-teal-50 rounded-lg p-4">
                  <p className="font-medium text-gray-800">{form.license_number || "—"}</p>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button onClick={handleVerifyLicense} disabled={loading} className="w-full bg-teal-500">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify license"}
                </Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-gray-900">Practice details</h2>
                <div>
                  <Label>Specialization</Label>
                  <Input
                    value={form.specialization}
                    onChange={(e) => update("specialization", e.target.value)}
                    placeholder="e.g. General Physician, ENT"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Consultation fee (₹)</Label>
                  <Input
                    type="number"
                    value={form.fees_inr}
                    onChange={(e) => update("fees_inr", parseInt(e.target.value, 10) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Short bio (optional)</Label>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => update("bio", e.target.value)}
                    placeholder="Brief intro for patients"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="s4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-gray-900">Weekly availability</h2>
                <p className="text-sm text-gray-600">When can patients book you? (Slots will be generated from these hours.)</p>
                {form.availability.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={a.enabled}
                        onChange={(e) => updateAvailability(i, "enabled", e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="w-24 text-sm">{DAYS.find((d) => d.value === a.day_of_week)?.label}</span>
                    </label>
                    {a.enabled && (
                      <>
                        <select
                          value={a.start_time}
                          onChange={(e) => updateAvailability(i, "start_time", e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <span className="text-gray-500">to</span>
                        <select
                          value={a.end_time}
                          onChange={(e) => updateAvailability(i, "end_time", e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="s5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 text-center"
              >
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-teal-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">You're all set</h2>
                <p className="text-sm text-gray-600">Complete to start receiving appointments.</p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button onClick={handleComplete} disabled={loading} className="w-full bg-teal-500">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete setup"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            {step < 5 && step !== 2 && (
              <Button onClick={handleNext} className="bg-teal-500">
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate("/login")}
        className="mt-6 text-sm text-gray-500 hover:text-teal-600"
      >
        ← Back to patient login
      </button>
    </div>
  );
}
