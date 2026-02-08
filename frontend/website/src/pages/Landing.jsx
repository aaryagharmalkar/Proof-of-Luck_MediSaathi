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
    <div className="min-h-screen relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100">
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-gradient-to-tr from-emerald-50/50 to-teal-50/50 rounded-full blur-3xl opacity-50" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white fill-current" />
              </div>
              <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                MediSaathi
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/role-select")}
                className="rounded-xl px-5 text-gray-600 hover:text-teal-700 hover:bg-teal-50 font-bold"
              >
                For Doctors
              </Button>
              <Button
                onClick={() => navigate("/Login")}
                className="bg-gray-900 hover:bg-black text-white font-bold rounded-xl px-6 h-10 shadow-lg shadow-gray-900/20 transition-all hover:scale-105 active:scale-95"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md border border-white/40 rounded-full mb-8 shadow-sm">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-bold text-teal-800 tracking-wide uppercase">AI-Powered Healthcare</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-8 tracking-tight">
                Your Health, <br />
                <span className="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                  Reimagined.
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-lg font-medium">
                MediSaathi synthesizes your records, appointments, and prescriptions into one seamless, AI-driven experience.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/Login')}
                  className="bg-gray-900 hover:bg-black text-white rounded-2xl px-8 py-7 text-lg font-bold shadow-xl shadow-gray-900/20 transition-all hover:-translate-y-1"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline" 
                  onClick={() => navigate('/role-select')}
                  className="bg-white/50 backdrop-blur border-white/60 text-gray-700 hover:bg-white rounded-2xl px-8 py-7 text-lg font-bold shadow-sm"
                >
                  I'm a Doctor
                </Button>
              </div>

              <div className="flex items-center gap-6 mt-12">
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-12 h-12 rounded-full border-2 border-white bg-gray-200" />
                  ))}
                </div>
                <div>
                  <div className="flex text-yellow-500 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                  <p className="text-sm font-bold text-gray-600">Trusted by 10,000+ users</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative z-10 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 p-4 shadow-2xl">
                 <div className="bg-white/80 rounded-[2rem] p-8 shadow-inner border border-white/40">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-extrabold text-gray-900">Health Hub</h3>
                        <p className="text-gray-500 font-medium">Your daily summary</p>
                      </div>
                      <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                        <Activity className="w-6 h-6 text-teal-600" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                             <Calendar className="w-6 h-6" />
                          </div>
                          <div>
                             <h4 className="font-bold text-gray-900">Cardiologist Visit</h4>
                             <p className="text-sm text-gray-500">Tomorrow at 10:00 AM</p>
                          </div>
                       </div>
                       
                       <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                             <Pill className="w-6 h-6" />
                          </div>
                          <div>
                             <h4 className="font-bold text-gray-900">Vitamin D</h4>
                             <p className="text-sm text-gray-500">1 pill after lunch</p>
                          </div>
                       </div>

                       <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-teal-500/20 mt-6">
                          <div className="flex items-center gap-3 mb-2">
                             <Sparkles className="w-5 h-5 opacity-80" />
                             <span className="font-bold opacity-90">AI Warning</span>
                          </div>
                          <p className="text-sm font-medium leading-relaxed opacity-90">
                             "Your recent blood report suggests slightly low iron levels. Consider adding spinach to your diet."
                          </p>
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Complete Health Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
              We've combined everything you need into one elegant dashboard.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/50 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-gray-200/80 transition-all duration-300"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 font-medium leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Three Steps to Better Health
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative bg-white/40 backdrop-blur rounded-[2rem] p-8 border border-white/50"
              >
                <div className="text-7xl font-extrabold text-gray-200/80 absolute top-4 right-6 pointer-events-none">{step.number}</div>
                <div className="relative z-10 pt-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600 font-medium">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us - Large Float Card */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gray-900 rounded-[3rem] overflow-hidden relative shadow-2xl"
          >
            {/* Dark blobs for inside the card */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-900/30 rounded-full blur-3xl" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/30 rounded-full blur-3xl" />
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center p-12 lg:p-20 relative z-10">
              <div>
                <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-8 tracking-tight">
                  Why Choose MediSaathi?
                </h2>
                <div className="space-y-6">
                  {[
                    'AI-powered medical report analysis and insights',
                    'Secure and private health data storage',
                    'Smart medicine reminders with tracking',
                    '24/7 AI health assistant support',
                    'Emergency alerts to contacts and services'
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4"
                    >
                      <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/50">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                      </div>
                      <span className="text-gray-200 text-lg font-medium">{item}</span>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-12 flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    onClick={handleGetStarted}
                    className="bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl px-10 h-14 text-lg shadow-lg shadow-teal-500/25 transition-transform hover:scale-105"
                  >
                    Get Started Now
                  </Button>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 lg:p-12 text-center backdrop-blur-md">
                <div className="flex justify-center -space-x-4 mb-8">
                   {[Users, Stethoscope, Heart].map((Icon, i) => (
                      <div key={i} className="w-20 h-20 rounded-2xl bg-gray-800 border-4 border-gray-900 flex items-center justify-center shadow-lg">
                        <Icon className="w-8 h-8 text-gray-400" />
                      </div>
                   ))}
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">Ready to start?</h3>
                <p className="text-gray-400 text-lg mb-0">Join thousands of users who trust MediSaathi for their healthcare management.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200/50 bg-white/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="text-xl font-extrabold text-gray-900 tracking-tight">
                MediSaathi
              </span>
            </div>
            <p className="text-gray-500 font-medium text-sm">
              © 2024 MediSaathi. All rights reserved. Your health, our priority.
            </p>
        </div>
      </footer>
    </div>
  );
}