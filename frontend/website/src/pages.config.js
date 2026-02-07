import Chatbot from './pages/Chatbot';
import Dashboard from './pages/Dashboard';
import DoctorScheduler from './pages/DoctorScheduler';
import History from './pages/History';
import Landing from './pages/Landing';
import MedicalSummariser from './pages/MedicalSummariser';
import Medicines from './pages/Medicines';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import Login from './pages/Login';
import __Layout from './Layout.jsx';


export const PAGES = {
    "chatbot": Chatbot,
    "dashboard": Dashboard,
    "doctor-scheduler": DoctorScheduler,
    "history": History,
    "landing": Landing,
    "login": Login,
    "medical-summariser": MedicalSummariser,
    "medicines": Medicines,
    "onboarding": Onboarding,
    "profile": Profile,
}

export const pagesConfig = {
    mainPage: "landing",
    Pages: PAGES,
    Layout: __Layout,
};