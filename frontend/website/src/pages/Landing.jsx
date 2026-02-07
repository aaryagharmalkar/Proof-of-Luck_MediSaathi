import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Calendar, 
  Pill, 
  FileText, 
  Shield, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Bell,
  Activity,
  Users,
  Stethoscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: FileText,
    title: 'Medical Summariser',
    description: 'AI-powered analysis of your medical reports and doctor conversations',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    icon: Calendar,
    title: 'Doctor Appointments',
    description: 'Schedule visits with specialists based on your symptoms',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    icon: Pill,
    title: 'Medicine Management',
    description: 'Track prescriptions, set reminders, and never miss a dose',
    color: 'from-orange-500 to-amber-500'
  },
  {
    icon: Activity,
    title: 'Health Tracking',
    description: 'Monitor vital signs and get alerts for concerning trends',
    color: 'from-pink-500 to-rose-500'
  },
  {
    icon: MessageSquare,
    title: 'AI Health Assistant',
    description: 'Get instant answers to your health-related questions',
    color: 'from-purple-500 to-violet-500'
  },
  {
    icon: Shield,
    title: 'Emergency Alerts',
    description: 'One-tap emergency notifications to contacts and services',
    color: 'from-red-500 to-rose-500'
  }
];

const steps = [
  { number: '01', title: 'Create Your Profile', description: 'Set up your health profile with basic information and medical history' },
  { number: '02', title: 'Upload Health Records', description: 'Scan and digitize your medical reports for AI-powered insights' },
  { number: '03', title: 'Get Personalized Care', description: 'Receive tailored health recommendations and reminders' },
];

export default function Landing() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/Onboarding');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                MediSaathi
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate('/Login')}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl px-6"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">AI-Powered Healthcare</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                <span className="block bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  MediSaathi
                </span>
                <span className="block text-2xl sm:text-3xl lg:text-4xl mt-2 font-semibold text-gray-700">
                  Your Personal Healthcare Companion
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                MediSaathi manages your health records, appointments, prescriptions, and provides AI-powered medical insights — all in one unified platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/Login')}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl px-8 py-6 text-lg"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">Secure & Private</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">AI Powered</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-3xl blur-3xl opacity-20" />
                <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center">
                      <Activity className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Your Health Hub</h3>
                      <p className="text-sm text-gray-500">All-in-one health management</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">AI Report Analysis</span>
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="font-semibold text-gray-900">Upload & get instant insights</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Doctor Scheduler</span>
                        <Calendar className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="font-semibold text-gray-900">Book appointments easily</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Medicine Tracker</span>
                        <Bell className="w-4 h-4 text-purple-500" />
                      </div>
                      <p className="font-semibold text-gray-900">Never miss a dose</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Better Health
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive healthcare management powered by artificial intelligence
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:shadow-gray-100/50 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How MediSaathi Works
            </h2>
            <p className="text-lg text-gray-600">
              Get started in three simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className="text-7xl font-bold text-emerald-100 mb-4">{step.number}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 right-0 w-full h-0.5 bg-gradient-to-r from-emerald-200 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-500 to-teal-600">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Why Choose MediSaathi?
              </h2>
              <div className="space-y-4">
                {[
                  'AI-powered medical report analysis and insights',
                  'Secure and private health data storage',
                  'Smart medicine reminders with tracking',
                  '24/7 AI health assistant support',
                  'Emergency alerts to contacts and services',
                  'Seamless doctor appointment scheduling'
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-200 flex-shrink-0" />
                    <span className="text-white text-lg">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-8"
            >
              <div className="text-center">
                <div className="flex justify-center -space-x-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white flex items-center justify-center">
                    <Stethoscope className="w-8 h-8 text-white" />
                  </div>
                  <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Ready to take control of your health?</h3>
                <p className="text-emerald-100 mb-6">Join thousands of users who trust MediSaathi for their healthcare management</p>
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl px-8"
                >
                  Get Started Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                MediSaathi
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2024 MediSaathi. All rights reserved. Your health, our priority.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}