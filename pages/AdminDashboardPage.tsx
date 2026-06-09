import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const AdminDashboardPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <AdminLayout title="Dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div 
                    onClick={() => navigate('/admin/questions')}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-blue-500">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Manage Questions</h3>
                    <p className="text-gray-500">Add, edit, delete, or import test questions.</p>
                </div>
                
                <div 
                    onClick={() => navigate('/admin/results')}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-yellow-500">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">View Results</h3>
                    <p className="text-gray-500">View and export participant data and test scores.</p>
                </div>

                <div 
                    onClick={() => navigate('/admin/rekap')}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-indigo-500">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Rekapitulasi SPPG</h3>
                    <p className="text-gray-500">Lihat rekap jumlah peserta per SPPG berdasarkan tanggal.</p>
                </div>
                
                <div 
                    onClick={() => navigate('/admin/settings')}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-green-500">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Settings</h3>
                    <p className="text-gray-500">Configure Google Sheets integration.</p>
                </div>

                <div 
                    onClick={() => navigate('/admin/schedules')}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-orange-500">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Kelola Jadwal</h3>
                    <p className="text-gray-500">Atur jadwal pelatihan SPPG untuk pilihan dropdown test.</p>
                </div>

                 <div 
                    onClick={() => navigate('/')}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-purple-500">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">View Main Site</h3>
                    <p className="text-gray-500">Go to the main homepage for test takers.</p>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminDashboardPage;