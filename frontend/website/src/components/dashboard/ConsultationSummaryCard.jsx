import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, CheckCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const ConsultationSummaryCard = ({ summary }) => {
  // If no summary exists, showing a prominent "Upload" state in this hero slot
  if (!summary) {
    return (
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="group relative bg-white rounded-[2rem] p-8 border border-white shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500"
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-50 to-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-70" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-50 rounded-full blur-3xl -ml-20 -mb-20 opacity-50" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
               <Activity className="w-3 h-3" />
               New Consultation
            </div>
            
            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight mb-3">
              Did you see a <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">doctor today?</span>
            </h2>
            
            <p className="text-gray-600 text-lg mb-6 max-w-md">
              Don't lose track of your health plan. Record or upload your consultation to instant insights.
            </p>
            
            <Link 
              to="/medical-summariser"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-medium px-8 py-4 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              Start Analysis
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="relative hidden md:block">
             <div className="absolute inset-0 bg-teal-200 blur-2xl opacity-20 transform scale-150 rounded-full"></div>
             <div className="relative bg-gradient-to-br from-white to-teal-50 p-6 rounded-2xl shadow-lg border border-teal-100 transform rotate-3 group-hover:rotate-6 transition-transform duration-500">
                <FileText className="w-16 h-16 text-teal-600 mb-2" />
                <div className="space-y-2">
                   <div className="h-2 w-24 bg-gray-200 rounded-full"></div>
                   <div className="h-2 w-16 bg-gray-200 rounded-full"></div>
                   <div className="h-2 w-20 bg-gray-100 rounded-full"></div>
                </div>
                
                <div className="absolute -right-4 -top-4 bg-green-500 text-white p-2 rounded-xl shadow-lg animate-bounce">
                   <CheckCircle className="w-6 h-6" />
                </div>
             </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // If summary exists
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white rounded-[2rem] border border-gray-100 shadow-lg overflow-hidden relative group"
    >
      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-teal-400 to-blue-500" />
      
      <div className="p-8">
         <div className="flex items-start justify-between mb-4">
            <div>
               <p className="text-sm font-medium text-teal-600 mb-1">Latest Consultation</p>
               <h2 className="text-2xl font-bold text-gray-900">Viral Fever & Fatigue</h2>
               <p className="text-gray-500 text-sm">Yesterday • Dr. Sharma</p>
            </div>
            <div className="p-3 bg-teal-50 rounded-2xl">
               <FileText className="w-6 h-6 text-teal-600" />
            </div>
         </div>
         
         <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
               <Activity className="w-4 h-4 text-orange-500" /> Action Items
            </h4>
            <ul className="space-y-2">
               <li className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  Take Paracetamol 650mg after food
               </li>
               <li className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  Monitor temperature every 4 hours
               </li>
            </ul>
         </div>
         
         <Link 
            to="/medical-summariser"
            className="w-full block text-center bg-white border border-gray-200 hover:border-teal-500 text-gray-700 hover:text-teal-600 font-medium py-3 rounded-xl transition-colors"
         >
            View Full Report
         </Link>
      </div>
    </motion.div>
  );
};

export default ConsultationSummaryCard;
