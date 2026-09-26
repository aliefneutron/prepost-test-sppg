import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc, updateDoc, getDoc, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { nanoid } from "nanoid";

export interface JasaBogaInfo {
  nama: string;
  alamat: string;
  penanggungJawab: string;
  porsiHarian: string;
  distribusiKe: string;
  totalPenjamah: string;
  penjamahBersertifikat: string;
  namaPemeriksa: string;
  tanggalPemeriksaan: string;

  hariBerjualan: string;

}

export type IKLJasaBogaAnswer = Record<string, boolean>;

export interface InspectionJasaBogaData {
  info: JasaBogaInfo;
  iklAnswers: IKLJasaBogaAnswer;
  catatan: string;
  iklSuggestions: Record<string, string>;
  iklPhotos: Record<string, string[]>;
}

const defaultData: InspectionJasaBogaData = {
  info: {
    nama: "",
    alamat: "",
    penanggungJawab: "",
    porsiHarian: "",
    distribusiKe: "",
    totalPenjamah: "",
    penjamahBersertifikat: "",
    namaPemeriksa: "",
    tanggalPemeriksaan: new Date().toISOString().split("T")[0],

    hariBerjualan: "",

  },
  iklAnswers: {},
  catatan: "",
  iklSuggestions: {},
  iklPhotos: {},
};

export function useFirebaseSessionJasaBoga() {
  const [deviceId] = useState(() => {
    let id = localStorage.getItem("jb_device_id");
    if (!id) {
      id = nanoid();
      localStorage.setItem("jb_device_id", id);
    }
    return id;
  });
  
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem("jb_session_id"));
  const [data, setData] = useState<InspectionJasaBogaData>(defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(true);

  useEffect(() => {
    setIsAuthed(true);
  }, []);

  useEffect(() => {
    if (sessionId) localStorage.setItem("jb_session_id", sessionId);
    else localStorage.removeItem("jb_session_id");
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setData(defaultData);
      return;
    }

    const docRef = doc(db, "inspections_jasaboga", sessionId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const fetchedData = docSnap.data() as Partial<InspectionJasaBogaData>;
          setData({
            info: { ...defaultData.info, ...fetchedData.info },
            iklAnswers: fetchedData.iklAnswers || {},
            catatan: fetchedData.catatan || "",
            iklSuggestions: fetchedData.iklSuggestions || {},
            iklPhotos: fetchedData.iklPhotos || {},
          });
        }
      },
      (err) => {
        console.error("Firestore Error:", err);
        setError("Gagal menghubungkan ke sesi. Periksa koneksi internet / Konfigurasi Firebase.");
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const photosCol = collection(db, "inspections_jasaboga", sessionId, "photos");
    const unsubscribe = onSnapshot(photosCol, (snap) => {
      const photosMap: Record<string, string[]> = {};
      snap.docs.forEach(doc => {
        photosMap[doc.id] = doc.data().images || [];
      });
      setData(prev => ({ ...prev, iklPhotos: photosMap }));
    });

    return () => unsubscribe();
  }, [sessionId]);

  const createSession = async () => {
    setLoading(true);
    try {
      const newId = "JB-" + nanoid(6).toUpperCase();
      await setDoc(doc(db, "inspections_jasaboga", newId), defaultData);
      setSessionId(newId);
    } catch (e) {
      console.error(e);
      setError("Gagal membuat sesi. Hubungi admin.");
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const formattedCode = code.toUpperCase().trim();
      const docSnap = await getDoc(doc(db, "inspections_jasaboga", formattedCode));
      if (docSnap.exists()) {
        setSessionId(formattedCode);
      } else {
        setError("Sesi tidak ditemukan. Periksa kembali kode akses.");
      }
    } catch (e) {
      console.error(e);
      setError("Gagal bergabung dengan sesi.");
    } finally {
      setLoading(false);
    }
  };

  const leaveSession = () => {
    if (confirm("Apakah Anda yakin ingin keluar dari sesi ini?")) {
      setSessionId(null);
    }
  };

  const updateSessionData = async (updates: Partial<InspectionJasaBogaData>) => {
    if (!sessionId) return;
    try {
      const docRef = doc(db, "inspections_jasaboga", sessionId);
      await updateDoc(docRef, updates);
    } catch (e) {
      console.error("Gagal mengupdate data:", e);
    }
  };

  const setInfo = (info: JasaBogaInfo) => updateSessionData({ info });
  
  const setIklAnswers = (iklAnswers: IKLJasaBogaAnswer) => updateSessionData({ iklAnswers });
  const setCatatan = (catatan: string) => updateSessionData({ catatan });
  const setIklSuggestions = (iklSuggestions: Record<string, string>) => updateSessionData({ iklSuggestions });

  const toggleIkl = (criteriaId: string) => {
    const isCurrentlyFailed = !!data.iklAnswers[criteriaId];
    const updatedAnswers = { ...data.iklAnswers };
    
    if (isCurrentlyFailed) {
      delete updatedAnswers[criteriaId];
    } else {
      updatedAnswers[criteriaId] = true;
    }
    
    updateSessionData({ iklAnswers: updatedAnswers });
  };

  const uploadPhoto = async (criteriaId: string, base64: string) => {
    if (!sessionId || !isAuthed) {
      if (!isAuthed) alert("Menunggu autentikasi... Silakan coba lagi sebentar.");
      return;
    }
    try {
      const currentPhotos = data.iklPhotos[criteriaId] || [];
      if (currentPhotos.length >= 3) return;

      const updatedPhotos = [...currentPhotos, base64];
      const photoDocRef = doc(db, "inspections_jasaboga", sessionId, "photos", criteriaId);
      await setDoc(photoDocRef, { images: updatedPhotos });
    } catch (e: any) {
      console.error("Gagal simpan foto ke database:", e);
      alert(`Gagal menyimpan foto ke database (${e.code || "unknown"}). Pastikan koneksi internet stabil.`);
    }
  };

  const deletePhoto = async (criteriaId: string, base64: string) => {
    if (!sessionId) return;
    try {
      const current = data.iklPhotos[criteriaId] || [];
      const updated = current.filter(b => b !== base64);
      
      const photoDocRef = doc(db, "inspections_jasaboga", sessionId, "photos", criteriaId);
      if (updated.length === 0) {
        await setDoc(photoDocRef, { images: [] });
      } else {
        await setDoc(photoDocRef, { images: updated });
      }
    } catch (e) {
      console.error("Gagal hapus foto dari database", e);
    }
  };

  return {
    deviceId,
    sessionId,
    data,
    loading,
    error,
    createSession,
    joinSession,
    leaveSession,
    setInfo,
    setIklAnswers,
    setCatatan,
    setIklSuggestions,
    toggleIkl,
    uploadPhoto,
    deletePhoto,
    setError
  };
}
