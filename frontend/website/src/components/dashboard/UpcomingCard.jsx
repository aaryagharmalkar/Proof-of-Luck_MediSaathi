import React from 'react';
import { Calendar, Clock, Stethoscope, ChevronRight, Pill, Activity } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function UpcomingCard({ type = 'appointment', data }) {
  // If no data
  if (!data && type !== 'empty') {
      return (
      <motion.div
        whileHover={{ y: -5 }}
        className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-gray-100/50 border border-white flex flex-col justify-center items-center text-center h-full min-h-[200px]"
      >
         <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-400">
            <Calendar className="w-7 h-7" />
         </div>
         <h4 className="font-bold text-gray-900">No Items</h4>
         <p className="text-gray-500 text-sm mb-4">Nothing scheduled.</p>
         <Link to="/appointments" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
            View All
         </Link>
      </motion.div>
    );
  }

  if (type === 'medicine') {
      return (
        <div className="relative group bg-white rounded-[2rem] p-6 border border-white shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 font-sans">
           <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50/50 rounded-full blur-2xl -mr-10 -mt-10 opacity-70 pointer-events-none" />
           
           <div className="relative z-10 flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 text-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-purple-100">
                   <Pill className="w-7 h-7" />
               </div>
               
               <div className="flex-1 min-w-0">
                   <h4 className="font-bold text-gray-900 text-lg leading-tight truncate mb-1">{data.name}</h4>
                   <p className="text-sm font-medium text-gray-500 bg-gray-50 inline-block px-2 py-0.5 rounded-lg border border-gray-100">{data.dosage || '1 Tablet'} • {data.frequency || 'Daily'}</p>
               </div>
               
               <div className="p-2 bg-gray-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0 shadow-lg">
                  <ChevronRight className="w-4 h-4" />
               </div>
           </div>
        </div>
      )
  }

  // Default: Appointment
    let dateObj = null;
    let formattedDate = 'Invalid date';
    try {
      dateObj = typeof data.date === 'string' ? parseISO(data.date) : new Date(data.date);
      if (isValid(dateObj)) {
        formattedDate = format(dateObj, 'MMM d, yyyy');
      }
    } catch (error) {
      console.error('Date parsing error:', error);
    }

    const day = dateObj && isValid(dateObj) ? format(dateObj, 'd') : '--';
    const month = dateObj && isValid(dateObj) ? format(dateObj, 'MMM') : '--';


    return (
    <div className="relative group bg-white rounded-[2rem] p-6 border border-white shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 min-h-[140px] flex flex-col justify-center">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-2xl -mr-10 -mt-10 opacity-70 pointer-events-none" />
      
      <div className="relative z-10 flex gap-4">
        {/* Date Box */}
        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex flex-col items-center justify-center border border-blue-100 shadow-sm">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{month}</span>
          <span className="text-xl font-bold text-gray-900">{day}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          <h4 className="font-bold text-gray-900 truncate text-lg mb-1">{data.doctor_name || "Doctor Visit"}</h4>
          <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
            <span className="bg-gray-50 px-2 py-0.5 rounded text-xs font-medium text-gray-600 border border-gray-100 line-clamp-1">
              {data.specialization || "General Checkup"}
            </span>
          </p>
          
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
             <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                {data.time || data.time_slot || "TBD"}
             </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center">
            <div className="p-2 bg-gray-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0 shadow-lg">
                <ChevronRight className="w-4 h-4" />
            </div>
        </div>
      </div>
    </div>
  );
}
