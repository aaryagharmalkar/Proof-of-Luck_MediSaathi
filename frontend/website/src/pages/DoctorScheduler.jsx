import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, MapPin, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import api from '@/api/apiClient';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';



const severityQuestions = [
  { id: 1, question: 'How long have you been experiencing this?', options: ['Just started', 'Few days', 'More than a week', 'Chronic'] },
  { id: 2, question: 'How would you rate the pain/discomfort?', options: ['Mild', 'Moderate', 'Severe', 'Very Severe'] },
];

const getDoctorsForSymptoms = (symptoms, location) => {
  const s = symptoms.toLowerCase();

  if (s.includes('ear') || s.includes('nose') || s.includes('throat')) {
    return [
      { id: 1, name: 'Dr. Priya Sharma', specialty: 'ENT Specialist', fees: 500, rating: 4.8, experience: '15 years', location },
      { id: 2, name: 'Dr. Rajesh Kumar', specialty: 'ENT Surgeon', fees: 700, rating: 4.9, experience: '20 years', location },
    ];
  }

  return [
    { id: 3, name: 'Dr. Amit Patel', specialty: 'General Physician', fees: 400, rating: 4.7, experience: '10 years', location },
    { id: 4, name: 'Dr. Sunita Reddy', specialty: 'General Physician', fees: 350, rating: 4.6, experience: '8 years', location },
  ];
};

