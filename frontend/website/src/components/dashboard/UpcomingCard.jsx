import React from 'react';
import { Calendar, Clock, Pill, Stethoscope } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

// cn utility function (if not in your utils)
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function UpcomingCard({ type, data }) {
  if (!data) return null;

  if (type === 'appointment') {
    // Safely parse and format the date
    let formattedDate = 'Invalid date';
    try {
      const dateObj = typeof data.date === 'string' ? parseISO(data.date) : new Date(data.date);
      if (isValid(dateObj)) {
        formattedDate = format(dateObj, 'MMM d, yyyy');
      }
    } catch (error) {
      console.error('Date parsing error:', error);
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(2,6,23,0.08)' }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-shadow"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {data.doctor_name || 'Doctor Appointment'}
            </h4>
            <p className="text-sm text-gray-500">
              {data.specialization || 'General Practice'}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              {data.time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {data.time}
                </span>
              )}
            </div>
          </div>
          <span className={cn(
            "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
            data.status === 'scheduled' && "bg-blue-50 text-blue-600",
            data.status === 'confirmed' && "bg-blue-50 text-blue-600",
            data.status === 'completed' && "bg-green-50 text-green-600",
            data.status === 'cancelled' && "bg-red-50 text-red-600",
            !data.status && "bg-gray-50 text-gray-600"
          )}>
            {data.status || 'pending'}
          </span>
        </div>
      </motion.div>
    );
  }

  if (type === 'medicine') {
    const totalDays = Object.keys(data.daily_status || {}).length || 5;
    const takenDays = Object.values(data.daily_status || {}).filter(s => s === 'taken').length;
    const progress = totalDays > 0 ? (takenDays / totalDays) * 100 : 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(2,6,23,0.06)' }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-shadow"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <Pill className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">
              {data.name || 'Medicine'}
            </h4>
            <p className="text-sm text-gray-500">
              {data.dosage || 'As prescribed'} - {data.frequency || 'Daily'}
            </p>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium text-teal-600">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full"
                />
              </div>
              
              {/* Encouragement Message */}
              {progress >= 80 && (
                <p className="text-xs text-teal-600 mt-2 font-medium flex items-center gap-1">
                  Great going! Keep it up 💪
                </p>
              )}
              {progress < 50 && progress > 0 && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  Don't forget your medication 🔔
                </p>
              )}
            </div>

            {/* Additional Info */}
            {data.next_dose && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>Next dose: {data.next_dose}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Default fallback for unknown types
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500">Unknown card type: {type}</p>
    </div>
  );
}

// PropTypes for better development experience (optional)
UpcomingCard.defaultProps = {
  data: {},
};