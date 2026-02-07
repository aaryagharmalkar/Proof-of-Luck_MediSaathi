import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, Calendar, Pill, FileText, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const actions = [
  { 
    icon: Calendar, 
    label: 'Add Appointment', 
    page: 'doctor-scheduler',
    color: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
  },
  { 
    icon: Pill, 
    label: 'Add Medicine', 
    page: 'medicines',
    color: 'bg-green-50 text-green-600 hover:bg-green-100'
  },
  { 
    icon: FileText, 
    label: 'Upload Report', 
    page: 'medical-summariser',
    color: 'bg-purple-50 text-purple-600 hover:bg-purple-100'
  },
  { 
    icon: MessageCircle, 
    label: 'Talk to AI', 
    page: 'chatbot',
    color: 'bg-teal-50 text-teal-600 hover:bg-teal-100'
  },
];

export default function QuickActions() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, idx) => (
          <motion.div 
            key={action.page} 
            initial={{ opacity: 0, y: 6 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: idx * 0.05, duration: 0.3 }}
          >
            <Link
              to={createPageUrl(action.page)}
              className="block"
            >
              <motion.div
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  action.color
                )}
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div 
                  initial={{ y: -4, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: 0.08, duration: 0.3 }}
                >
                  <action.icon className="w-5 h-5" />
                </motion.div>
                <span className="text-sm font-medium">{action.label}</span>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}