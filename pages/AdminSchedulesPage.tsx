import React, { useState, useEffect } from 'react';
import { Schedule } from '../types';
import AdminLayout from '../components/AdminLayout';
import { IconTrash } from '../components/icons';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';

type ScheduleMode = 'sppg' | 'bebas';

const AdminSchedulesPage: React.FC = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);

    const [mode, setMode] = useState<ScheduleMode>('sppg');
    const [selectedKegiatanOption, setSelectedKegiatanOption] = useState('');
    const [kegiatanName, setKegiatanName] = useState('');
    const [sppgFixed, setSppgFixed] = useState('');

    const dateObj = new Date();
    const localDateStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
    const [date, setDate] = useState(localDateStr);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'schedules'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data: Schedule[] = [];
            querySnapshot.forEach((d) => {
                data.push({ id: d.id, ...d.data() } as Schedule);
            });
            setSchedules(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!kegiatanName.trim() || !date) {
            alert('Mohon isi nama kegiatan dan tanggal.');
            return;
        }
        if (mode === 'sppg' && !sppgFixed.trim()) {
            alert('Mohon isi nama SPPG.');
            return;
        }

        setIsSaving(true);
        try {
            await addDoc(collection(db, 'schedules'), {
                sppgName: kegiatanName.toUpperCase().trim(),
                date: date,
                // mode sppg: admin tentukan daftar nama SPPG → peserta pilih dari dropdown
                // mode bebas: peserta ketik sendiri nama TPP → tidak ada tppFixed
                tppFixed: mode === 'sppg' ? sppgFixed.toUpperCase().trim() : '',
            });
            setKegiatanName('');
            setSelectedKegiatanOption('');
            setSppgFixed('');
        } catch (error) {
            console.error('Error adding schedule: ', error);
            alert('Gagal menambahkan jadwal.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Yakin ingin menghapus jadwal ini?')) {
            try {
                await deleteDoc(doc(db, 'schedules', id));
            } catch (error) {
                console.error('Error deleting schedule: ', error);
                alert('Gagal menghapus jadwal.');
            }
        }
    };

    const groupedByDate = schedules.reduce<Record<string, Schedule[]>>((acc, s) => {
        if (!acc[s.date]) acc[s.date] = [];
        acc[s.date].push(s);
        return acc;
    }, {});

    return (
        <AdminLayout title="Kelola Jadwal Kegiatan">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* ── FORM TAMBAH ── */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Tambah Jadwal Baru</h3>

                    {/* Pilih Mode */}
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Jenis Kegiatan</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setMode('sppg')}
                                className={`p-3 rounded-lg border-2 text-sm font-bold text-left transition-all ${
                                    mode === 'sppg'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                <span className="block text-base mb-0.5">🏢</span>
                                Kegiatan SPPG
                                <span className="block text-xs font-normal mt-1">
                                    Peserta <strong>pilih</strong> nama SPPG dari daftar
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('bebas')}
                                className={`p-3 rounded-lg border-2 text-sm font-bold text-left transition-all ${
                                    mode === 'bebas'
                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                <span className="block text-base mb-0.5">🍽️</span>
                                Kegiatan Bebas
                                <span className="block text-xs font-normal mt-1">
                                    Peserta <strong>tulis sendiri</strong> nama TPP/usaha
                                </span>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Kegiatan</label>
                            <select
                                value={selectedKegiatanOption}
                                onChange={(e) => {
                                    setSelectedKegiatanOption(e.target.value);
                                    if (e.target.value !== 'LAINNYA') {
                                        setKegiatanName(e.target.value);
                                    } else {
                                        setKegiatanName('');
                                    }
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                required
                            >
                                <option value="" disabled>-- Pilih Nama Kegiatan --</option>
                                <option value="PELATIHAN KEAMANAN PANGAN SPPG">PELATIHAN KEAMANAN PANGAN SPPG</option>
                                <option value="PELATIHAN KEAMANAN PANGAN TPP">PELATIHAN KEAMANAN PANGAN TPP</option>
                                <option value="LAINNYA">Lainnya (Tulis Sendiri)...</option>
                            </select>
                            
                            {selectedKegiatanOption === 'LAINNYA' && (
                                <input
                                    type="text"
                                    value={kegiatanName}
                                    onChange={(e) => setKegiatanName(e.target.value)}
                                    placeholder="Tulis nama kegiatan di sini..."
                                    className="w-full px-4 py-2 mt-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50"
                                    required
                                />
                            )}
                        </div>

                        {mode === 'sppg' && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <label className="block text-sm font-semibold text-blue-700 mb-1">Nama SPPG</label>
                                <input
                                    type="text"
                                    value={sppgFixed}
                                    onChange={(e) => setSppgFixed(e.target.value)}
                                    placeholder="Contoh: SPPG MANDIRI SEJAHTERA"
                                    className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    required
                                />
                                <p className="text-xs text-blue-500 mt-1">
                                    ✅ Tambahkan satu per satu untuk setiap SPPG. Peserta akan <strong>memilih dari daftar ini</strong>.
                                </p>
                            </div>
                        )}

                        {mode === 'bebas' && (
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <p className="text-xs text-purple-600 leading-relaxed">
                                    ✏️ Tidak perlu menambahkan nama TPP. Peserta akan <strong>mengisi sendiri</strong> nama TPP/usaha mereka saat ujian.
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Pertemuan</label>
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
                            className={`w-full text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50 ${
                                mode === 'sppg' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
                            }`}
                        >
                            {isSaving ? 'Menyimpan...' : '+ Tambah Jadwal'}
                        </button>
                    </form>
                </div>

                {/* ── DAFTAR JADWAL ── */}
                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Daftar Jadwal Kegiatan</h3>
                    {loading ? (
                        <p className="text-gray-500">Memuat jadwal...</p>
                    ) : schedules.length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(groupedByDate).map(([groupDate, items]) => {
                                const dNow = new Date();
                                const lDate = dNow.getFullYear() + '-' + String(dNow.getMonth() + 1).padStart(2, '0') + '-' + String(dNow.getDate()).padStart(2, '0');
                                const isToday = groupDate === lDate;

                                return (
                                    <div key={groupDate} className={`border rounded-lg overflow-hidden ${isToday ? 'border-green-400' : 'border-gray-200'}`}>
                                        <div className={`px-4 py-2 flex items-center justify-between ${isToday ? 'bg-green-50' : 'bg-gray-50'}`}>
                                            <span className={`font-bold text-sm ${isToday ? 'text-green-700' : 'text-gray-600'}`}>
                                                📅 {groupDate}
                                                {isToday && (
                                                    <span className="ml-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Hari Ini</span>
                                                )}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium">{items.length} kegiatan</span>
                                        </div>
                                        <table className="w-full text-left border-collapse">
                                            <tbody>
                                                {items.map((s, idx) => {
                                                    const isSppgMode = !!s.tppFixed;
                                                    return (
                                                        <tr key={s.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-t border-gray-100`}>
                                                            <td className="p-3">
                                                                <div className="flex items-start gap-2">
                                                                    <span className="text-xs text-gray-400 mt-0.5">{idx + 1}.</span>
                                                                    <div>
                                                                        <p className="font-bold text-gray-800 text-sm">{s.sppgName}</p>
                                                                        {isSppgMode ? (
                                                                            <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-1 font-medium">
                                                                                🏢 SPPG: {s.tppFixed}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mt-1 font-medium">
                                                                                🍽️ Bebas — peserta isi TPP sendiri
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <button
                                                                    onClick={() => handleDelete(s.id)}
                                                                    className="text-red-500 hover:text-red-700 p-2"
                                                                    title="Hapus"
                                                                >
                                                                    <IconTrash className="w-5 h-5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
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
