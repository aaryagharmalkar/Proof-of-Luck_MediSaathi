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
  
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Your Health Calendar</h2>
            <p className="text-teal-50 text-sm mt-1">Track appointments and medications</p>
          </div>
          <button
            onClick={() => navigate('/doctor-scheduler')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </div>

      <div className={cn(compact ? 'p-4' : 'p-6')}>
        {/* Calendar Header */}
        <div className={cn("flex items-center justify-between", compact ? 'mb-3' : 'mb-6')}>
          <h3 className={cn("font-semibold text-gray-900", compact ? 'text-sm' : 'text-lg')}>{monthYear}</h3>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrevMonth}
              className={cn("rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors", compact ? 'w-8 h-8' : 'w-10 h-10')}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextMonth}
              className={cn("rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors", compact ? 'w-8 h-8' : 'w-10 h-10')}
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </motion.button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div>
          {/* Day Headers */}
          <div className={cn('grid grid-cols-7 gap-2 mb-2', compact ? 'gap-1 mb-1' : '')}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className={cn('text-center text-xs font-medium text-gray-500', compact ? 'py-1' : 'py-2')}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDay }).map((_, index) => (
              <div key={`empty-${index}`} className={compact ? 'w-8 h-8' : ''} />
            ))}

            {/* Actual days */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const isSelected = selectedDay === day;
              const isToday = isCurrentMonth && day === today.getDate();
              const events = getDayEvents(day);

              return (
                <motion.button
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  className="relative"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.008 }}
                >
                  <div
                    className={cn(
                      compact ? 'w-9 h-9 rounded-md flex items-center justify-center text-xs font-medium transition-all duration-200' : 'w-full aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all duration-200',
                      isSelected && 'bg-teal-500 text-white shadow-lg ring-2 ring-teal-200',
                      !isSelected && isToday && 'bg-teal-50 text-teal-600 ring-2 ring-teal-300',
                      !isSelected && !isToday && 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <span>{day}</span>
                    
                    {/* Event Indicators */}
                    {(events.hasAppointments || events.hasMedicines) && !isSelected && (
                      <div className={cn('flex gap-0.5', compact ? 'mt-0.5' : 'mt-1')}>
                        {events.hasAppointments && (
                          <div className={cn(compact ? 'w-1 h-1' : 'w-1.5 h-1.5', 'bg-blue-500 rounded-full')} />
                        )}
                        {events.hasMedicines && (
                          <div className={cn(compact ? 'w-1 h-1' : 'w-1.5 h-1.5', 'bg-green-500 rounded-full')} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Green dot for selected date */}
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

        {/* Legend */}
        <div className={cn('border-t border-gray-100', compact ? 'mt-4 pt-3' : 'mt-6 pt-4')}>
          <div className={cn('flex items-center justify-center text-xs', compact ? 'gap-4' : 'gap-6')}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-teal-50 border-2 border-teal-300 rounded" />
              <span className="text-gray-600">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-gray-600">Appointment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-gray-600">Medicine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}