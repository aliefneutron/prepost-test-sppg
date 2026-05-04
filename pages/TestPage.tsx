import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Question, TestType, UserScore } from '../types';
import { IconCamera, IconScan, IconX, IconUpload } from '../components/icons';
import { extractKTPData } from '../lib/geminiService';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import useLocalStorage from '../hooks/useLocalStorage';

const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const TestPage: React.FC = () => {
  const { testType } = useParams<{ testType: TestType }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [googleScriptUrl, setGoogleScriptUrl] = useState('');
  
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    name: '',
    ktp: '',
    phone: '',
    address: '',
    birthInfo: '',
    sppg: ''
  });

  const [isScanning, setIsScanning] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);

  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationData.name.trim() || !registrationData.ktp.trim() || !registrationData.phone.trim() || !registrationData.address.trim() || !registrationData.birthInfo.trim() || !registrationData.sppg.trim()) {
      alert('Mohon lengkapi semua data diri.');
      return;
    }

    // Cek apakah peserta sudah lulus Post Test sebelumnya
    if (testType === TestType.POST_TEST) {
      setIsCheckingEligibility(true);
      try {
        const q = query(
          collection(db, 'scores'),
          where('ktp', '==', registrationData.ktp.trim()),
          where('testType', '==', TestType.POST_TEST)
        );
        const snapshot = await getDocs(q);
        const passed = snapshot.docs.find(d => (d.data().score ?? 0) >= 80);
        if (passed) {
          const data = passed.data();
          setBlockedMessage(
            `Peserta dengan No. KTP ${registrationData.ktp} (${data.name}) sudah LULUS Post Test dengan skor ${data.score}. Tidak dapat mengerjakan Post Test kembali.`
          );
          setIsCheckingEligibility(false);
          return;
        }
      } catch (err) {
        console.error('Eligibility check error:', err);
      } finally {
        setIsCheckingEligibility(false);
      }
    }

    setIsRegistered(true);
  };

  const handleRegistrationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRegistrationData(prev => ({ ...prev, [name]: value }));
  };

  const startScanning = async () => {
    setIsScanning(true);
    setOcrError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setOcrError("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const captureAndOcr = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsOcrLoading(true);
    setOcrError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    try {
      const ktpData = await extractKTPData(imageData);

      const fullAddress = [ktpData.alamat, ktpData.rt_rw, ktpData.kel_desa, ktpData.kecamatan]
        .filter(Boolean).join(', ');

      setRegistrationData(prev => ({
        ...prev,
        ktp: ktpData.nik || prev.ktp,
        name: ktpData.nama || prev.name,
        address: fullAddress || prev.address,
        birthInfo: ktpData.tempat_tgl_lahir || prev.birthInfo,
      }));

      if (!ktpData.nik && !ktpData.nama && !ktpData.alamat) {
        setOcrError("Data kurang terbaca. Pastikan KTP berada di dalam kotak dan cahaya cukup.");
      } else {
        if (ktpData.usedFallback) {
          setOcrError("⚠️ Menggunakan OCR lokal (akurasi terbatas). Periksa kembali data yang terisi.");
        }
        stopScanning();
      }
    } catch (err: any) {
      console.error("OCR error:", err);
      setOcrError(`Gagal: ${err?.message || 'Error tidak diketahui'}. Silakan isi manual.`);
    } finally {
      setIsOcrLoading(false);
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    setOcrError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      try {
        const ktpData = await extractKTPData(imageData);

        const fullAddress = [ktpData.alamat, ktpData.rt_rw, ktpData.kel_desa, ktpData.kecamatan]
          .filter(Boolean).join(', ');

        setRegistrationData(prev => ({
          ...prev,
          ktp: ktpData.nik || prev.ktp,
          name: ktpData.nama || prev.name,
          address: fullAddress || prev.address,
          birthInfo: ktpData.tempat_tgl_lahir || prev.birthInfo,
        }));

        if (!ktpData.nik && !ktpData.nama && !ktpData.alamat) {
          setOcrError("Data tidak terbaca dari foto ini. Pastikan foto tidak silau dan teks terlihat kontras.");
        } else if (ktpData.usedFallback) {
          alert("Data berhasil diisi! (Menggunakan OCR lokal — periksa kembali data yang terisi)");
        } else {
          alert("Data berhasil diisi otomatis dari KTP!");
        }
      } catch (error: any) {
        console.error("File OCR error:", error);
        setOcrError(`Gagal: ${error?.message || 'Error tidak diketahui'}`);
      } finally {
        setIsOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoadingQuestions(true);
        setFetchError(null);
        
        const q = query(collection(db, 'questions'), where('isActive', '==', true));
        const querySnapshot = await getDocs(q);
        const questionsData: Question[] = [];
        querySnapshot.forEach((doc) => {
          questionsData.push({ id: doc.id, ...doc.data() } as Question);
        });
        setQuestions(questionsData);
        
        if (questionsData.length > 0) {
          const shuffled = shuffleArray(questionsData);
          setTestQuestions(shuffled);
          setUserAnswers(new Array(shuffled.length).fill(null));
        }

        // Also fetch settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
        if (settingsSnap.exists()) {
          setGoogleScriptUrl(settingsSnap.data().googleScriptUrl || '');
        }
      } catch (error: any) {
        console.error("Error fetching data: ", error);
        setFetchError(error.message || "Gagal mengambil data dari server.");
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, []);
  
  const handleAnswerSelect = (optionIndex: number) => {
    if (isFinished) return;
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < testQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishTest();
    }
  };

  const finishTest = () => {
    let correctCount = 0;
    testQuestions.forEach((q, index) => {
      if (userAnswers[index] === q.correctAnswerIndex) {
        correctCount++;
      }
    });
    const calculatedScore = Math.round((correctCount / testQuestions.length) * 100);
    setScore(calculatedScore);
    setIsFinished(true);
    setShowModal(true);
  };
  
  const saveScore = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    const newScore = {
      name: registrationData.name,
      ktp: registrationData.ktp,
      phone: registrationData.phone,
      address: registrationData.address,
      birthInfo: registrationData.birthInfo,
      sppg: registrationData.sppg,
      score: score,
      testType: testType!,
      timestamp: Date.now(),
    };
    
    try {
      // Save to Firestore
      await addDoc(collection(db, 'scores'), newScore);
      console.log("Score saved to Firestore");

      // Save to Google Sheets if configured
      if (googleScriptUrl) {
        try {
          await fetch(googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newScore),
          });
          console.log("Score sent to Google Sheets");
        } catch (error) {
          console.error("Failed to send to Google Sheets", error);
        }
      }

      setShowModal(false);
      navigate('/leaderboard');
    } catch (error) {
      console.error("Error saving score: ", error);
      alert("Gagal menyimpan skor. Silakan coba lagi.");
      setIsSaving(false);
    }
  };

  const currentQuestion = testQuestions[currentQuestionIndex];
  const progress = useMemo(() => ((currentQuestionIndex + 1) / testQuestions.length) * 100, [currentQuestionIndex, testQuestions.length]);

  if (isLoadingQuestions) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
         <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
         <p className="text-gray-600 font-medium">Loading Questions...</p>
       </div>
     );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Connection Error</h1>
        <p className="text-gray-700 mb-6">{fetchError}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-md">
          Retry
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">No Questions Available</h1>
        <p className="text-lg text-gray-700 font-medium">An admin needs to add and activate questions in the dashboard.</p>
        <button onClick={() => navigate('/')} className="mt-6 bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-lg">
          Go to Homepage
        </button>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 relative">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6 uppercase tracking-wide border-b pb-4">
            Data Diri Peserta - {testType?.replace('-', ' ')}
          </h1>

          <div className="mb-6 space-y-3">
            {!isScanning ? (
              <>
                <button 
                  onClick={startScanning}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition shadow-md font-bold"
                >
                  <IconCamera className="w-6 h-6" /> Scan KTP (Kamera)
                </button>
                <button 
                  onClick={() => filePickerRef.current?.click()}
                  disabled={isOcrLoading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-100 text-blue-700 py-3 rounded-lg hover:bg-blue-200 transition font-bold border-2 border-blue-200"
                >
                  {isOcrLoading ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <IconUpload className="w-6 h-6" />
                  )}
                  {isOcrLoading ? 'Memproses...' : 'Upload dari Galeri'}
                </button>
                <input 
                  type="file" 
                  ref={filePickerRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                {/* Global OCR Loading State for Gallery */}
                {isOcrLoading && !isScanning && (
                  <div className="flex flex-col items-center justify-center py-4 bg-blue-50 rounded-lg border-2 border-blue-200 animate-pulse">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-blue-700 font-bold text-sm">Sedang Memproses Foto...</p>
                    <p className="text-blue-500 text-xs">Mohon tunggu sebentar</p>
                  </div>
                )}
                
                {ocrError && !isScanning && (
                  <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-600 text-xs font-bold text-center">
                    {ocrError}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  {/* KTP Guideline Box */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[92%] h-[80%] border-4 border-white/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                       <div className="absolute top-0 left-0 w-12 h-12 border-t-8 border-l-8 border-blue-500 -mt-2 -ml-2 rounded-tl-lg"></div>
                       <div className="absolute top-0 right-0 w-12 h-12 border-t-8 border-r-8 border-blue-500 -mt-2 -mr-2 rounded-tr-lg"></div>
                       <div className="absolute bottom-0 left-0 w-12 h-12 border-b-8 border-l-8 border-blue-500 -mb-2 -ml-2 rounded-bl-lg"></div>
                       <div className="absolute bottom-0 right-0 w-12 h-12 border-b-8 border-r-8 border-blue-500 -mb-2 -mr-2 rounded-br-lg"></div>
                       <p className="absolute -bottom-12 left-0 right-0 text-center text-white text-sm font-bold bg-blue-600/80 py-2 rounded-full mx-10 shadow-lg">Posisikan KTP di dalam kotak</p>
                    </div>
                  </div>
                  {isOcrLoading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4 text-center">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="font-bold">Memproses KTP...</p>
                      <p className="text-xs opacity-75">Tunggu sebentar, sedang membaca data.</p>
                    </div>
                  )}
                </div>
                {ocrError && <p className="text-red-500 text-xs font-bold text-center">{ocrError}</p>}
                <div className="flex gap-2">
                  <button 
                    onClick={captureAndOcr}
                    disabled={isOcrLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <IconScan className="w-5 h-5" /> Ambil Foto
                  </button>
                  <button 
                    onClick={stopScanning}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    <IconX className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs font-bold uppercase">Atau Isi Manual</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form onSubmit={handleRegistrationSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">No. KTP</label>
              <input
                type="text"
                name="ktp"
                value={registrationData.ktp}
                onChange={handleRegistrationChange}
                placeholder="Masukkan nomor KTP"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                name="name"
                value={registrationData.name}
                onChange={handleRegistrationChange}
                placeholder="Masukkan nama lengkap"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tempat/Tanggal Lahir</label>
              <input
                type="text"
                name="birthInfo"
                value={registrationData.birthInfo}
                onChange={handleRegistrationChange}
                placeholder="Masukkan tempat & tanggal lahir"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Alamat Lengkap</label>
              <textarea
                name="address"
                value={registrationData.address}
                onChange={handleRegistrationChange}
                placeholder="Masukkan alamat lengkap"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">No. Handphone (WA)</label>
              <input
                type="tel"
                name="phone"
                value={registrationData.phone}
                onChange={handleRegistrationChange}
                placeholder="Masukkan nomor handphone"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nama SPPG</label>
              <input
                type="text"
                name="sppg"
                value={registrationData.sppg}
                onChange={handleRegistrationChange}
                placeholder="Masukkan nama SPPG"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                required
              />
            </div>
            {blockedMessage && (
              <div className="p-4 bg-red-100 border-2 border-red-200 rounded-lg text-red-700 text-sm font-bold flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚫</span>
                  <span>Akses Ditolak</span>
                </div>
                <p className="font-normal text-xs">{blockedMessage}</p>
                <button 
                  type="button"
                  onClick={() => setBlockedMessage(null)}
                  className="mt-2 text-xs bg-red-200 hover:bg-red-300 py-1 px-3 rounded text-red-800 transition"
                >
                  Coba dengan data lain
                </button>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isCheckingEligibility}
                className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:bg-blue-300 flex items-center justify-center gap-2"
              >
                {isCheckingEligibility ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memeriksa...
                  </>
                ) : (
                  'Mulai Pengerjaan Soal'
                )}
              </button>
            </div>
          </form>
          <button onClick={() => navigate('/')} className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm">
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2 capitalize">
          {testType?.replace('-', ' ')}
        </h1>
        <p className="text-center text-gray-500 mb-6">Question {currentQuestionIndex + 1} of {testQuestions.length}</p>

        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>

        {!currentQuestion ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Mempersiapkan pertanyaan...</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">{currentQuestion.questionText}</h2>
              <div className="space-y-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                      userAnswers[currentQuestionIndex] === index
                        ? 'bg-blue-500 border-blue-500 text-white font-semibold shadow-lg'
                        : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span> {option}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-8 flex justify-between items-center">
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-0 disabled:pointer-events-none"
              >
                ← Sebelumnya
              </button>
              <button
                onClick={handleNext}
                className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                disabled={userAnswers[currentQuestionIndex] === null}
              >
                {currentQuestionIndex < testQuestions.length - 1 ? 'Selanjutnya →' : 'Selesai ✓'}
              </button>
            </div>
          </>
        )}
      </div>
      
      {showModal && (() => {
        const isPostTest = testType === TestType.POST_TEST;
        const minScore = 80;
        const isPassed = !isPostTest || score >= minScore;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 m-4 max-w-md w-full text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Test Selesai!</h2>

              {isPostTest && (
                <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-4 ${
                  isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {isPassed ? '✅ LULUS' : '❌ TIDAK LULUS'}
                </div>
              )}

              <div className="mb-4">
                <p className="text-gray-600 mb-1">Skor Anda:</p>
                <p className={`text-6xl font-bold ${isPassed ? 'text-blue-600' : 'text-red-500'}`}>
                  {score}<span className="text-2xl text-gray-500">/100</span>
                </p>
                {isPostTest && (
                  <p className="text-sm text-gray-500 mt-1">
                    Nilai minimum kelulusan: <strong>{minScore}</strong>
                  </p>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                <p className="text-sm border-b pb-1 mb-1"><strong>Nama:</strong> {registrationData.name}</p>
                <p className="text-sm border-b pb-1 mb-1"><strong>Phone:</strong> {registrationData.phone}</p>
                <p className="text-sm"><strong>SPPG:</strong> {registrationData.sppg}</p>
              </div>

              {isPassed ? (
                <button
                  onClick={saveScore}
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-400"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Skor & Lihat Hasil'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                    Anda belum memenuhi syarat atau tidak lulus (Skor minimum: <strong>{minScore}</strong>).<br/>Silahkan coba lagi.
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setIsFinished(false);
                      setCurrentQuestionIndex(0);
                      const shuffled = [...testQuestions].sort(() => Math.random() - 0.5);
                      setTestQuestions(shuffled);
                      setUserAnswers(new Array(shuffled.length).fill(null));
                    }}
                    className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors shadow-md"
                  >
                    🔄 Coba Lagi
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TestPage;