import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, Calendar, Pill, FileText, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const actions = [
  { 
    icon: Calendar, 
    label: 'Book Visit', 
    page: 'doctor-scheduler',
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  { 
    icon: Pill, 
    label: 'Add Meds', 
    page: 'medicines',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50'
  },
  { 
    icon: FileText, 
    label: 'Upload', 
    page: 'medical-summariser',
    color: 'text-violet-600',
    bg: 'bg-violet-50'
  },
  { 
    icon: MessageCircle, 
    label: 'AI Chat', 
    page: 'chatbot',
    color: 'text-orange-600',
    bg: 'bg-orange-50'
  },
];

export default function QuickActions() {
  return (
    <div className="relative group bg-white rounded-[2rem] p-6 border border-white shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-50 to-blue-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-70 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-50 rounded-full blur-3xl -ml-12 -mb-12 opacity-50 pointer-events-none" />

      <h3 className="relative z-10 font-bold text-gray-800 text-lg mb-4">Quick Actions</h3>
      <div className="relative z-10 grid grid-cols-2 gap-4">
        {actions.map((action, idx) => (
          <Link
            key={action.page}
            to={createPageUrl(action.page)}
            className="group block"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 h-32"
            >
                <div className={cn(
                  "p-3 rounded-2xl mb-3 transition-colors shadow-sm",
                  action.bg,
                  action.color
                )}>
                    <action.icon className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">{action.label}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}