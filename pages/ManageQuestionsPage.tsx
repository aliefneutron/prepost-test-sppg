import React, { useState, useRef, useEffect } from 'react';
import { Question } from '../types';
import { IconTrash, IconPlus, IconUpload, IconEdit, IconSave, IconX } from '../components/icons';
import AdminLayout from '../components/AdminLayout';
import Papa from 'papaparse';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  query,
  orderBy
} from 'firebase/firestore';

const ManageQuestionsPage: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'questions'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const questionsData: Question[] = [];
            querySnapshot.forEach((doc) => {
                questionsData.push({ id: doc.id, ...doc.data() } as Question);
            });
            setQuestions(questionsData);
            setLoading(false);
        }, (error) => {
            console.error("Firestore error: ", error);
            if (error.code === 'permission-denied') {
                alert("Permission denied. Please check your Firestore Security Rules (set to Test Mode).");
            }
        });

        return () => unsubscribe();
    }, []);
    const [newQuestion, setNewQuestion] = useState({ text: '', options: ['', '', '', '', ''], correctIndex: 0 });
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Question | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index?: number) => {
        const { name, value } = e.target;
        if (name === 'option') {
            const newOptions = [...newQuestion.options];
            newOptions[index!] = value;
            setNewQuestion({ ...newQuestion, options: newOptions });
        } else if (name === 'correctIndex') {
            setNewQuestion({ ...newQuestion, correctIndex: parseInt(value) });
        } else {
            setNewQuestion({ ...newQuestion, text: value });
        }
    };

    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index?: number) => {
        if (!editForm) return;
        const { name, value } = e.target;
        if (name === 'option') {
            const newOptions = [...editForm.options];
            newOptions[index!] = value;
            setEditForm({ ...editForm, options: newOptions });
        } else if (name === 'correctIndex') {
            setEditForm({ ...editForm, correctAnswerIndex: parseInt(value) });
        } else {
            setEditForm({ ...editForm, questionText: value });
        }
    };
    
    const toggleQuestionActive = async (id: string) => {
        const question = questions.find(q => q.id === id);
        if (question) {
            await updateDoc(doc(db, 'questions', id), {
                isActive: !question.isActive
            });
        }
    };
    
    const bulkToggleActive = async (value: boolean) => {
        const batch = writeBatch(db);
        questions.forEach(q => {
            const qRef = doc(db, 'questions', q.id);
            batch.update(qRef, { isActive: value });
        });
        await batch.commit();
    };

    const selectRandomQuestions = async () => {
        if (questions.length < 10) {
            alert('Jumlah soal kurang dari 10. Silahkan tambahkan soal terlebih dahulu.');
            return;
        }
        
        if (!window.confirm('Aksi ini akan menonaktifkan semua soal yang ada dan memilih 10 soal secara acak. Lanjutkan?')) {
            return;
        }

        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        const selectedIds = new Set(shuffled.slice(0, 10).map(q => q.id));

        const batch = writeBatch(db);
        questions.forEach(q => {
            const qRef = doc(db, 'questions', q.id);
            const shouldBeActive = selectedIds.has(q.id);
            // Only update if the status is changing to save writes
            if (q.isActive !== shouldBeActive) {
                batch.update(qRef, { isActive: shouldBeActive });
            }
        });

        try {
            await batch.commit();
            alert('Berhasil mengaktifkan 10 soal secara acak!');
        } catch (error) {
            console.error('Error selecting random questions:', error);
            alert('Gagal memilih soal secara acak.');
        }
    };

    const addQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newQuestion.text.trim() && newQuestion.options.every(opt => opt.trim())) {
            const questionToAdd = {
                questionText: newQuestion.text,
                options: newQuestion.options,
                correctAnswerIndex: newQuestion.correctIndex,
                isActive: true,
                createdAt: new Date().toISOString()
            };
            
            try {
                await addDoc(collection(db, 'questions'), questionToAdd);
                setNewQuestion({ text: '', options: ['', '', '', '', ''], correctIndex: 0 });
                setShowForm(false);
            } catch (error) {
                console.error("Error adding question: ", error);
                alert("Failed to add question.");
            }
        } else {
            alert('Please fill out all fields.');
        }
    };

    const startEditing = (q: Question) => {
        setEditingId(q.id);
        setEditForm({ ...q });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const saveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editForm && editForm.questionText.trim() && editForm.options.every(opt => opt.trim())) {
            try {
                const { id, ...data } = editForm;
                await updateDoc(doc(db, 'questions', id), data);
                setEditingId(null);
                setEditForm(null);
            } catch (error) {
                console.error("Error updating question: ", error);
                alert("Failed to update question.");
            }
        } else {
            alert('Please fill out all fields.');
        }
    };

    const deleteQuestion = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'questions', id));
            setConfirmDeleteId(null);
        } catch (error) {
            console.error("Error deleting question: ", error);
            alert("Failed to delete question.");
        }
    };

    const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: 'greedy',
                transformHeader: (header) => header.trim().toLowerCase(),
                transform: (value) => value.trim(),
                complete: async (results: { data: any[] }) => {
                    const newQuestionsData: any[] = [];
                    
                    results.data.forEach((row, index) => {
                        const findValue = (possibleKeys: string[]) => {
                            const key = Object.keys(row).find(k => 
                                possibleKeys.some(pk => k.toLowerCase().trim().includes(pk))
                            );
                            return key ? row[key] : undefined;
                        };

                        const qText = findValue(['question_text', 'question', 'pertanyaan']);
                        const optA = findValue(['option_a', 'pilihan_a']);
                        const optB = findValue(['option_b', 'pilihan_b']);
                        const optC = findValue(['option_c', 'pilihan_c']);
                        const optD = findValue(['option_d', 'pilihan_d']);
                        const optE = findValue(['option_e', 'pilihan_e']);
                        const corrAns = findValue(['correct_answer_index', 'jawaban_benar', 'correct']);

                        const rawOptions = [optA, optB, optC, optD, optE];
                        const options = rawOptions.filter(o => o !== undefined && o !== '').map(o => String(o));
                        const correctIndex = parseInt(corrAns, 10);

                        let cleanedQText = qText || '';
                        cleanedQText = cleanedQText.replace(/^\d+[\.\s]+(Pertanyaan:)?\s*/i, '').trim();

                        if (cleanedQText && options.length >= 2 && !isNaN(correctIndex)) {
                            let finalCorrectIndex = -1;
                            if (correctIndex >= 1 && correctIndex <= options.length) {
                                finalCorrectIndex = correctIndex - 1;
                            } else if (correctIndex >= 0 && correctIndex < options.length) {
                                finalCorrectIndex = correctIndex;
                            }

                            if (finalCorrectIndex !== -1) {
                                newQuestionsData.push({
                                    questionText: cleanedQText,
                                    options,
                                    correctAnswerIndex: finalCorrectIndex,
                                    isActive: true,
                                    createdAt: new Date().toISOString()
                                });
                            }
                        }
                    });

                    if (newQuestionsData.length > 0) {
                        try {
                            const batch = writeBatch(db);
                            newQuestionsData.forEach(q => {
                                const qRef = doc(collection(db, 'questions'));
                                batch.set(qRef, q);
                            });
                            await batch.commit();
                            alert(`${newQuestionsData.length} questions imported successfully!`);
                        } catch (error) {
                            console.error("Error importing CSV: ", error);
                            alert("Failed to import questions.");
                        }
                    } else {
                        alert('No valid questions found.');
                    }
                    
                    if (event.target) {
                        event.target.value = '';
                    }
                },
                error: (error: Error) => {
                    alert('Error parsing CSV file: ' + error.message);
                }
            });
        }
    };

    return (
        <AdminLayout title="Manage Questions">
            <div className="space-y-8">
                {/* Connection Status Debug */}
                <div className="bg-gray-100 p-2 rounded text-xs text-gray-500 flex justify-between">
                    <span>Connected to Project: <strong>{import.meta.env.VITE_FIREBASE_PROJECT_ID}</strong></span>
                    <span>Status: <strong className={questions.length > 0 ? 'text-green-600' : 'text-orange-600'}>{loading ? 'Connecting...' : 'Connected'}</strong></span>
                </div>
                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setShowForm(!showForm)} className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                       <IconPlus className="w-5 h-5"/> {showForm ? 'Cancel' : 'Add New Question'}
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                       <IconUpload className="w-5 h-5"/> Import from CSV
                    </button>
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvImport} className="hidden" />
                </div>
                
                {/* CSV Instructions */}
                <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg" role="alert">
                  <p className="font-bold">CSV Import Instructions</p>
                  <p className="text-sm">Ensure your CSV has the headers: <code className="bg-blue-100 p-1 rounded">question_text,option_a,option_b,option_c,option_d,option_e,correct_answer_index</code>. The correct answer index must be a number from 0 to 4.</p>
                </div>

                {/* Add Question Form */}
                {showForm && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-4">Add New Question</h3>
                        <form onSubmit={addQuestion} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Question Text</label>
                                <textarea name="text" value={newQuestion.text} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows={3}></textarea>
                            </div>
                            {newQuestion.options.map((opt, index) => (
                                <div key={index}>
                                    <label className="block text-sm font-medium text-gray-700">Option {String.fromCharCode(65 + index)}</label>
                                    <input type="text" name="option" value={opt} onChange={(e) => handleInputChange(e, index)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                </div>
                            ))}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                                <select name="correctIndex" value={newQuestion.correctIndex} onChange={(e: any) => handleInputChange(e)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
                                    {newQuestion.options.map((_, index) => (
                                        <option key={index} value={index}>Option {String.fromCharCode(65 + index)}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Save Question</button>
                        </form>
                    </div>
                )}

                {/* Question List */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-xl font-semibold">Daftar Soal ({questions.length})</h3>
                            <p className="text-sm text-gray-500 font-medium italic">
                                ({questions.filter(q => q.isActive).length} Soal Terpilih untuk Pre/Post Test)
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-gray-500 font-medium">Status Soal:</span>
                            <button onClick={selectRandomQuestions} className="bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 font-bold border border-purple-200">🎲 Pilih 10 Acak</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => bulkToggleActive(true)} className="text-blue-600 hover:underline">Aktifkan Semua</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => bulkToggleActive(false)} className="text-gray-600 hover:underline">Nonaktifkan Semua</button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {questions.length > 0 ? questions.map((q, index) => (
                            <div key={q.id} className="border border-gray-200 p-4 rounded-lg">
                                {editingId === q.id && editForm ? (
                                    <form onSubmit={saveEdit} className="space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold">Edit Question {index + 1}</h4>
                                            <div className="flex gap-2">
                                                <button type="submit" className="text-green-600 hover:text-green-800 p-1" title="Save">
                                                    <IconSave className="w-5 h-5"/>
                                                </button>
                                                <button type="button" onClick={cancelEditing} className="text-gray-500 hover:text-gray-700 p-1" title="Cancel">
                                                    <IconX className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Question Text</label>
                                            <textarea name="text" value={editForm.questionText} onChange={handleEditInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows={3}></textarea>
                                        </div>
                                        {editForm.options.map((opt, i) => (
                                            <div key={i}>
                                                <label className="block text-sm font-medium text-gray-700">Option {String.fromCharCode(65 + i)}</label>
                                                <input type="text" name="option" value={opt} onChange={(e) => handleEditInputChange(e, i)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                            </div>
                                        ))}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                                            <select name="correctIndex" value={editForm.correctAnswerIndex} onChange={(e: any) => handleEditInputChange(e)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
                                                {editForm.options.map((_, i) => (
                                                    <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <button type="button" onClick={cancelEditing} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                                            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save Changes</button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-500">#{index + 1}</span>
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!!q.isActive} 
                                                            onChange={() => toggleQuestionActive(q.id)}
                                                            className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className={q.isActive ? 'text-blue-600 font-bold' : 'text-gray-400'}>
                                                            {q.isActive ? 'Soal Aktif' : 'Soal Tidak Aktif'}
                                                        </span>
                                                    </label>
                                                </div>
                                                <p className="font-semibold text-gray-800">{q.questionText}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {confirmDeleteId === q.id ? (
                                                    <div className="flex items-center gap-2 bg-red-50 p-1 rounded border border-red-200">
                                                        <span className="text-xs text-red-600 font-bold px-1">Delete?</span>
                                                        <button 
                                                            onClick={() => deleteQuestion(q.id)} 
                                                            className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700"
                                                        >
                                                            Yes
                                                        </button>
                                                        <button 
                                                            onClick={() => setConfirmDeleteId(null)} 
                                                            className="text-gray-500 text-xs px-2 py-1 rounded hover:bg-gray-200"
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEditing(q)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit">
                                                            <IconEdit className="w-5 h-5"/>
                                                        </button>
                                                        <button onClick={() => setConfirmDeleteId(q.id)} className="text-red-500 hover:text-red-700 p-1" title="Delete">
                                                            <IconTrash className="w-5 h-5"/>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <ul className="mt-2 list-disc list-inside text-gray-600 space-y-1">
                                            {q.options.map((opt, i) => (
                                                <li key={i} className={i === q.correctAnswerIndex ? 'font-bold text-green-600' : ''}>
                                                    {String.fromCharCode(65 + i)}: {opt}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        )) : (
                            <p className="text-gray-500">No questions have been added yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default ManageQuestionsPage;