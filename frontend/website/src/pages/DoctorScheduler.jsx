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

async function fetchDoctorsForSymptoms(symptoms) {
  try {
    const specialization = symptoms.toLowerCase().includes('ear') || symptoms.toLowerCase().includes('nose') || symptoms.toLowerCase().includes('throat')
      ? 'ENT'
      : null;
    const params = specialization ? { specialization } : {};
    const { data } = await api.get('/doctors', { params });
    if (Array.isArray(data) && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        name: d.name || d.full_name || 'Doctor',
        specialty: d.specialty || d.specialization || 'General Physician',
        specialization: d.specialization || d.specialty,
        fees: d.fees ?? d.fees_inr ?? 500,
        rating: 4.8,
        experience: d.experience || 'Verified',
        location: d.location || 'Online',
      }));
    }
  } catch (e) {
    console.warn('Fetch doctors failed', e);
  }
  return [];
}

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
  const [bookedStatus, setBookedStatus] = useState('scheduled');

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

  const handleSeverityComplete = async () => {
    setIsLoading(true);
    try {
      const list = await fetchDoctorsForSymptoms(symptoms);
      setDoctors(list);
      if (list.length === 0) {
        alert('No doctors available right now. Please try again later or contact support.');
        return;
      }
      setStep('doctors');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsLoading(true);
    try {
      const response = await api.post('/appointments', {
        doctor_id: String(selectedDoctor.id),
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        symptoms,
        fees: selectedDoctor.fees ?? selectedDoctor.fees_inr ?? 0,
      });

      if (response.data) {
        setBookedStatus(response.data.status || 'scheduled');
        setShowSuccess(true);
      }
    } catch (error) {
      console.error("Failed to book appointment:", error);
      alert(error.response?.data?.detail || "Failed to book appointment. Please try again.");
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
    <div className="min-h-screen relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100">
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-gray-200/50 rounded-[2.5rem] overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 py-8 border-b border-gray-100/50 bg-white/50 backdrop-blur-sm relative">
             <div className="absolute inset-0 bg-gradient-to-r from-teal-50/50 to-blue-50/50 opacity-50 pointer-events-none" />
             <div className="relative flex items-center justify-between">
                <div>
                   <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Book a Visit</h2>
                   <p className="text-gray-500 font-medium mt-1">Tell us what's wrong and we'll suggest doctors nearby</p>
                </div>
                <div className="bg-white/60 px-5 py-2.5 rounded-2xl border border-white/60 shadow-sm backdrop-blur-md hidden sm:block">
                   <span className="text-sm font-bold text-teal-700">
                     {step === 'symptoms' ? 'Step 1 of 4' : step === 'severity' ? 'Step 2 of 4' : step === 'doctors' ? 'Step 3 of 4' : 'Step 4 of 4'}
                   </span>
                </div>
             </div>
             
             {/* Progress Bar */}
             <div className="mt-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                   className="h-full bg-gradient-to-r from-teal-400 to-blue-500 rounded-full"
                   initial={{ width: "25%" }}
                   animate={{ 
                      width: step === 'symptoms' ? "25%" : step === 'severity' ? "50%" : step === 'doctors' ? "75%" : "100%" 
                   }}
                   transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />
             </div>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Symptoms */}
              {step === 'symptoms' && (
                <motion.div
                  key="symptoms"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="text-center max-w-lg mx-auto">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">What's bothering you?</h2>
                    <p className="text-gray-500">Describe your symptoms briefly so we can match you with the right specialist.</p>
                  </div>

                  <Textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="e.g. I have a severe headache and fever since yesterday..."
                    rows={5}
                    className="bg-gray-50 border-gray-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-2xl text-lg p-6 resize-none transition-all"
                  />

                  <div>
                     <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Select</p>
                     <div className="flex flex-wrap gap-3">
                        {['Fever', 'Cough', 'Headache', 'Stomach Pain', 'Ear Pain', 'Back Pain', 'Fatigue'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setSymptoms((p) => (p ? p + ', ' + s : s))}
                            className="px-4 py-2 text-sm font-bold bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all shadow-sm"
                        >
                            + {s}
                        </button>
                        ))}
                     </div>
                  </div>

                  <Button
                    onClick={() => setStep('severity')}
                    disabled={!symptoms.trim()}
                    className="w-full h-14 bg-gradient-to-r from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 text-white font-bold text-lg rounded-2xl shadow-xl shadow-gray-900/10"
                  >
                    Continue
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Severity Questions */}
              {step === 'severity' && (
                <motion.div
                  key="severity"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <button
                    onClick={() => setStep('symptoms')}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-teal-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Symptoms
                  </button>

                  <div className="space-y-6">
                    {severityQuestions.map((q) => (
                        <div key={q.id} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                        <Label className="text-lg font-bold text-gray-900 mb-4 block">{q.question}</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {q.options.map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setSeverityAnswers((p) => ({ ...p, [q.id]: opt }))}
                                className={cn(
                                'p-4 rounded-xl border-2 text-sm font-bold transition-all',
                                severityAnswers[q.id] === opt
                                    ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md transform scale-[1.02]'
                                    : 'border-transparent bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
                                )}
                            >
                                {opt}
                            </button>
                            ))}
                        </div>
                        </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleSeverityComplete}
                    disabled={Object.keys(severityAnswers).length < severityQuestions.length}
                    className="w-full h-14 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-teal-500/20"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Find Matching Doctors'}
                  </Button>
                </motion.div>
              )}

              {/* Step 3: Doctor Selection */}
              {step === 'doctors' && (
                <motion.div
                  key="doctors"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setStep('severity')}
                            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-teal-600 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <h3 className="font-bold text-gray-900">Found {doctors.length} Specialists</h3>
                    </div>

                  <div className="grid gap-5">
                    {doctors.map((doc, index) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -4, scale: 1.01 }}
                        className="group p-6 bg-white rounded-[2rem] border border-gray-100 hover:border-teal-200 shadow-lg hover:shadow-xl shadow-gray-200/50 hover:shadow-teal-100/50 transition-all cursor-pointer relative overflow-hidden"
                        onClick={() => {
                             setSelectedDoctor(doc);
                             setStep('booking');
                        }}
                      >
                         <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-50 to-blue-50 duration-500 rounded-bl-full -mr-10 -mt-10 opacity-50 group-hover:scale-110" />

                        <div className="flex items-start gap-5 relative z-10">
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center text-teal-700 font-extrabold text-xl shadow-inner">
                              {getInitials(doc.name)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div>
                                <h3 className="font-extrabold text-gray-900 text-lg group-hover:text-teal-700 transition-colors">{doc.name}</h3>
                                <p className="text-sm font-medium text-gray-500">{doc.specialty}</p>
                                <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold ring-1 ring-gray-100">
                                    {doc.experience} experience
                                </div>
                              </div>
                              <div className="text-left sm:text-right mt-2 sm:mt-0">
                                <div className="text-xl font-extrabold text-teal-600">₹{doc.fees}</div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Consultation</div>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center gap-4 border-t border-gray-50 pt-4">
                              <div className="flex items-center gap-1.5 bg-amber-50 px-2 pl-1.5 py-1 rounded-lg text-amber-700 text-sm font-bold">
                                <span className="text-base">⭐</span>
                                {doc.rating}
                              </div>
                              <div className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-gray-400" /> {doc.location}
                              </div>
                              <div className="ml-auto">
                                 <span className="text-sm font-bold text-teal-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Book Now <ChevronRight className="w-4 h-4" />
                                 </span>
                              </div>
                            </div>
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
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* Doctor Info Header */}
                  <div className="mb-8 p-4 bg-teal-50/50 rounded-2xl border border-teal-100/50 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-teal-700 font-bold border border-teal-100">
                                 {getInitials(selectedDoctor.name)}
                             </div>
                             <div>
                                 <h3 className="font-bold text-gray-900">{selectedDoctor.name}</h3>
                                 <p className="text-sm text-teal-700 font-medium">{selectedDoctor.specialty}</p>
                             </div>
                         </div>
                         <Button variant="ghost" size="sm" onClick={() => setStep('doctors')} className="text-teal-600 hover:text-teal-800 hover:bg-teal-100">
                             Change
                         </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                     {/* Calendar Widget */}
                     <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900">{monthYear}</h3>
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handlePrevMonth}
                                    className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleNextMonth}
                                    className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </motion.button>
                            </div>
                        </div>

                        <div className="mb-2 grid grid-cols-7 gap-1">
                             {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                <div key={day} className="text-center text-xs font-bold text-gray-400 py-1 uppercase tracking-wider">
                                {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {Array.from({ length: firstDay }).map((_, index) => (
                                <div key={`empty-${index}`} />
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
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className={cn(
                                        "aspect-square rounded-xl flex items-center justify-center text-sm font-bold relative transition-colors",
                                        isSelected 
                                            ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30" 
                                            : isToday 
                                                ? "bg-teal-50 text-teal-700 ring-2 ring-teal-200/50" 
                                                : "text-gray-700 hover:bg-gray-100"
                                    )}
                                >
                                    {day}
                                    {isSelected && <motion.div layoutId="day-highlight" className="absolute inset-0 border-2 border-white/30 rounded-xl" />}
                                </motion.button>
                                );
                            })}
                        </div>
                        
                        <div className="mt-6 flex gap-2">
                            <Button variant="outline" className="flex-1 rounded-xl text-xs font-bold border-gray-200" onClick={() => handleQuickSelect('tomorrow')}>Tomorrow</Button>
                            <Button variant="outline" className="flex-1 rounded-xl text-xs font-bold border-gray-200" onClick={() => handleQuickSelect('next7days')}>Next week</Button>
                        </div>
                     </div>

                     {/* Time & Summary */}
                     <div className="flex flex-col">
                         <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <h4 className="font-bold text-gray-900">Available Slots</h4>
                         </div>

                        <div className="flex-1">
                             <div className="grid grid-cols-3 gap-3 content-start">
                                {slots.map(({ time, available }) => {
                                    const isSelected = selectedTime === time;
                                    return (
                                        <motion.button
                                            key={time}
                                            disabled={!available}
                                            onClick={() => setSelectedTime(time)}
                                            whileHover={{ scale: available ? 1.05 : 1 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={cn(
                                                "py-2.5 rounded-xl text-sm font-bold border-2 transition-all",
                                                !available
                                                    ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed decoration-slice"
                                                    : isSelected
                                                        ? "border-teal-500 bg-teal-50 text-teal-700 shadow-md"
                                                        : "border-transparent bg-white shadow-sm ring-1 ring-gray-100 hover:ring-teal-200 hover:bg-teal-50/30 text-gray-600"
                                            )}
                                        >
                                            {time}
                                        </motion.button>
                                    );
                                })}
                                {slots.length === 0 && (
                                    <div className="col-span-3 py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        No slots available for this date
                                    </div>
                                )}
                             </div>
                        </div>
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer - Only show on booking step */}
          {step === 'booking' && (
            <div className="px-8 py-6 bg-gray-50/50 backdrop-blur-sm border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                {selectedTime && selectedDate ? (
                  <span className="flex items-center gap-2">
                     <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                     Booking for <strong>{selectedDateStr}</strong> at <strong>{selectedTime}</strong>
                  </span>
                ) : (
                  <span className="text-gray-400">Select a date and time to continue</span>
                )}
              </div>
              <Button
                onClick={handleBookAppointment}
                disabled={!selectedDate || !selectedTime || isLoading}
                className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:shadow-none transition-all"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking'}
              </Button>
            </div>
          )}
        </motion.div>
      </main>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-2xl border-white/50 shadow-2xl p-8 rounded-[2rem]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
              {bookedStatus === 'confirmed' ? 'Appointment Confirmed!' : 'Request Sent!'}
            </h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              {bookedStatus === 'confirmed'
                ? `You're all set with Dr. ${selectedDoctor?.name || 'the doctor'}.`
                : `Your request has been sent to Dr. ${selectedDoctor?.name || 'the doctor'}.`}
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-6 mt-6 border border-gray-100">
                <div className="flex items-center justify-center gap-2 text-lg font-bold text-gray-800">
                    <Calendar className="w-5 h-5 text-teal-600" />
                    {selectedDateStr}
                </div>
                <div className="flex items-center justify-center gap-2 text-base font-medium text-gray-500 mt-1">
                    <Clock className="w-4 h-4" />
                    {selectedTime}
                </div>
            </div>
          </motion.div>
          <div className="grid grid-cols-2 gap-3 mt-8">
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
              className="rounded-xl font-bold h-12 border-gray-200 hover:bg-gray-50"
            >
              Book Another
            </Button>
            <Button
              onClick={() => {
                setShowSuccess(false);
                navigate('/dashboard');
              }}
              className="bg-gray-900 hover:bg-black text-white rounded-xl font-bold h-12"
            >
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}