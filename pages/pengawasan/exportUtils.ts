import * as XLSX from 'xlsx';
import { IKL_DATA, AREAS, AreaKey, SPECIAL_REQUIREMENTS } from './data';

export const exportToExcel = (data: any) => {
  const { info, iklAnswers, iklSuggestions, specialAnswers, iklScore } = data;
  
  // Create workbook
  const wb = XLSX.utils.book_new();

  // 1. Info Sheet
  const infoData = [
    ["INFORMASI INSPEKSI SPPG"],
    [],
    ["Nama SPPG", info.nama],
    ["Alamat", info.alamat],
    ["Penanggung Jawab", info.penanggungJawab],
    ["Porsi Harian", info.porsiHarian],
    ["Distribusi Ke", info.distribusiKe],
    ["Total Penjamah", info.totalPenjamah],
    ["Penjamah Bersertifikat", info.penjamahBersertifikat],
    ["Nama Pemeriksa", info.namaPemeriksa],
    ["Tanggal Pemeriksaan", info.tanggalPemeriksaan],
    [],
    ["SKOR AKHIR IKL", iklScore],
    ["STATUS IKL", iklScore >= 70 ? 'MEMENUHI SYARAT (MS)' : 'TIDAK MEMENUHI SYARAT (TMS)']
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  XLSX.utils.book_append_sheet(wb, wsInfo, "Informasi");

  // 2. IKL Sheet
  const iklRows = [
    ["No", "Kriteria Penilaian", "Saran Perbaikan", ...Object.values(AREAS)]
  ];
  const areaKeys = Object.keys(AREAS) as AreaKey[];

  IKL_DATA.forEach((item, idx) => {
    const row: any[] = [
      idx + 1,
      item.text,
      iklSuggestions[item.id] || ""
    ];
    // For each area, check status
    areaKeys.forEach(ak => {
      if (item.scores[ak] === "NA") row.push("-");
      else if (iklAnswers[item.id]?.includes(ak)) row.push("TMS (TIDAK)");
      else row.push("MS (YA)");
    });
    iklRows.push(row);
  });
  const wsIkl = XLSX.utils.aoa_to_sheet(iklRows);
  XLSX.utils.book_append_sheet(wb, wsIkl, "Hasil IKL");

  // 3. Khusus Sheet
  const khususRows = [
    ["No", "Persyaratan Khusus", "Status"]
  ];
  SPECIAL_REQUIREMENTS.forEach((req, idx) => {
     khususRows.push([
       String(idx + 1),
       req,
       specialAnswers[idx] ? "YA / MEMENUHI" : "TIDAK"
     ]);
  });
  const wsKhusus = XLSX.utils.aoa_to_sheet(khususRows);
  XLSX.utils.book_append_sheet(wb, wsKhusus, "Sayarat Khusus");

  // Save
  XLSX.writeFile(wb, `Laporan_SPPG_${info.nama || 'TanpaNama'}.xlsx`);
};

export const exportToWord = (elementId: string, filename: string) => {
  const el = document.getElementById(elementId);
  if (!el) {
    alert("Elemen dokumen tidak ditemukan!");
    return;
  }

  // Pre-formatting untuk CSS agar tampil rapi di Ms Word (Ms Word tidak membaca tailwind)
  const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>Export HTML To Doc</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11pt; }
      h2, h3 { color: #1a1a1a; }
      .border, .border-b { border: 1px solid #000; padding: 5px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: 6px; text-align: left; }
    </style>
  </head>
  <body>`;
  const postHtml = "</body></html>";
  const html = preHtml + el.innerHTML + postHtml;

  const blob = new Blob(['\ufeff', html], {
      type: 'application/msword'
  });
  
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = filename;
  
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};
