import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Clock, Pill, HeartPulse } from "lucide-react";
import { motion } from "framer-motion";

export default function FamilyHealthInsightsCard({ appointments, medicines }) {
  const upcomingAppts = appointments?.filter(a => new Date(a.date_time) > new Date()) || [];
  const activeMedsCount = medicines?.length || 0;
  
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-xl h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
           <h3 className="text-xl font-bold text-gray-900">Health Signals</h3>
           <p className="text-sm text-gray-500">Live monitoring</p>
        </div>
        <div className="relative">
           <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
           <div className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></div>
        </div>
      </div>

      <div className="space-y-4 flex-1">
         {/* Appointment Signal */}
         {upcomingAppts.length > 0 ? (
            <motion.div 
               whileHover={{ scale: 1.02 }}
               className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3"
            >
               <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Clock className="w-5 h-5" />
               </div>
               <div>
                  <h4 className="font-semibold text-gray-900">Upcoming Visit</h4>
                  <p className="text-sm text-blue-700 mt-0.5">
                     {upcomingAppts[0].doctor_name || 'Dr. Smith'} tomorrow
                  </p>
               </div>
            </motion.div>
         ) : (
             <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3 opacity-60">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">No upcoming visits</span>
             </div>
         )}
         
         {/* Meds Signal */}
         {activeMedsCount > 0 ? (
            <motion.div 
               whileHover={{ scale: 1.02 }}
               className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-start gap-3"
            >
               <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                  <Pill className="w-5 h-5" />
               </div>
               <div>
                  <h4 className="font-semibold text-gray-900">Adherence</h4>
                  <p className="text-sm text-purple-700 mt-0.5">
                     {activeMedsCount} active medications
                  </p>
               </div>
            </motion.div>
         ) : null}

         {/* Generic Signal (Always visible for demo) */}
         <motion.div 
            whileHover={{ scale: 1.02 }}
            className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-start gap-3"
         >
            <div className="p-2 bg-green-100 text-green-600 rounded-xl">
               <HeartPulse className="w-5 h-5" />
            </div>
            <div>
               <h4 className="font-semibold text-gray-900">Vitals Stable</h4>
               <p className="text-sm text-green-700 mt-0.5">
                  BP and Glucose within range
               </p>
            </div>
         </motion.div>
      </div>

      <Link to="/appointments" className="mt-6 text-center text-sm font-medium text-teal-600 hover:text-teal-700">
         View all activity →
      </Link>
    </div>
  );
}
