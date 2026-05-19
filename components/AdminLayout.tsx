import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { IconBookOpen, IconTrophy, IconLogOut, IconSettings, IconMenu, IconX } from './icons';

const AdminLayout: React.FC<{ children: React.ReactNode, title: string }> = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useContext(AuthContext);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('admin_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const newState = !prev;
      localStorage.setItem('admin_sidebar_open', String(newState));
      return newState;
    });
  };

  const handleLogout = () => {
    auth?.logout();
    navigate('/admin');
  };

  const isActive = (path: string) => location.pathname === path;

  const NavItem: React.FC<{ path: string; icon: React.ReactNode; label: string }> = ({ path, icon, label }) => (
    <a 
      onClick={() => {
        navigate(path);
        // Automatically close sidebar on mobile after clicking a link
        if (window.innerWidth < 768) {
          setIsSidebarOpen(false);
          localStorage.setItem('admin_sidebar_open', 'false');
        }
      }} 
      className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive(path) 
          ? 'bg-blue-50 text-blue-600 font-semibold' 
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      {icon} <span className="truncate">{label}</span>
    </a>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        className={`bg-white shadow-xl border-r border-gray-200 flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out
          fixed inset-y-0 left-0 md:static md:h-screen
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden'}
        `}
      >
        <div className="w-64 flex flex-col h-full">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-2xl font-bold text-blue-600">Admin Panel</h2>
            {/* Close button for Mobile only */}
            <button 
              onClick={toggleSidebar}
              className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 md:hidden transition-colors focus:outline-none"
              title="Close Menu"
            >
              <IconX className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavItem path="/admin/dashboard" icon={<IconBookOpen className="w-5 h-5"/>} label="Dashboard" />
            <NavItem path="/admin/questions" icon={<IconBookOpen className="w-5 h-5"/>} label="Manage Questions" />
            <NavItem path="/admin/settings" icon={<IconSettings className="w-5 h-5"/>} label="Settings" />
            <NavItem path="/leaderboard" icon={<IconTrophy className="w-5 h-5"/>} label="Leaderboard" />
          </nav>
          <div className="p-4 border-t">
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-semibold transition-colors"
            >
              <IconLogOut className="w-5 h-5"/> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Modern Header / Topbar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 md:px-6 justify-between shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none"
              title={isSidebarOpen ? "Sembunyikan Menu" : "Tampilkan Menu"}
            >
              <IconMenu className="w-6 h-6" />
            </button>
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden sm:inline-block text-sm text-gray-500 font-semibold bg-gray-100 px-3 py-1 rounded-full border">
              Administrator
            </span>
            {/* Quick Logout for larger screens */}
            <button 
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              title="Logout"
            >
              <IconLogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </header>

        {/* Inner Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;