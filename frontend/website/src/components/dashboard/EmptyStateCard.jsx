import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function EmptyStateCard({ icon: Icon, title, description, actionLabel, actionPage, color = 'teal' }) {
  const colorClasses = {
    teal: 'bg-teal-50 text-teal-600 hover:bg-teal-100',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.45 }} 
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center"
    >
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3",
        colorClasses[color].split(' ').slice(0, 2).join(' ')
      )}>
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <Link to={createPageUrl(actionPage)}>
        <motion.div
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            colorClasses[color]
          )}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </motion.div>
      </Link>
    </motion.div>
  );
}