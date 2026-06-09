import React, { useState, useEffect } from 'react';
import { Schedule } from '../types';
import AdminLayout from '../components/AdminLayout';
import { IconTrash } from '../components/icons';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';

const AdminSchedulesPage: React.FC = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [sppgName, setSppgName] = useState('');
    // Use local time for default date
    const dateObj = new Date();
    const localDateStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
    const [date, setDate] = useState(localDateStr);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'schedules'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data: Schedule[] = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() } as Schedule);
            });
            setSchedules(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sppgName.trim() || !date) {
            alert('Mohon isi nama SPPG dan Tanggal.');
            return;
        }

        setIsSaving(true);
        try {
            await addDoc(collection(db, 'schedules'), {
                sppgName: sppgName.toUpperCase().trim(),
                date: date
            });
            setSppgName('');
        } catch (error) {
            console.error("Error adding schedule: ", error);
            alert("Gagal menambahkan jadwal.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Yakin ingin menghapus jadwal ini?')) {
            try {
                await deleteDoc(doc(db, 'schedules', id));
            } catch (error) {
                console.error("Error deleting schedule: ", error);
                alert("Gagal menghapus jadwal.");
            }
        }
    };

    return (
        <AdminLayout title="Kelola Jadwal SPPG">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Tambah Jadwal Baru</h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nama SPPG</label>
                            <input
                                type="text"
                                value={sppgName}
                                onChange={(e) => setSppgName(e.target.value)}
                                placeholder="Contoh: SPPG MANDIRI"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                        >
                            {isSaving ? 'Menyimpan...' : 'Tambah Jadwal'}
                        </button>
                    </form>
                </div>

                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Daftar Jadwal SPPG</h3>
                    {loading ? (
                        <p className="text-gray-500">Memuat jadwal...</p>
                    ) : schedules.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="p-3 text-sm font-bold text-gray-600">Tanggal</th>
                                        <th className="p-3 text-sm font-bold text-gray-600">Nama SPPG</th>
                                        <th className="p-3 text-sm font-bold text-gray-600 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedules.map((s) => {
                                        const dObj = new Date();
                                        const lDate = dObj.getFullYear() + '-' + String(dObj.getMonth() + 1).padStart(2, '0') + '-' + String(dObj.getDate()).padStart(2, '0');
                                        const isToday = s.date === lDate;

                                        return (
                                            <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="p-3">
                                                    <span className={`font-medium ${isToday ? 'text-green-600 font-bold' : 'text-gray-700'}`}>
                                                        {s.date} {isToday && '(Hari Ini)'}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-bold text-gray-800">{s.sppgName}</td>
                                                <td className="p-3 text-right">
                                                    <button 
                                                        onClick={() => handleDelete(s.id)}
                                                        className="text-red-500 hover:text-red-700 p-2"
                                                        title="Hapus"
                                                    >
                                                        <IconTrash className="w-5 h-5"/>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">Belum ada jadwal yang ditambahkan.</p>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminSchedulesPage;
