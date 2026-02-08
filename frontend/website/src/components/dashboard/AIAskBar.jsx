import React, { useState } from 'react';
import { Search, Sparkles, ArrowRight, CornerDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const AIAskBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const suggestions = [
    { text: "Explain my lab report", icon: "🧪" },
    { text: "Side effects of my meds", icon: "💊" },
    { text: "Monitor my BP trends", icon: "📈" }
  ];

  const handleSearch = () => {
    if (query.trim()) {
      navigate('/chatbot', { state: { initialQuery: query } });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative z-20">
      <div 
        className={`relative group bg-white rounded-[2rem] border border-white transition-all duration-300 overflow-hidden ${
          isFocused ? 'shadow-2xl ring-4 ring-teal-50/50' : 'shadow-xl hover:shadow-2xl'
        }`}
      >
        {/* Background Decorative Elements */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-50 to-blue-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none transition-opacity duration-500 ${isFocused ? 'opacity-80' : 'opacity-50'}`} />
        <div className={`absolute bottom-0 left-0 w-48 h-48 bg-purple-50 rounded-full blur-3xl -ml-16 -mb-16 opacity-30 pointer-events-none transition-opacity duration-500 ${isFocused ? 'opacity-60' : 'opacity-30'}`} />

        <div className="relative z-10 flex items-center p-2">
          <div className={`flex-shrink-0 pl-4 pr-3 transition-colors duration-300 ${isFocused ? 'text-teal-600' : 'text-gray-400'}`}>
             <Search className="w-6 h-6" />
          </div>
          
          <input
            type="text"
            className="flex-1 w-full bg-transparent border-none text-lg py-4 text-gray-900 placeholder-gray-400 focus:ring-0 focus:outline-none"
            placeholder="Ask MediSaathi anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />

         <button 
           onClick={handleSearch}
           className={`p-3 rounded-2xl transition-all duration-300 shadow-md ${
             query.trim() 
               ? 'bg-gray-900 text-white translate-x-0 opacity-100 hover:bg-black' 
               : 'bg-gray-100 text-gray-400 translate-x-2 opacity-0 w-0 p-0 overflow-hidden'
           }`}
         >
           <ArrowRight className="w-5 h-5" />
         </button>
        </div>
      </div>

      {/* Intelligent Suggestions */}
      <div className="mt-4 pl-4 flex flex-wrap gap-3 justify-center">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              navigate('/chatbot', { state: { initialQuery: item.text } });
            }}
            className="group flex items-center gap-2 px-4 py-2 bg-white hover:bg-white border border-transparent hover:border-teal-100 rounded-full text-sm text-gray-600 hover:text-teal-700 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <span className="opacity-70 group-hover:opacity-100 transition-opacity">{item.icon}</span>
            {item.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AIAskBar;
