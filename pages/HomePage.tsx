
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TestType } from '../types';
import { IconBookOpen, IconTrophy, IconSettings } from '../components/icons';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isPreTestActive, setIsPreTestActive] = useState(true);
  const [isPostTestActive, setIsPostTestActive] = useState(true);

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isPreTestActive !== undefined) setIsPreTestActive(data.isPreTestActive);
        if (data.isPostTestActive !== undefined) setIsPostTestActive(data.isPostTestActive);
      }
    });

    return () => unsubscribe();
  }, []);

  const ActionCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; }> = ({ title, description, icon, onClick, disabled }) => (
    <div
      onClick={disabled ? undefined : onClick}
      className={`bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer transform hover:scale-105 transition-transform duration-300'}`}
    >
      <div className={`rounded-full p-4 mb-4 ${disabled ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
      {disabled && <p className="mt-2 text-sm font-bold text-red-500">Currently Disabled</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-800">Assessment Food Handler</h1>
        <p className="text-xl text-gray-500 mt-2">Ready to test your knowledge?</p>
      </header>

      <main className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ActionCard
            title="Pre-Test"
            description="Take the initial assessment to gauge your baseline knowledge."
            icon={<IconBookOpen className="w-8 h-8" />}
            onClick={() => navigate(`/test/${TestType.PRE_TEST}`)}
            disabled={!isPreTestActive}
          />
          <ActionCard
            title="Post-Test"
            description="Take the final assessment to measure your knowledge improvement."
            icon={<IconBookOpen className="w-8 h-8" />}
            onClick={() => navigate(`/test/${TestType.POST_TEST}`)}
            disabled={!isPostTestActive}
          />
        </div>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <ActionCard
            title="View Leaderboard"
            description="See how your scores compare with others."
            icon={<IconTrophy className="w-8 h-8" />}
            onClick={() => navigate('/leaderboard')}
          />
          <ActionCard
            title="Admin Panel"
            description="Manage test questions and application settings."
            icon={<IconSettings className="w-8 h-8" />}
            onClick={() => navigate('/admin')}
          />
        </div>
      </main>
      
      <footer className="mt-12 text-center text-gray-400">
        <p>&copy; 2026 Alief Neutron. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
