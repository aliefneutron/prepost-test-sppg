import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc, updateDoc, getDoc, collection } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth } from "../../lib/firebase";
import { AreaKey } from "./data";
import { nanoid } from "nanoid";

export interface SPPGInfo {
  nama: string;
  alamat: string;
  penanggungJawab: string;
  porsiHarian: string;
  distribusiKe: string;
  totalPenjamah: string;
  penjamahBersertifikat: string;
  namaPemeriksa: string;
  tanggalPemeriksaan: string;
}

export type IKLAnswer = Record<string, AreaKey[]>;

export interface InspectionData {
  info: SPPGInfo;
  iklAnswers: IKLAnswer;
  specialAnswers: Record<number, boolean>;
  catatan: string;
  iklSuggestions: Record<string, string>;
  iklPhotos: Record<string, string[]>;
  claimedAreas: Record<string, string>;
}

const defaultData: InspectionData = {
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
  },
  iklAnswers: {},
  specialAnswers: {},
  catatan: "",
  iklSuggestions: {},
  iklPhotos: {},
  claimedAreas: {},
};

export function useFirebaseSession() {
  const [deviceId] = useState(() => {
    let id = localStorage.getItem("sppg_device_id");
    if (!id) {
      id = nanoid();
      localStorage.setItem("sppg_device_id", id);
    }
    return id;
  });
  
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem("sppg_session_id"));
  const [assignedAreas, setAssignedAreas] = useState<AreaKey[]>(() => JSON.parse(localStorage.getItem("sppg_assigned_areas") || "[]"));
  const [data, setData] = useState<InspectionData>(defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  // Initialize Anonymous Auth
  useEffect(() => {
    signInAnonymously(auth)
      .then(() => {
        setIsAuthed(true);
        console.log("Authenticated anonymously");
      })
      .catch((err) => {
        console.error("Auth Error:", err);
        setError("Gagal menginisialisasi sesi aman.");
      });
  }, []);

  // Sync to local storage
  useEffect(() => {
    if (sessionId) localStorage.setItem("sppg_session_id", sessionId);
    else localStorage.removeItem("sppg_session_id");
    
    localStorage.setItem("sppg_assigned_areas", JSON.stringify(assignedAreas));
  }, [sessionId, assignedAreas]);

  // Firestore subscription
  useEffect(() => {
    if (!sessionId) {
      setData(defaultData);
      return;
    }

    const docRef = doc(db, "inspections", sessionId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          // Merge defaults with fetched data strictly
          const fetchedData = docSnap.data() as Partial<InspectionData>;
          setData({
            info: { ...defaultData.info, ...fetchedData.info },
            iklAnswers: fetchedData.iklAnswers || {},
            specialAnswers: fetchedData.specialAnswers || {},
            catatan: fetchedData.catatan || "",
            iklSuggestions: fetchedData.iklSuggestions || {},
            iklPhotos: fetchedData.iklPhotos || {},
            claimedAreas: fetchedData.claimedAreas || {},
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

  // Sync Photos Sub-collection
  useEffect(() => {
    if (!sessionId) return;

    const photosCol = collection(db, "inspections", sessionId, "photos");
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
      const newId = "SPPG-" + nanoid(6).toUpperCase();
      await setDoc(doc(db, "inspections", newId), defaultData);
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
      const docSnap = await getDoc(doc(db, "inspections", formattedCode));
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
      setAssignedAreas([]);
    }
  };

  const updateSessionData = async (updates: Partial<InspectionData>) => {
    if (!sessionId) return;
    try {
      const docRef = doc(db, "inspections", sessionId);
      await updateDoc(docRef, updates);
    } catch (e) {
      console.error("Gagal mengupdate data:", e);
    }
  };

  const claimAreas = async (areas: AreaKey[]) => {
    setAssignedAreas(areas);
    if (!sessionId) return;
    
    // Build updated claimed areas
    const newClaimed = { ...(data.claimedAreas || {}) };
    
    // Add newly claimed
    areas.forEach(a => {
      newClaimed[a] = deviceId;
    });
    
    // Remove un-claimed by this device
    (Object.keys(newClaimed) as AreaKey[]).forEach(k => {
      if (newClaimed[k] === deviceId && !areas.includes(k)) {
        delete newClaimed[k];
      }
    });

    try {
      const docRef = doc(db, "inspections", sessionId);
      await updateDoc(docRef, { claimedAreas: newClaimed });
    } catch (e) {
      console.error(e);
    }
  };

  const setInfo = (info: SPPGInfo) => updateSessionData({ info });
  
  const setIklAnswers = (iklAnswers: IKLAnswer) => updateSessionData({ iklAnswers });
  const setSpecialAnswers = (specialAnswers: Record<number, boolean>) => updateSessionData({ specialAnswers });
  const setCatatan = (catatan: string) => updateSessionData({ catatan });
  const setIklSuggestions = (iklSuggestions: Record<string, string>) => updateSessionData({ iklSuggestions });

  const toggleIkl = (criteriaId: string, areaKey: AreaKey) => {
    const current = data.iklAnswers[criteriaId] || [];
    let updated;
    if (current.includes(areaKey)) {
      updated = current.filter(k => k !== areaKey);
    } else {
      updated = [...current, areaKey];
    }
    updateSessionData({ iklAnswers: { ...data.iklAnswers, [criteriaId]: updated } });
  };

  const uploadPhoto = async (criteriaId: string, base64: string) => {
    if (!sessionId || !isAuthed) {
      if (!isAuthed) alert("Menunggu autentikasi... Silakan coba lagi sebentar.");
      return;
    }
    try {
      const currentPhotos = data.iklPhotos[criteriaId] || [];
      if (currentPhotos.length >= 3) return; // limit to 3

      const updatedPhotos = [...currentPhotos, base64];
      const photoDocRef = doc(db, "inspections", sessionId, "photos", criteriaId);
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
      
      const photoDocRef = doc(db, "inspections", sessionId, "photos", criteriaId);
      if (updated.length === 0) {
        // If no more photos for this criteria, we could delete the doc, 
        // but for safety we'll just empty the array.
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
    assignedAreas,
    claimAreas,
    data,
    loading,
    error,
    createSession,
    joinSession,
    leaveSession,
    setInfo,
    setIklAnswers,
    setSpecialAnswers,
    setCatatan,
    setIklSuggestions,
    toggleIkl,
    uploadPhoto,
    deletePhoto,
    setError
  };
}
