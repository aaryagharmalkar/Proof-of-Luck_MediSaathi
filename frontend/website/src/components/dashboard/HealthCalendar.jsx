import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function HealthCalendar({ appointments = [], medicines = [], compact = false }) {
  console.log("appointments in calendar", appointments);

  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  // compact reduces vertical height for dashboard preview

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
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDay(day);
    // Could show detailed view of that day's events
  };

  // Check if a day has appointments or medicine reminders
  const getDayEvents = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
   const dayAppointments = appointments.filter((apt) => {
  try {
    if (!apt.date) return false;

    // Parse YYYY-MM-DD safely (NO timezone issues)
    const [year, month, day] = apt.date.split("-");
    const aptDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return isSameDay(aptDate, date);
  } catch {
    return false;
  }
});


    const dayMedicines = medicines.filter(med => med.active);

    return {
      hasAppointments: dayAppointments.length > 0,
      hasMedicines: dayMedicines.length > 0,
      count: dayAppointments.length
    };
  };

  const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const today = new Date();
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && 
                         currentDate.getFullYear() === today.getFullYear();

  return (
    <div className="relative group bg-white rounded-[2rem] p-8 border border-white shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-50 to-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-70 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-50 rounded-full blur-3xl -ml-20 -mb-20 opacity-50 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Health Calendar
          </h2>
          <p className="text-gray-500 text-sm mt-1">Schedule & Reminders</p>
        </div>
        
        <div className="flex items-center gap-3">
             <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/doctor-scheduler')}
                className="bg-gray-900 text-white p-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl"
            >
                <Plus className="w-5 h-5" />
            </motion.button>
        </div>
      </div>

      <div className={cn("relative z-10", compact ? 'p-0' : 'p-2')}>
        {/* Calendar Header */}
        <div className={cn("flex items-center justify-between", compact ? 'mb-4' : 'mb-8')}>
          <h3 className={cn("font-medium text-gray-900", compact ? 'text-base' : 'text-lg')}>{monthYear}</h3>
          <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrevMonth}
              className={cn("rounded-md flex items-center justify-center hover:bg-white hover:shadow-sm transition-all text-gray-500", compact ? 'w-8 h-8' : 'w-9 h-9')}
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextMonth}
              className={cn("rounded-md flex items-center justify-center hover:bg-white hover:shadow-sm transition-all text-gray-500", compact ? 'w-8 h-8' : 'w-9 h-9')}
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div>
          {/* Day Headers */}
          <div className={cn('grid grid-cols-7 gap-2 mb-4', compact ? 'gap-1 mb-2' : '')}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className={cn('text-center text-xs font-medium text-gray-400 uppercase tracking-wide', compact ? 'py-1' : 'py-2')}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDay }).map((_, index) => (
              <div key={`empty-${index}`} className={compact ? 'w-9 h-9' : ''} />
            ))}

            {/* Actual days */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const isSelected = selectedDay === day;
              const isToday = isCurrentMonth && day === today.getDate();
              const events = getDayEvents(day);

              return (
                <button
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  className="relative group outline-none"
                >
                  <div
                    className={cn(
                      compact 
                        ? 'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200' 
                        : 'w-full aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all duration-200',
                      isSelected 
                        ? 'bg-gray-900 text-white' 
                        : isToday 
                            ? 'bg-gray-100 text-gray-900' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <span>{day}</span>
                    
                    {/* Event Indicators */}
                    {(events.hasAppointments || events.hasMedicines) && !isSelected && (
                      <div className={cn('flex gap-1 absolute bottom-2 left-1/2 -translate-x-1/2')}>
                        {events.hasAppointments && (
                          <div className={cn('w-1 h-1 bg-blue-500 rounded-full')} />
                        )}
                        {events.hasMedicines && (
                          <div className={cn('w-1 h-1 bg-teal-500 rounded-full')} />
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className={cn('border-t border-gray-100', compact ? 'mt-4 pt-4' : 'mt-6 pt-6')}>
          <div className={cn('flex items-center justify-center text-xs font-medium', compact ? 'gap-4' : 'gap-6')}>
            {/* <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-indigo-50 border border-indigo-200 rounded-full" />
              <span className="text-slate-500">Today</span>
            </div> */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-gray-500">Appointment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-teal-500 rounded-full" />
              <span className="text-gray-500">Medicine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}