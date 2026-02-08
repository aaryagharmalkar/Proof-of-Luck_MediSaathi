import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, User, Stethoscope, ArrowRight } from "lucide-react";

export default function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100 flex flex-col items-center justify-center py-12 px-4">
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center">
        
        {/* Logo */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 mb-8 bg-white/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/40 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
            MediSaathi
          </span>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="text-center mb-12 space-y-2"
        >
           <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
             Welcome
           </h1>
           <p className="text-xl text-gray-500 font-medium">
             Choose how you want to continue
           </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 w-full">
            {/* Patient Card */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/login")}
              className="group relative flex flex-col items-center text-center p-8 rounded-[2.5rem] bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300"
            >
                <div className="w-20 h-20 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <User className="w-10 h-10 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">I&apos;m a Patient</h2>
                <p className="text-gray-500 font-medium leading-relaxed mb-8 flex-1">
                   Track your health, manage prescriptions, and get AI-powered medical insights.
                </p>
                <div className="w-full py-4 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center gap-2 group-hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/20">
                    Patient Login <ArrowRight className="w-5 h-5" />
                </div>
            </motion.button>

            {/* Doctor Card */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/doctor-login")}
              className="group relative flex flex-col items-center text-center p-8 rounded-[2.5rem] bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
            >
                <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Stethoscope className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">I&apos;m a Doctor</h2>
                <p className="text-gray-500 font-medium leading-relaxed mb-8 flex-1">
                   Manage appointments, view patient history, and schedule your availability.
                </p>
                <div className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold flex items-center justify-center gap-2 group-hover:bg-black transition-colors shadow-lg shadow-gray-900/20">
                    Doctor Login <ArrowRight className="w-5 h-5" />
                </div>
            </motion.button>
        </div>

        <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => navigate("/")}
            className="mt-12 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
        >
            Back to Home
        </motion.button>

      </div>
    </div>
  );
}
