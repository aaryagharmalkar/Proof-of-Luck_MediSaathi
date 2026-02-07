import React, { useState } from 'react';
import { AlertTriangle, Phone, Mail, Ambulance, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

function safeStr(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object' && v !== null && typeof v.name === 'string') return v.name;
  if (typeof v === 'object' && v !== null && typeof v.name === 'number') return String(v.name);
  return '';
}

export default function EmergencyButton({ userProfile, profile }) {
  const p = userProfile || profile;
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleEmergency = async () => {
    setIsTriggering(true);
    
    // Simulate emergency notification process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsTriggering(false);
    setIsComplete(true);
    
    setTimeout(() => {
      setIsComplete(false);
      setIsOpen(false);
    }, 3000);
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg shadow-red-500/30"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          boxShadow: ['0 10px 25px -5px rgba(239, 68, 68, 0.3)', '0 10px 35px -5px rgba(239, 68, 68, 0.5)', '0 10px 25px -5px rgba(239, 68, 68, 0.3)']
        }}
        transition={{ 
          boxShadow: { duration: 2, repeat: Infinity }
        }}
      >
        <AlertTriangle className="w-6 h-6" />
      </motion.button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Emergency Alert
            </DialogTitle>
            <DialogDescription>
              This will immediately notify your emergency contacts, doctor, and medical services.
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="py-8 text-center"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-600 mb-2">
                  🚨 Emergency Alert Sent Successfully
                </h3>
                <p className="text-sm text-gray-500">
                  Your emergency contacts have been notified
                </p>
              </motion.div>
            ) : isTriggering ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8"
              >
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
                  <div className="text-center">
                    <p className="font-medium text-gray-900">Sending emergency alerts...</p>
                    <p className="text-sm text-gray-500 mt-1">Please wait</p>
                  </div>
                  <div className="w-full space-y-2 mt-4">
                    <NotificationStep icon={Phone} label="Notifying emergency contact" done />
                    <NotificationStep icon={Mail} label="Sending email to doctor" done />
                    <NotificationStep icon={Ambulance} label="Alerting medical services" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Notifications will be sent to:</h4>
                  <ul className="space-y-2 text-sm text-red-700">
                    <li className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>Emergency Contact: {safeStr(p?.emergency_contact) || 'Not set'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>Primary Doctor: {safeStr(p?.primary_doctor) || 'Not set'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Ambulance className="w-4 h-4" />
                      <span>Nearby Medical Services</span>
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600"
                    onClick={handleEmergency}
                  >
                    Confirm Emergency
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NotificationStep({ icon: Icon, label, done }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-green-100' : 'bg-gray-100'}`}>
        {done ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>
      <span className={done ? 'text-green-700' : 'text-gray-500'}>{label}</span>
    </div>
  );
}