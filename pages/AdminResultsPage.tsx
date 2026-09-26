import React, { useState, useMemo, useEffect } from 'react';
import { UserScore, TestType } from '../types';
import AdminLayout from '../components/AdminLayout';
import { IconTrash, IconEdit, IconX, IconSave } from '../components/icons';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { useLocation } from 'react-router-dom';

const AdminResultsPage: React.FC = () => {
    const location = useLocation();
    
    const queryParams = new URLSearchParams(location.search);
    const initialSppg = queryParams.get('sppg') || '';
    const initialDate = queryParams.get('date') !== null ? queryParams.get('date')! : (() => {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    })();

    const [scores, setScores] = useState<UserScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TestType | 'PENDING_POST_TEST'>(TestType.PRE_TEST);
    const [searchTerm, setSearchTerm] = useState(initialSppg);
    const [filterDate, setFilterDate] = useState<string>(initialDate);
    const [editingScore, setEditingScore] = useState<UserScore | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'timestamp'>('name');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('csv');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const sppgParam = params.get('sppg');
        const dateParam = params.get('date');
        
        if (sppgParam !== null) setSearchTerm(sppgParam);
        if (dateParam !== null) setFilterDate(dateParam);
    }, [location.search]);
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

    const filteredScores = useMemo(() => {
        return scores
            .filter((score) => {
                if (activeTab === 'PENDING_POST_TEST') {
                    if (score.testType !== TestType.PRE_TEST) return false;
                    const cleanKtp = score.ktp.replace(/\D/g, '');
                    const hasPostTest = scores.some(s => s.testType === TestType.POST_TEST && s.ktp.replace(/\D/g, '') === cleanKtp);
                    return !hasPostTest;
                }
                return score.testType === activeTab;
            })
            .filter(score => activeTab === TestType.POST_TEST ? score.score >= 80 : true)
            .filter((score) => {
                const searchLower = searchTerm.toLowerCase();
                return (
                    score.name.toLowerCase().includes(searchLower) ||
                    score.ktp.includes(searchTerm) ||
                    score.phone.includes(searchTerm) ||
                    score.sppg.toLowerCase().includes(searchLower)
                );
            })
            .filter((score) => {
                if (!filterDate) return true;
                const d = new Date(score.timestamp);
                const scoreDateYMD = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                return scoreDateYMD === filterDate;
            })
            .sort((a, b) => {
                if (sortBy === 'name') {
                    return a.name.localeCompare(b.name, 'id');
                }
                return b.timestamp - a.timestamp;
            });
    }, [scores, activeTab, searchTerm, filterDate, sortBy]);

    const deleteScore = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'scores', id));
            setConfirmDeleteId(null);
        } catch (error) {
            console.error("Error deleting score: ", error);
            alert("Failed to delete score.");
        }
    };

    const handleSaveEdit = async () => {
        if (!editingScore || !editingScore.id) return;
        try {
            const docRef = doc(db, 'scores', editingScore.id);
            await updateDoc(docRef, {
                name: editingScore.name,
                ktp: editingScore.ktp,
                phone: editingScore.phone,
                birthInfo: editingScore.birthInfo,
                address: editingScore.address,
                sppg: editingScore.sppg,
                score: editingScore.score
            });
            setEditingScore(null);
        } catch (error) {
            console.error("Error updating score: ", error);
            alert("Failed to update record.");
        }
    };

    const downloadCSV = () => {
        const headers = ['Name', 'KTP', 'Phone', 'TTL', 'Address', 'SPPG', 'Score', 'Test Type', 'Date'];
        const rows = filteredScores.map(s => [
            s.name,
            s.ktp,
            s.phone,
            s.birthInfo || '',
            s.address.replace(/\n/g, ' '),
            s.sppg,
            s.score,
            s.testType,
            new Date(s.timestamp).toLocaleString()
        ]);
        
        // Dynamically name files with SPPG name if all filtered records belong to the same SPPG
        const uniqueSppgs = Array.from(new Set(filteredScores.map(s => s.sppg.trim())));
        const sppgSuffix = uniqueSppgs.length === 1 ? `_${uniqueSppgs[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_')}` : '';
        
        if (exportFormat === 'xlsx') {
            // Excel Export
            const data = filteredScores.map(s => ({
                'Name': s.name,
                'KTP': s.ktp,
                'Phone': s.phone,
                'TTL': s.birthInfo || '-',
                'Address': s.address.replace(/\n/g, ' '),
                'SPPG': s.sppg,
                'Score': s.score,
                'Test Type': s.testType,
                'Date': new Date(s.timestamp).toLocaleString('id-ID')
            }));
            
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Results');
            XLSX.writeFile(wb, `results_${activeTab === 'PENDING_POST_TEST' ? 'Belum_Post_Test' : activeTab}${sppgSuffix}_${filterDate || 'all'}.xlsx`);
        } else {
            // CSV Export compatible with Excel (semicolon + BOM)
            const csvContent = [
                headers.join(';'),
                ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
            ].join('\n');
            
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `results_${activeTab === 'PENDING_POST_TEST' ? 'Belum_Post_Test' : activeTab}${sppgSuffix}_${filterDate || 'all'}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const exportPassed = () => {
        let passedScores = scores.filter(s => s.testType === TestType.POST_TEST && s.score >= 80);

        if (filterDate) {
            passedScores = passedScores.filter(s => {
                const d = new Date(s.timestamp);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                return dateStr === filterDate;
            });
        }

        // Sort alphabetically
        passedScores.sort((a, b) => a.name.localeCompare(b.name, 'id'));

        if (passedScores.length === 0) {
            alert(`Tidak ada data peserta lulus untuk tanggal ${filterDate || 'tersebut'}.`);
            return;
        }

        const headers = ['Tanggal', 'NIK', 'Nama Lengkap', 'Tempat/Tgl Lahir', 'Alamat Lengkap', 'Nomer HP', 'Nama SPPG', 'Skor', 'Tipe Test'];
        const rows = passedScores.map(s => [
            new Date(s.timestamp).toLocaleDateString('id-ID'),
            s.ktp,
            s.name,
            s.birthInfo || '',
            s.address.replace(/\n/g, ' '),
            s.phone,
            s.sppg,
            s.score,
            s.testType
        ]);

        // Dynamically name files with SPPG name if all filtered records belong to the same SPPG
        const uniqueSppgs = Array.from(new Set(passedScores.map(s => s.sppg.trim())));
        const sppgSuffix = uniqueSppgs.length === 1 ? `_${uniqueSppgs[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_')}` : '';

        if (exportFormat === 'xlsx') {
            // Excel Export
            const data = passedScores.map(s => ({
                'Tanggal': new Date(s.timestamp).toLocaleDateString('id-ID'),
                'NIK': s.ktp,
                'Nama Lengkap': s.name,
                'Tempat/Tgl Lahir': s.birthInfo || '-',
                'Alamat Lengkap': s.address.replace(/\n/g, ' '),
                'Nomer HP': s.phone,
                'Nama SPPG': s.sppg,
                'Skor': s.score,
                'Tipe Test': s.testType
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Passed Participants');
            XLSX.writeFile(wb, `Lulus${sppgSuffix}_${filterDate || 'Semua_Tanggal'}.xlsx`);
        } else {
            // CSV Export compatible with Excel (semicolon + BOM)
            const csvContent = [
                headers.join(';'),
                ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
            ].join('\n');

            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Lulus${sppgSuffix}_${filterDate || 'Semua_Tanggal'}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <AdminLayout title="Participant Results">
            <div className="space-y-6">
                {/* Row 1: Filters, Search, and Action Buttons */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
                    {/* Left side: Search & Filter Inputs */}
                    <div className="flex flex-col md:flex-row flex-1 gap-3 items-stretch md:items-center">
                        <input 
                            type="text" 
                            placeholder="Search name, KTP, or SPPG..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none flex-1 min-w-[200px] text-sm"
                        />
                        
                        <div className="flex items-center gap-2 bg-white px-2 border border-gray-300 rounded-lg shrink-0">
                            <span className="text-gray-500 text-sm">Urutkan:</span>
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'name' | 'timestamp')}
                                className="py-2 focus:outline-none bg-transparent font-medium text-gray-700 cursor-pointer text-sm"
                            >
                                <option value="name">🔤 Abjad (A-Z)</option>
                                <option value="timestamp">⏱️ Terbaru</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-white px-2 border border-gray-300 rounded-lg shrink-0">
                            <span className="text-gray-500 text-sm">Tanggal:</span>
                            <input 
                                type="date" 
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="py-2 focus:outline-none bg-transparent text-sm cursor-pointer"
                            />
                            {filterDate && (
                                <button 
                                    onClick={() => setFilterDate('')}
                                    className="text-gray-400 hover:text-red-500 px-1 font-bold"
                                    title="Reset Tanggal"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Right side: Summary & Exports */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-300 rounded-lg shrink-0">
                            <span className="text-gray-500 text-sm font-medium">Format:</span>
                            <select 
                                value={exportFormat}
                                onChange={(e) => setExportFormat(e.target.value as 'xlsx' | 'csv')}
                                className="focus:outline-none bg-transparent font-bold text-gray-700 cursor-pointer text-sm"
                            >
                                <option value="xlsx">📊 Excel (.xlsx)</option>
                                <option value="csv">📄 CSV (.csv)</option>
                            </select>
                        </div>

                        <div className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 whitespace-nowrap">
                            Total: <span className="text-blue-700">{filteredScores.length}</span> Peserta
                        </div>

                        <button 
                            onClick={exportPassed}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm text-sm transition-all"
                        >
                            {exportFormat === 'xlsx' ? '📊 Export Excel Lulus' : '📄 Export CSV Lulus'}
                        </button>
                        
                        <button 
                            onClick={downloadCSV}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-1.5 shadow-sm text-sm transition-all"
                        >
                            {exportFormat === 'xlsx' 
                                ? `📊 Export Excel (${activeTab === 'PENDING_POST_TEST' ? 'Belum Post-Test' : activeTab})` 
                                : `📄 Export CSV (${activeTab === 'PENDING_POST_TEST' ? 'Belum Post-Test' : activeTab})`
                            }
                        </button>
                    </div>
                </div>

                {/* Row 2: Category Tabs */}
                <div className="border-b border-gray-200 flex justify-between items-center overflow-x-auto">
                    <div className="flex space-x-1">
                        <button
                            onClick={() => setActiveTab(TestType.PRE_TEST)}
                            className={`py-3 px-6 font-bold transition-all flex items-center gap-2 whitespace-nowrap text-sm border-b-2 ${
                                activeTab === TestType.PRE_TEST
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-blue-500 hover:border-gray-300'
                            }`}
                        >
                            📝 Pre-Test
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === TestType.PRE_TEST ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                {scores.filter(s => s.testType === TestType.PRE_TEST).length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab(TestType.POST_TEST)}
                            className={`py-3 px-6 font-bold transition-all flex items-center gap-2 whitespace-nowrap text-sm border-b-2 ${
                                activeTab === TestType.POST_TEST
                                    ? 'border-green-600 text-green-600 font-bold'
                                    : 'border-transparent text-gray-500 hover:text-green-500 hover:border-gray-300'
                            }`}
                        >
                            🎓 Post-Test
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === TestType.POST_TEST ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {scores.filter(s => s.testType === TestType.POST_TEST && s.score >= 80).length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('PENDING_POST_TEST')}
                            className={`py-3 px-6 font-bold transition-all flex items-center gap-2 whitespace-nowrap text-sm border-b-2 ${
                                activeTab === 'PENDING_POST_TEST'
                                    ? 'border-orange-600 text-orange-600 font-bold'
                                    : 'border-transparent text-gray-500 hover:text-orange-500 hover:border-gray-300'
                            }`}
                        >
                            ⏳ Belum Post-Test
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === 'PENDING_POST_TEST' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                                {scores.filter(score => {
                                    if (score.testType !== TestType.PRE_TEST) return false;
                                    const cleanKtp = score.ktp.replace(/\D/g, '');
                                    const hasPostTest = scores.some(s => s.testType === TestType.POST_TEST && s.ktp.replace(/\D/g, '') === cleanKtp);
                                    return !hasPostTest;
                                }).length}
                            </span>
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Participant</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Details</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Score</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredScores.length > 0 ? filteredScores.map((s) => (
                                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{s.name}</div>
                                            <div className="text-xs text-gray-500">KTP: {s.ktp}</div>
                                            <div className="text-xs text-blue-600 font-medium">WA: {s.phone}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs"><strong>TTL:</strong> {s.birthInfo || '-'}</div>
                                            <div className="text-xs"><strong>SPPG:</strong> {s.sppg}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-xs" title={s.address}>
                                                <strong>Addr:</strong> {s.address}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-bold px-2 py-1 rounded text-lg ${s.score >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                                                {s.score}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            {confirmDeleteId === s.id ? (
                                                <div className="inline-flex items-center gap-2 bg-red-50 p-1.5 rounded border border-red-200 animate-pulse">
                                                    <span className="text-xs text-red-600 font-bold px-1">Hapus?</span>
                                                    <button 
                                                        onClick={() => deleteScore(s.id)} 
                                                        className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 font-bold shadow-sm"
                                                    >
                                                        Ya
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmDeleteId(null)} 
                                                        className="text-gray-500 text-xs px-2 py-1 rounded hover:bg-gray-200 bg-white border border-gray-200 font-medium"
                                                    >
                                                        Batal
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => setEditingScore(s)}
                                                        className="text-blue-500 hover:text-blue-700 p-2"
                                                        title="Edit"
                                                    >
                                                        <IconEdit className="w-5 h-5"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmDeleteId(s.id)}
                                                        className="text-red-500 hover:text-red-700 p-2"
                                                        title="Delete"
                                                    >
                                                        <IconTrash className="w-5 h-5"/>
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">No records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {editingScore && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-xl font-bold">Edit Participant Record</h2>
                            <button onClick={() => setEditingScore(null)} className="text-gray-500 hover:text-gray-700">
                                <IconX className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input 
                                        type="text" 
                                        value={editingScore.name} 
                                        onChange={(e) => setEditingScore({...editingScore, name: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">KTP / NIK</label>
                                    <input 
                                        type="text" 
                                        value={editingScore.ktp} 
                                        onChange={(e) => setEditingScore({...editingScore, ktp: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone (WA)</label>
                                    <input 
                                        type="text" 
                                        value={editingScore.phone} 
                                        onChange={(e) => setEditingScore({...editingScore, phone: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">TTL</label>
                                    <input 
                                        type="text" 
                                        value={editingScore.birthInfo || ''} 
                                        onChange={(e) => setEditingScore({...editingScore, birthInfo: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SPPG</label>
                                    <input 
                                        type="text" 
                                        value={editingScore.sppg} 
                                        onChange={(e) => setEditingScore({...editingScore, sppg: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                                    <input 
                                        type="number" 
                                        value={editingScore.score} 
                                        onChange={(e) => setEditingScore({...editingScore, score: Number(e.target.value)})}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <textarea 
                                        value={editingScore.address} 
                                        onChange={(e) => setEditingScore({...editingScore, address: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-lg">
                            <button 
                                onClick={() => setEditingScore(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                            >
                                <IconSave className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminResultsPage;
