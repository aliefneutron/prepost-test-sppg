import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { IconBookOpen, IconTrophy, IconLogOut, IconSettings } from './icons';

const AdminLayout: React.FC<{ children: React.ReactNode, title: string }> = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useContext(AuthContext);

  const handleLogout = () => {
    auth?.logout();
    navigate('/admin');
  };

  const isActive = (path: string) => location.pathname === path;

  const NavItem: React.FC<{ path: string; icon: React.ReactNode; label: string }> = ({ path, icon, label }) => (
    <a 
      onClick={() => navigate(path)} 
      className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive(path) 
          ? 'bg-blue-50 text-blue-600 font-semibold' 
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      {icon} {label}
    </a>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-white shadow-md flex flex-col hidden md:flex">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-blue-600">Admin Panel</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem path="/admin/dashboard" icon={<IconBookOpen className="w-5 h-5"/>} label="Dashboard" />
          <NavItem path="/admin/questions" icon={<IconBookOpen className="w-5 h-5"/>} label="Manage Questions" />
          <NavItem path="/admin/settings" icon={<IconSettings className="w-5 h-5"/>} label="Settings" />
          <NavItem path="/leaderboard" icon={<IconTrophy className="w-5 h-5"/>} label="Leaderboard" />
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
            <IconLogOut className="w-5 h-5"/> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="md:hidden flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            <button onClick={() => navigate('/admin/dashboard')} className="text-blue-600 font-semibold">Menu</button>
        </div>
        <h1 className="hidden md:block text-4xl font-bold text-gray-800 mb-8">{title}</h1>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;