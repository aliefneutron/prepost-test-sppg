import React, { useState, useMemo, useEffect } from 'react';
import { UserScore, TestType } from '../types';
import AdminLayout from '../components/AdminLayout';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import * as XLSX from 'xlsx';

interface RekapRow {
    sppg: string;
    date: string; // YYYY-MM-DD
    rawDate: number;
    preTestCount: number;
    postTestCount: number;
}
// String similarity logic removed, now strictly grouping by Date

const AdminRekapPage: React.FC = () => {
    const [scores, setScores] = useState<UserScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');

    useEffect(() => {
        const q = query(collection(db, 'scores'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const scoresData: UserScore[] = [];
            querySnapshot.forEach((doc) => {
                scoresData.push({ id: doc.id, ...doc.data() } as UserScore);
            });
            setScores(scoresData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const rekapData = useMemo(() => {
        const groupedData: Record<string, RekapRow> = {};

        scores.forEach(score => {
            const dateStr = new Date(score.timestamp).toLocaleDateString('id-ID'); // e.g., "15/8/2023"
            const sppgName = score.sppg ? score.sppg.trim().toUpperCase() : 'TIDAK DIKETAHUI';

            const groupKey = `${dateStr}_${sppgName}`;

            if (!groupedData[groupKey]) {
                groupedData[groupKey] = {
                    sppg: sppgName,
                    date: dateStr,
                    rawDate: new Date(score.timestamp).setHours(0, 0, 0, 0),
                    preTestCount: 0,
                    postTestCount: 0
                };
            }

            const row = groupedData[groupKey];

            if (score.testType === TestType.PRE_TEST) {
                row.preTestCount++;
            } else if (score.testType === TestType.POST_TEST) {
                row.postTestCount++;
            }
        });

        let allRows: RekapRow[] = Object.values(groupedData);

        return allRows.filter(row => 
            row.sppg.includes(searchTerm.toUpperCase()) || 
            row.date.includes(searchTerm)
        ).sort((a, b) => {
             // Sort by date descending (newest first)
             return b.rawDate - a.rawDate;
        });
    }, [scores, searchTerm]);

    const downloadExport = () => {
        if (rekapData.length === 0) {
            alert('Tidak ada data untuk diekspor.');
            return;
        }

        if (exportFormat === 'xlsx') {
            const data = rekapData.map(r => ({
                'Tanggal Pelaksanaan': r.date,
                'Nama SPPG': r.sppg,
                'Jumlah Peserta Pre Test': r.preTestCount,
                'Jumlah Peserta Post Test': r.postTestCount
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Rekapitulasi');
            XLSX.writeFile(wb, `Rekapitulasi_SPPG.xlsx`);
        } else {
            const headers = ['Tanggal Pelaksanaan', 'Nama SPPG', 'Jumlah Peserta Pre Test', 'Jumlah Peserta Post Test'];
            const rows = rekapData.map(r => [
                r.date,
                r.sppg,
                r.preTestCount,
                r.postTestCount
            ]);

            const csvContent = [
                headers.join(';'),
                ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
            ].join('\n');

            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Rekapitulasi_SPPG.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <AdminLayout title="Rekapitulasi SPPG">
            <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex-1 w-full">
                        <input 
                            type="text" 
                            placeholder="Cari Nama SPPG atau Tanggal..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                        <select 
                            value={exportFormat}
                            onChange={(e) => setExportFormat(e.target.value as 'xlsx' | 'csv')}
                            className="bg-white px-3 py-2 border border-gray-300 rounded-lg focus:outline-none font-medium text-gray-700 text-sm"
                        >
                            <option value="xlsx">📊 Excel (.xlsx)</option>
                            <option value="csv">📄 CSV (.csv)</option>
                        </select>
                        <button 
                            onClick={downloadExport}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm text-sm transition-all"
                        >
                            Unduh Rekap
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center px-1">
                    <h2 className="text-lg font-bold text-gray-700">
                        Total Pelaksanaan Test: <span className="text-blue-600">{rekapData.length}</span> SPPG
                    </h2>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Memuat data...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase w-12 text-center">No</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Nama SPPG</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Tanggal Pelaksanaan</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Peserta Pre Test</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Peserta Post Test</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rekapData.length > 0 ? rekapData.map((row, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-4 text-center font-bold text-gray-500">{idx + 1}</td>
                                            <td className="p-4 font-bold text-gray-800">{row.sppg}</td>
                                            <td className="p-4 text-gray-600 font-medium">{row.date}</td>
                                            <td className="p-4 text-center">
                                                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 font-bold rounded-full">
                                                    {row.preTestCount}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 font-bold rounded-full">
                                                    {row.postTestCount}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-gray-500">Tidak ada data rekapitulasi.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminRekapPage;
