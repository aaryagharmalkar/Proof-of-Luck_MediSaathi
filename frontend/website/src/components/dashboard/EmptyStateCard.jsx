import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function EmptyStateCard({ icon: Icon, title, description, actionText, link, color = 'teal' }) {
  const colorClasses = {
    teal: 'bg-teal-50 text-teal-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const blobColors = {
    teal: 'from-teal-50 to-emerald-50 bg-teal-50',
    blue: 'from-blue-50 to-cyan-50 bg-blue-50',
    purple: 'from-purple-50 to-fuchsia-50 bg-purple-50',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.45 }} 
      className="relative group bg-white rounded-[2rem] p-6 border border-white shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 h-full flex flex-col items-center justify-center text-center"
    >
      {/* Background Decorative Elements */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${blobColors[color]} rounded-full blur-2xl -mr-10 -mt-10 opacity-70 pointer-events-none transition-transform group-hover:scale-110`} />
      <div className={`absolute bottom-0 left-0 w-24 h-24 ${blobColors[color].split(' ')[2]} rounded-full blur-2xl -ml-8 -mb-8 opacity-50 pointer-events-none transition-transform group-hover:scale-110`} />

      <div className={cn(
        "relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 shadow-sm border border-white",
        colorClasses[color]
      )}>
        <Icon className="w-7 h-7" />
      </div>
      
      <h4 className="relative z-10 text-lg font-bold text-gray-900 mb-1">{title}</h4>
      <p className="relative z-10 text-sm text-gray-500 mb-6 max-w-[80%]">{description}</p>
      
      <Link to={createPageUrl(link)} className="relative z-10 w-full">
        <motion.div
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg",
            colorClasses[color]
          )}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          {actionText || "Add New"}
        </motion.div>
      </Link>
    </motion.div>
  );
}
