import * as XLSX from 'xlsx';
import { IKL_JASA_BOGA_DATA } from './dataJasaBoga';

export const exportToExcelJasaBoga = (data: any) => {
  const { info, iklAnswers, iklSuggestions, iklScore, totalMaxScore, totalPointsLost } = data;
  
  // Create workbook
  const wb = XLSX.utils.book_new();

  // 1. Info Sheet
  const infoData = [
    ["INFORMASI INSPEKSI JASA BOGA (PERMEN 17 2024)"],
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

    ["Jumlah Hari Berjualan/Bulan", info.hariBerjualan || ""],

    [],
    ["TOTAL SKOR (POIN)", `${totalMaxScore - (totalPointsLost || 0)} / ${totalMaxScore}`],
    ["PERSENTASE SKOR IKL", `${iklScore}%`],
    ["STATUS IKL", iklScore >= 70 ? 'MEMENUHI SYARAT (MS)' : 'TIDAK MEMENUHI SYARAT (TMS)']
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  XLSX.utils.book_append_sheet(wb, wsInfo, "Informasi");

  // 2. IKL Sheet
  const iklRows = [
    ["No", "Kategori", "Kriteria Penilaian", "Bobot Skor", "Hasil", "Saran Perbaikan"]
  ];

  IKL_JASA_BOGA_DATA.forEach((item, idx) => {
    const isTMS = !!iklAnswers[item.id];
    const row: any[] = [
      idx + 1,
      item.category || "Umum",
      item.text,
      item.score,
      isTMS ? "TMS" : "MS",
      iklSuggestions[item.id] || ""
    ];
    iklRows.push(row);
  });
  
  const wsIkl = XLSX.utils.aoa_to_sheet(iklRows);
  XLSX.utils.book_append_sheet(wb, wsIkl, "Hasil IKL");

  // Save
  XLSX.writeFile(wb, `Laporan_JasaBoga_${info.nama || 'TanpaNama'}.xlsx`);
};

export const exportToWordJasaBoga = (elementId: string, filename: string) => {
  const el = document.getElementById(elementId);
  if (!el) {
    alert("Elemen dokumen tidak ditemukan!");
    return;
  }

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
