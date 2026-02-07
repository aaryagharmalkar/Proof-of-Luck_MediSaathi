import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/apiClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import AvatarSelector from "@/components/ui/AvatarSelector";
import OnboardingProgress from "@/components/OnboardingProgress";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ChevronRight,
  User,
  Heart,
  Upload,
  FileText,
  Stethoscope,
  Phone,
  Loader2,
  MapPin,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

const TOTAL_STEPS = 6;

export default function Onboarding() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [currentStep, setCurrentStep] = useState(1);
  const [uploadState, setUploadState] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "male",
    location: "",
    latitude: null,
    longitude: null,
    avatar_id: "male-1",
    primary_doctor: "",
    hospital: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    health_questionnaire: {
      fatigue_level: "",
      chronic_conditions: "",
    },
  });

  const updateFormData = (path, value) => {
    if (path.includes(".")) {
      const [parent, child] = path.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [path]: value }));
    }
  };

  /* ------------------ LOCATION AUTOCOMPLETE ------------------ */

  const searchLocationSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=8&countrycodes=in`
      );
      const data = await response.json();

      const suggestions = data.map((item) => ({
        name: item.name,
        address: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));

      setLocationSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Location search failed:", err);
      setLocationSuggestions([]);
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleLocationInputChange = (value) => {
    updateFormData("location", value);
    setLocationSuccess(false);
    setLocationError(null);
    searchLocationSuggestions(value);
  };

  const selectLocationSuggestion = (suggestion) => {
    updateFormData("location", suggestion.address);
    updateFormData("latitude", suggestion.lat);
    updateFormData("longitude", suggestion.lon);
    setLocationSuccess(true);
    setShowSuggestions(false);
    setLocationSuggestions([]);
    setLocationError(null);
  };

  /* ------------------ GEOLOCATION WITH BETTER ACCURACY ------------------ */

  const requestLocationPermission = async () => {
    setLocationLoading(true);
    setLocationError(null);
    setLocationSuccess(false);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        console.log(`📍 Location detected with accuracy: ${accuracy}m`);

        updateFormData("latitude", latitude);
        updateFormData("longitude", longitude);

        try {
          // High accuracy reverse geocoding using Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=15&addressdetails=1`
          );
          const data = await response.json();

          // Prioritize city/town/village, fallback to formatted address
          let locationName =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            data.display_name?.split(",")[0] ||
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          updateFormData("location", locationName);
          setLocationSuccess(true);
          setLocationError(null);
          setShowSuggestions(false);
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
          // Fallback to coordinates
          updateFormData(
            "location",
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          );
          setLocationSuccess(true);
        }
        setLocationLoading(false);
      },
      (error) => {
        let message = "Unable to get your location";
        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Location permission denied. Please enable it in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out. Please try again.";
        }
        setLocationError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.name && formData.age && formData.location;
    }
    return true;
  };

  /* ------------------ SAVE ONBOARDING STEP TO DATABASE ------------------ */

  const saveStepToDatabase = async (stepNumber) => {
    try {
      console.log(`📝 Saving step ${stepNumber}...`);

      let stepData = {};
      if (stepNumber === 1) {
        stepData = {
          name: formData.name,
          age: formData.age,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
        };
      } else if (stepNumber === 2) {
        stepData = { avatar_id: formData.avatar_id };
      } else if (stepNumber === 3) {
        stepData = { extracted_data: extractedData };
      } else if (stepNumber === 4) {
        stepData = {
          gender: formData.gender,
          health_questionnaire: formData.health_questionnaire,
        };
      } else if (stepNumber === 5) {
        stepData = {
          primary_doctor: formData.primary_doctor,
          hospital: formData.hospital,
        };
      } else if (stepNumber === 6) {
        stepData = {
          emergency_contact: {
            name: formData.emergency_contact_name,
            phone: formData.emergency_contact_phone,
          },
        };
      }

      const result = await api.post("/auth/onboarding-step", {
        step: stepNumber,
        data: stepData,
      });

      console.log(`✅ Step ${stepNumber} saved to database!`, result.data);
      return true;
    } catch (err) {
      console.error(
        `❌ Failed to save step ${stepNumber}:`,
        err.response?.data || err.message
      );
      return false;
    }
  };

  /* ------------------ MOCK FILE PROCESS ------------------ */

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const handleFileUpload = async (file) => {
    setUploadState("processing");
    await delay(1500);
    setExtractedData({
      hemoglobin: "9 g/dL (Low)",
      glucose: "120 mg/dL (Normal)",
    });
    setUploadState("done");
  };

  /* ------------------ UI ------------------ */

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted text-foreground flex items-center py-12">
      <div className="w-full">
        {/* ✅ PROGRESS BAR – PAGE LEVEL */}
        <OnboardingProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        <div className="w-full max-w-2xl mx-auto px-4">
          <motion.div
            className="bg-card rounded-3xl border border-border shadow-lg overflow-hidden backdrop-blur-sm"
            initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* CONTENT */}
            <div className="px-6 py-8 md:px-10 md:py-12">
              <div className="max-w-lg mx-auto min-h-[420px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <Step title="Personal Details" icon={User} description="Let's get to know you">
                      <div className="space-y-5">
                        <InputField
                          label="Full Name"
                          value={formData.name}
                          onChange={(v) => updateFormData("name", v)}
                          placeholder="Enter your full name"
                        />

                        <InputField
                          label="Age"
                          type="number"
                          value={formData.age}
                          onChange={(v) => updateFormData("age", v)}
                          placeholder="Enter your age"
                          min="1"
                          max="150"
                        />

                        {/* LOCATION WITH AUTOCOMPLETE */}
                        <div className="space-y-2 relative">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Location</Label>
                            <button
                              type="button"
                              onClick={requestLocationPermission}
                              disabled={locationLoading}
                              className="text-xs text-primary hover:text-primary/80 font-medium transition flex items-center gap-1"
                            >
                              {locationLoading ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Detecting…
                                </>
                              ) : (
                                <>
                                  <MapPin className="w-3 h-3" />
                                  Auto Detect
                                </>
                              )}
                            </button>
                          </div>

                          <div className="relative">
                            <Input
                              value={formData.location}
                              onChange={(e) => handleLocationInputChange(e.target.value)}
                              onFocus={() => {
                                if (locationSuggestions.length > 0) {
                                  setShowSuggestions(true);
                                }
                              }}
                              placeholder="Type a location or use auto-detect"
                              className="rounded-xl pr-8"
                            />
                            {formData.location && !locationSuccess && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateFormData("location", "");
                                  setLocationSuggestions([]);
                                  setShowSuggestions(false);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* SUGGESTIONS DROPDOWN */}
                          {showSuggestions && locationSuggestions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
                            >
                              {locationSuggestions.map((suggestion, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => selectLocationSuggestion(suggestion)}
                                  className="w-full text-left px-4 py-3 hover:bg-muted transition border-b border-border last:border-b-0"
                                >
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {suggestion.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {suggestion.address}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {searchingLocation && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Searching locations…
                            </div>
                          )}

                          {locationSuccess && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-green-700 dark:text-green-300">
                                Location confirmed
                              </p>
                            </motion.div>
                          )}

                          {locationError && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg"
                            >
                              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-red-700 dark:text-red-300">
                                {locationError}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </Step>
                  )}

                  {currentStep === 2 && (
                    <Step title="Choose Avatar" icon={User} description="Pick your profile picture">
                      <AvatarSelector
                        selectedId={formData.avatar_id}
                        onSelect={(id) => updateFormData("avatar_id", id)}
                      />
                    </Step>
                  )}

                  {currentStep === 3 && (
                    <Step title="Upload Medical Report" icon={FileText} description="Add your medical history (optional)">
                      {!uploadState && (
                        <label className="cursor-pointer block">
                          <input
                            hidden
                            type="file"
                            onChange={(e) => handleFileUpload(e.target.files[0])}
                          />
                          <div className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center hover:border-primary hover:bg-primary/5 transition">
                            <Upload className="mx-auto w-12 h-12 text-primary/60 mb-3" />
                            <p className="text-sm font-semibold text-foreground">
                              Click to upload
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PDF, PNG, or JPG (Max 10MB)
                            </p>
                          </div>
                        </label>
                      )}

                      {uploadState === "processing" && (
                        <div className="text-center py-8">
                          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                            <Loader2 className="animate-spin text-primary w-6 h-6" />
                          </div>
                          <p className="text-sm font-medium">Processing your report…</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            This may take a moment
                          </p>
                        </div>
                      )}

                      {uploadState === "done" && (
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <p className="text-sm font-semibold">Data extracted</p>
                          </div>
                          {Object.entries(extractedData).map(([k, v]) => (
                            <div
                              key={k}
                              className="flex justify-between text-sm p-2 bg-background rounded-lg"
                            >
                              <span className="capitalize text-muted-foreground">
                                {k.replace(/_/g, " ")}
                              </span>
                              <span className="font-semibold text-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Step>
                  )}

                  {currentStep === 4 && (
                    <Step title="Health Overview" icon={Heart} description="Tell us about your health">
                      <div className="space-y-6">
                        <div>
                          <Label className="text-sm font-semibold mb-3 block">
                            How's your energy level?
                          </Label>
                          <RadioGroup
                            value={formData.health_questionnaire.fatigue_level}
                            onValueChange={(v) =>
                              updateFormData("health_questionnaire.fatigue_level", v)
                            }
                          >
                            {["high", "moderate", "low"].map((lvl) => (
                              <div
                                key={lvl}
                                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition"
                              >
                                <RadioGroupItem value={lvl} id={lvl} />
                                <Label
                                  htmlFor={lvl}
                                  className="capitalize cursor-pointer text-sm font-medium"
                                >
                                  {lvl === "high"
                                    ? "High - Feeling energetic"
                                    : lvl === "moderate"
                                    ? "Moderate - Normal"
                                    : "Low - Feeling tired"}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>

                        <div>
                          <Label className="text-sm font-semibold mb-2 block">
                            Any chronic conditions?
                          </Label>
                          <Textarea
                            value={formData.health_questionnaire.chronic_conditions}
                            onChange={(e) =>
                              updateFormData(
                                "health_questionnaire.chronic_conditions",
                                e.target.value
                              )
                            }
                            placeholder="e.g., Diabetes, Hypertension, etc. (optional)"
                            className="rounded-xl resize-none"
                          />
                        </div>
                      </div>
                    </Step>
                  )}

                  {currentStep === 5 && (
                    <Step title="Healthcare Provider" icon={Stethoscope} description="Who's your primary doctor?">
                      <div className="space-y-5">
                        <InputField
                          label="Primary Doctor Name"
                          value={formData.primary_doctor}
                          onChange={(v) => updateFormData("primary_doctor", v)}
                          placeholder="Enter your doctor's name"
                        />
                        <InputField
                          label="Hospital / Clinic"
                          value={formData.hospital}
                          onChange={(v) => updateFormData("hospital", v)}
                          placeholder="Enter hospital or clinic name"
                        />
                      </div>
                    </Step>
                  )}

                  {currentStep === 6 && (
                    <Step title="Emergency Contact" icon={Phone} description="We'll use this in emergencies">
                      <div className="space-y-5">
                        <InputField
                          label="Contact Name"
                          value={formData.emergency_contact_name}
                          onChange={(v) => updateFormData("emergency_contact_name", v)}
                          placeholder="Full name of contact"
                        />
                        <InputField
                          label="Phone Number"
                          value={formData.emergency_contact_phone}
                          onChange={(v) => updateFormData("emergency_contact_phone", v)}
                          placeholder="Phone number with country code"
                        />
                      </div>
                    </Step>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 md:px-10 border-t border-border bg-card/50">
              <div className="flex gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                  disabled={currentStep === 1 || isSubmitting}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground font-semibold rounded-xl"
                  disabled={!canProceed() || isSubmitting}
                  onClick={async () => {
                    if (currentStep < TOTAL_STEPS) {
                      const saved = await saveStepToDatabase(currentStep);
                      if (saved) {
                        console.log(
                          `✨ Step ${currentStep} saved! Moving to step ${currentStep + 1}...`
                        );
                        setCurrentStep((s) => s + 1);
                      } else {
                        console.warn(
                          `⚠️ Step ${currentStep} failed to save. You can still continue.`
                        );
                        setCurrentStep((s) => s + 1);
                      }
                    } else {
                      setIsSubmitting(true);
                      try {
                        const lastSaved = await saveStepToDatabase(currentStep);
                        console.log("Calling /auth/complete-onboarding endpoint...");
                        const result = await api.post("/auth/complete-onboarding");
                        console.log("✅ Onboarding completed:", result);
                        navigate("/profiles");
                      } catch (err) {
                        console.error("❌ Failed to complete onboarding:", err);
                        navigate("/profiles");
                      } finally {
                        setIsSubmitting(false);
                      }
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finishing…
                    </>
                  ) : currentStep === TOTAL_STEPS ? (
                    <>Complete</>
                  ) : (
                    <>
                      Next <ChevronRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ------------------ HELPERS ------------------ */

function Step({ title, icon: Icon, description, children }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? {} : { opacity: 0, x: 20 }}
      animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
      exit={reduceMotion ? {} : { opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-7"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </motion.div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  ...props
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl h-11"
        {...props}
      />
    </div>
  );
}