const getInitials = (name = '') => {
  return name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export default function DoctorScheduler() {
  const [slots, setSlots] = useState([]);
  const navigate = useNavigate();
  const [step, setStep] = useState('symptoms');
  const [symptoms, setSymptoms] = useState('');
  const [severityAnswers, setSeverityAnswers] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1)); // February 2026
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(14);
  const [selectedTime, setSelectedTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateSelect = (day) => {
    setSelectedDay(day);
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    setSelectedTime(null);
  };

  const handleQuickSelect = (type) => {
    const today = new Date();
    if (type === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDay(tomorrow.getDate());
      setSelectedDate(tomorrow);
    } else if (type === 'next7days') {
      const next7 = new Date(today);
      next7.setDate(next7.getDate() + 7);
      setSelectedDay(next7.getDate());
      setSelectedDate(next7);
    }
  };

  const handleSeverityComplete = () => {
    setDoctors(getDoctorsForSymptoms(symptoms, 'Your City'));
    setStep('doctors');
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsLoading(true);
    try {
      await api.post('/appointments', {
  doctor_id: String(selectedDoctor.id),
  doctor_name: selectedDoctor.name,
  specialization: selectedDoctor.specialty,
  date: format(selectedDate, 'yyyy-MM-dd'),
  time: selectedTime,
  symptoms,
  fees: selectedDoctor.fees,
});

// ✅ TEMP MOCK STORAGE (Supabase-ready)
const newAppointment = {
  id: Date.now(),
  doctor_name: selectedDoctor.name,
  specialization: selectedDoctor.specialty,
  date: format(selectedDate, 'yyyy-MM-dd'),
  time: selectedTime,
  status: 'scheduled',
};

const existing = JSON.parse(
  localStorage.getItem('appointments') || '[]'
);

localStorage.setItem(
  'appointments',
  JSON.stringify([...existing, newAppointment])
);


setShowSuccess(true);

    } finally {
      setIsLoading(false);
    }
  };
useEffect(() => {
  if (!selectedDoctor || !selectedDate) return;

  api
    .get(`/doctors/${selectedDoctor.id}/availability`, {
      params: { date: format(selectedDate, 'yyyy-MM-dd') },
    })
    .then((res) => {
      const apiSlots = res.data?.slots;
      setSlots(Array.isArray(apiSlots) ? apiSlots : []);
    })
    .catch((err) => {
      console.error("Failed to load availability", err);
      setSlots([]);
    });
}, [selectedDoctor, selectedDate]);


  const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const selectedDateStr = selectedDate ? format(selectedDate, 'EEE, MMM d') : 'No date selected';

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Book a Visit</h2>
                <p className="text-teal-50 text-sm mt-1">Tell us what's wrong and we'll suggest doctors nearby</p>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                <span className="text-sm font-medium">
                  {step === 'symptoms' ? 'Step 1' : step === 'severity' ? 'Step 2' : step === 'doctors' ? 'Step 3' : 'Step 4'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Symptoms */}
              {step === 'symptoms' && (
                <motion.div
                  key="symptoms"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">What's bothering you?</h2>
                    <p className="text-sm text-gray-500 mt-2">Describe symptoms briefly (e.g., fever, cough, ear pain)</p>
                  </div>

                  <Textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Describe your symptoms..."
                    rows={4}
                  />

                  <div className="flex flex-wrap gap-2">
                    {['Fever', 'Cough', 'Headache', 'Stomach', 'Ear pain', 'Back pain'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSymptoms((p) => (p ? p + ', ' + s : s))}
                        className="px-3 py-1.5 text-sm bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={() => setStep('severity')}
                    disabled={!symptoms.trim()}
                    className="w-full bg-teal-500 hover:bg-teal-600"
                  >
                    Continue
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Severity Questions */}
              {step === 'severity' && (
                <motion.div
                  key="severity"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <button
                    onClick={() => setStep('symptoms')}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>

                  {severityQuestions.map((q) => (
                    <div key={q.id}>
                      <Label className="text-base font-medium">{q.question}</Label>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {q.options.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setSeverityAnswers((p) => ({ ...p, [q.id]: opt }))}
                            className={cn(
                              'p-3 rounded-lg border text-sm font-medium transition-all',
                              severityAnswers[q.id] === opt
                                ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                                : 'border-gray-200 hover:bg-gray-50'
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <Button
                    onClick={handleSeverityComplete}
                    disabled={Object.keys(severityAnswers).length < severityQuestions.length}
                    className="w-full bg-teal-500 hover:bg-teal-600"
                  >
                    Find Doctors
                  </Button>
                </motion.div>
              )}

              {/* Step 3: Doctor Selection */}
              {step === 'doctors' && (
                <motion.div
                  key="doctors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <button
                    onClick={() => setStep('severity')}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>

                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Available Doctors</h3>
                    <p className="text-sm text-gray-500 mt-1">Based on your symptoms</p>
                  </div>

                  <div className="grid gap-4">
                    {doctors.map((doc, index) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -4, scale: 1.01 }}
                        className="p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-teal-200 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                              {getInitials(doc.name)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-bold text-gray-900 text-lg">{doc.name}</h3>
                                <p className="text-sm text-gray-600">{doc.specialty}</p>
                                <p className="text-xs text-gray-500 mt-1">{doc.experience} experience</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-teal-600">₹{doc.fees}</div>
                                <div className="text-xs text-gray-500">Consultation</div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex items-center gap-1 text-amber-500">
                                <span className="text-lg">⭐</span>
                                <span className="text-sm font-medium">{doc.rating}</span>
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-gray-400" /> {doc.location}
                              </div>
                            </div>

                            <Button
                              onClick={() => {
                                setSelectedDoctor(doc);
                                setStep('booking');
                              }}
                              className="w-full mt-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Schedule Appointment
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Calendar Booking */}
              {step === 'booking' && selectedDoctor && (
                <motion.div
                  key="booking"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {/* Doctor Info Header */}
                  <div className="mb-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setStep('doctors')}
                        className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Change Doctor
                      </button>
                      <div className="text-center flex-1">
                        <div className="flex items-center gap-2 justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                          <h3 className="font-bold text-gray-900 text-lg">{selectedDoctor.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600">{selectedDoctor.specialty} • {selectedDoctor.experience}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-teal-600">₹{selectedDoctor.fees}</span>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">{monthYear}</h3>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handlePrevMonth}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleNextMonth}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="mb-6 max-w-md mx-auto text-sm">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstDay }).map((_, index) => (
                        <div key={`empty-${index}`} className="w-8 h-8" />
                      ))}

                      {Array.from({ length: daysInMonth }).map((_, index) => {
                        const day = index + 1;
                        const isSelected = selectedDay === day;
                        const today = new Date();
                        const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

                        return (
                          <motion.button
                            key={day}
                            onClick={() => handleDateSelect(day)}
                            aria-pressed={isSelected}
                            className={cn(
                              "relative w-8 h-8 flex items-center justify-center rounded-md text-sm",
                              isSelected ? 'bg-teal-500 text-white' : 'hover:bg-gray-50'
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.01 }}
                          >
                            <div
                              className={`
                                w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium
                                transition-all duration-200
                                ${isSelected
                                  ? 'bg-teal-500 text-white shadow-lg ring-2 ring-teal-200'
                                  : isToday
                                  ? 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                                  : 'text-gray-700 hover:bg-gray-100'
                                }
                              `}
                            >
                              {day}
                            </div>

                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="absolute -bottom-1 left-1/2 -translate-x-1/2"
                                >
                                  <div className="w-2 h-2 bg-green-500 rounded-full shadow-lg" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Date Display */}
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex-1 bg-teal-50 rounded-lg px-4 py-3 border border-teal-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span className="text-sm text-gray-600">Selected:</span>
                        <span className="font-semibold text-gray-900">{selectedDateStr}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleQuickSelect('tomorrow')} className="text-xs">
                        Tomorrow
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleQuickSelect('next7days')} className="text-xs">
                        Next 7 days
                      </Button>
                    </div>
                  </div>

                  {/* Time Slots */}
<div>
  <div className="flex items-center gap-2 mb-4">
    <Clock className="w-5 h-5 text-gray-400" />
    <h4 className="font-semibold text-gray-900">Select a time</h4>
  </div>

  <div className="grid grid-cols-4 gap-3">
    {slots.map(({ time, available }) => {
      const isSelected = selectedTime === time;

      return (
        <motion.button
          key={time}
          disabled={!available}
          onClick={() => setSelectedTime(time)}
          className={`
            px-4 py-3 rounded-lg border-2 font-medium text-sm
            transition-all duration-200
            ${
              !available
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                : isSelected
                ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md'
                : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200 hover:bg-teal-50/50'
            }
          `}
          whileHover={{ scale: available ? 1.02 : 1 }}
          whileTap={{ scale: available ? 0.98 : 1 }}
        >
          {time}
        </motion.button>
      );
    })}

    {slots.length === 0 && (
      <p className="col-span-4 text-sm text-gray-500 text-center">
        No slots available for this date
      </p>
    )}
  </div>
</div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer - Only show on booking step */}
          {step === 'booking' && (
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedTime && selectedDate ? (
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Ready to book: <strong>{selectedDateStr}</strong> at <strong>{selectedTime}</strong>
                  </span>
                ) : (
                  <span>Please select a date and time</span>
                )}
              </div>
              <Button
                onClick={handleBookAppointment}
                disabled={!selectedDate || !selectedTime || isLoading}
                className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed px-8"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking'}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="text-center space-y-4 max-w-md bg-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Appointment Confirmed!</h3>
            <p className="text-sm text-gray-500 mt-2">
              Your appointment with <strong>{selectedDoctor?.name}</strong> has been scheduled
            </p>
            <div className="bg-teal-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-700">
                <strong>{selectedDateStr}</strong> at <strong>{selectedTime}</strong>
              </p>
            </div>
          </motion.div>
          <div className="flex gap-3 justify-center pt-4">
            <Button
              onClick={() => {
                setShowSuccess(false);
                navigate('/dashboard');
              }}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccess(false);
                setStep('symptoms');
                setSymptoms('');
                setSeverityAnswers({});
                setSelectedDoctor(null);
                setSelectedDate(null);
                setSelectedTime(null);
              }}
            >
              Book Another
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}