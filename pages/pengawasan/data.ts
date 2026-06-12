export const AREAS = {
  A: "Area luar bangunan",
  B: "Area fasilitas karyawan",
  C: "Area penerimaan bahan baku/kemasan",
  D: "Area penyimpanan (bahan baku, ingredien, kemasan)",
  E: "Area pengolahan (pemotongan, pencucian, dan pemasakan)",
  F: "Area pengemasan/pemorsian",
  G: "Area loading produk jadi",
  H: "Area pencucian peralatan",
} as const;

export type AreaKey = keyof typeof AREAS;

export interface IKLCriteria {
  id: string;
  text: string;
  scores: Record<AreaKey, number | "NA">;
  category?: string;
  suggestion?: string;
}

export const IKL_DATA: IKLCriteria[] = [
  // Page 2
  {
    id: "halaman",
    text: "Halaman SPPG dalam kondisi bersih, tidak bersemak, dan tidak terdapat tanaman yang menempel langsung pada dinding bangunan pengolahan pangan.",
    scores: { A: 1, B: "NA", C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Lakukan pembersihan halaman secara rutin, potong rumput/semak, dan pastikan tidak ada tanaman rambat pada dinding bangunan.",
  },
  {
    id: "parkir",
    text: "Area parkir kendaraan jauh dari pintu masuk bangunan pengolahan pangan untuk mencegah kontaminasi asap kendaraan masuk ke ruang pengolahan pangan.",
    scores: { A: 1, B: "NA", C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Atur ulang tata letak parkir kendaraan agar menjauh dari pintu masuk area pengolahan untuk mencegah kontaminasi asap.",
  },
  {
    id: "drainase",
    text: "Bangunan SPPG dilengkapi dengan drainase pada bagian luar dengan kondisi bersih, tidak tersumbat atau meluap, dan memiliki grease trap/penangkap lemak.",
    scores: { A: 1, B: "NA", C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Bersihkan saluran drainase, pastikan air mengalir lancar, dan lakukan pemeliharaan rutin pada grease trap.",
  },
  {
    id: "pintu_pisah",
    text: "Pintu masuk bahan pangan dan produk jadi dibuat secara terpisah",
    scores: { A: 1, B: "NA", C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Sediakan pintu yang terpisah secara fisik untuk alur masuk bahan baku dan alur keluar produk jadi untuk mencegah kontaminasi silang.",
  },
  {
    id: "bebas_banjir",
    text: "Area bebas banjir, jika tidak, maka terdapat pengendalian untuk mencegah kontaminasi terhadap pangan yang sedang ditangani",
    scores: { A: 2, B: 3, C: 3, D: 3, E: 3, F: 3, G: 3, H: 3 },
    suggestion: "Tingkatkan sistem drainase atau buat tanggul/penghalang air untuk mencegah banjir masuk ke area penanganan pangan.",
  },
  {
    id: "bebas_polusi",
    text: "Area bebas dari polusi (contoh: pencemaran bau/asap/debu), dan jika tidak, maka terdapat pengendalian untuk mencegah kontaminasi terhadap pangan yang sedang ditangani.",
    scores: { A: 1, B: 1, C: 1, D: 2, E: 2, F: 2, G: 2, H: 1 },
    suggestion: "Pasang penyaring udara atau perbaiki sistem ventilasi untuk meminimalisir masuknya polusi bau, asap, atau debu.",
  },
  {
    id: "ventilasi_cukup",
    text: "Bangunan / area memiliki ventilasi udara yang cukup.",
    scores: { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, H: 1 },
    suggestion: "Tambah jumlah ventilasi atau pasang exhaust fan untuk memastikan sirkulasi udara berjalan dengan baik.",
  },
  // Page 3 - Loker & Istirahat
  {
    id: "ruang_istirahat",
    text: "Tersedia ruang/area khusus untuk istirahat karyawan yang bersih dan bebas dari vektor atau binatang pembawa penyakit (semua siklus kehidupan) dan tanda-tanda keberadaannya.",
    category: "Tempat penyimpanan atau loker karyawan",
    scores: { A: "NA", B: 1, C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Sediakan ruang istirahat khusus yang bersih, nyaman, dan terbebas dari hama atau serangga.",
  },
  {
    id: "loker_bersih",
    text: "Tersedia area penyimpanan pakaian dan barang pribadi karyawan (loker) yang bersih dan cukup (pria dan wanita).",
    category: "Tempat penyimpanan atau loker karyawan",
    scores: { A: "NA", B: 1, C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Pastikan jumlah loker mencukupi untuk seluruh karyawan dan pisahkan antara pria dan wanita dalam kondisi bersih.",
  },
  {
    id: "loker_tertib",
    text: "Tempat penyimpanan (loker) dilengkapi dengan tata tertib penggunaan loker dan tidak digunakan sebagai tempat penyimpanan makanan dan peralatan pengolahan pangan",
    category: "Tempat penyimpanan atau loker karyawan",
    scores: { A: "NA", B: 1, C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Buat aturan tertulis penggunaan loker dan pastikan tidak ada makanan atau peralatan yang disimpan di dalam loker.",
  },
  // Toilet
  {
    id: "toilet_jumlah",
    text: "Jumlah toilet cukup sesuai jumlah karyawan dan dibuat terpisah antara laki-laki dan perempuan",
    category: "Toilet",
    scores: { A: "NA", B: 1, C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Tambah jumlah toilet sesuai rasio karyawan dan pastikan pemisahan antara laki-laki dan perempuan.",
  },
  {
    id: "toilet_desain",
    text: "Desain toilet kuat dengan permukaan halus dan mudah dibersihkan",
    category: "Toilet",
    scores: { A: "NA", B: 2, C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Lakukan perbaikan permukaan toilet agar halus, tidak retak, dan mudah dibersihkan secara menyeluruh.",
  },
  {
    id: "toilet_pintu",
    text: "Pintu atau ventilasi toilet tidak membuka langsung ke area pengolahan pangan",
    category: "Toilet",
    scores: { A: "NA", B: 2, C: 2, D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Pastikan pintu toilet menutup sempurna dan tidak menghadap langsung ke arah ruang pengolahan.",
  },
  // Page 4
  {
    id: "toilet_kelengkapan",
    text: "Toilet dilengkapi dengan sabun, air mengalir, alat pengering tangan, tempat sampah, dan petunjuk mencuci tangan setelah dari toilet.",
    category: "Toilet",
    scores: { A: "NA", B: 3, C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Lengkapi toilet dengan sabun, pastikan air mengalir, sediakan pengering tangan/tisu, tempat sampah, dan pasang petunjuk mencuci tangan.",
  },
  {
    id: "wastafel_jumlah",
    text: "Jumlah cukup sesuai dengan jumlah karyawan dan posisi tempat cuci tangan mudah dijangkau di area dimana banyak kontak tangan penjamah dengan pangan",
    category: "Wastafel atau fasilitas cuci tangan",
    scores: { A: "NA", B: 2, C: 2, D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Lakukan evaluasi kecukupan jumlah wastafel dan pastikan lokasinya mudah dijangkau oleh penjamah pangan.",
  },
  {
    id: "wastafel_desain",
    text: "Desain kuat, mudah dibersihkan, dan dilengkapi dengan petunjuk cuci tangan",
    category: "Wastafel atau fasilitas cuci tangan",
    scores: { A: "NA", B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, H: 1 },
    suggestion: "Ganti atau perbaiki desain wastafel agar lebih kuat, mudah dibersihkan, dan lengkapi dengan petunjuk cara mencuci tangan yang benar.",
  },
  {
    id: "wastafel_kelengkapan",
    text: "Dilengkapi dengan air mengalir, sabun cuci tangan, dan pengering tangan (bisa hand dryer atau tissue, tetapi tidak boleh kain serbet)",
    category: "Wastafel atau fasilitas cuci tangan",
    scores: { A: "NA", B: 3, C: 3, D: 3, E: 3, F: 3, G: 3, H: 3 },
    suggestion: "Pastikan ketersediaan air mengalir, sabun, dan alat pengering tangan yang higienis (bukan serbet kain) di setiap wastafel.",
  },
  {
    id: "luas_area",
    text: "Luas area cukup untuk memudahkan pergerakan bahan atau personil",
    scores: { A: "NA", B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, H: 1 },
    suggestion: "Atur kembali alur kerja dan penempatan barang agar luas area mencukupi untuk pergerakan personil dan bahan.",
  },
  {
    id: "struktur_bangunan",
    text: "Struktur bangunan (dinding, plafon, atau atap) tidak ada lubang / retakan yang menjadi potensi masuknya atau bersarangnya vektor atau binatang pembawa penyakit.",
    scores: { A: 1, B: 1, C: 1, D: 2, E: 2, F: 2, G: 1, H: 1 },
    suggestion: "Lakukan perbaikan pada lubang atau retakan di dinding, plafon, atau atap untuk mencegah masuknya hama ke dalam bangunan.",
  },
  // Page 5 - Lantai
  {
    id: "lantai_bersih",
    text: "Lantai bersih dan terawat (tidak rusak atau tidak retak/berlubang)",
    category: "Lantai",
    scores: { A: "NA", B: 1, C: 1, D: 1, E: 2, F: 2, G: 1, H: 1 },
    suggestion: "Lakukan pembersihan lantai secara menyeluruh dan perbaiki bagian lantai yang retak atau berlubang agar tidak menjadi sarang kotoran.",
  },
  {
    id: "lantai_genangan",
    text: "Tidak terdapat genangan air",
    category: "Lantai",
    scores: { A: 1, B: 1, C: 1, D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Perbaiki kemiringan lantai atau sistem pembuangan air untuk memastikan tidak ada genangan air di area kerja.",
  },
  {
    id: "pertemuan_lantai",
    text: "Pertemuan lantai dan dinding tidak membentuk sudut mati (jika tidak demikian, maka harus dilakukan pembersihan secara rutin dan tidak ditemukan bukti visual kumpulan debu/kotoran)",
    category: "Lantai",
    scores: { A: "NA", B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, H: 1 },
    suggestion: "Lakukan pembersihan rutin pada sudut pertemuan lantai dan dinding, atau rencanakan pembuatan sudut melengkung (coved) di masa depan.",
  },
  {
    id: "pintu_sempurna",
    text: "Pintu dalam kondisi bersih dan terawat (tidak berlubang dan dapat menutup sempurna)",
    scores: { A: "NA", B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, H: 1 },
    suggestion: "Pastikan semua pintu dalam kondisi bersih, tidak berlubang, dan dapat menutup dengan sempurna untuk mencegah masuknya hama.",
  },
  {
    id: "cahaya_terang",
    text: "Pencahayaan cukup terang dengan lampu tercover (jika lampu terbuat dari bahan mudah pecah) dan kondisi cover (jika ada) bersih dan terawat.",
    scores: { A: "NA", B: 1, C: 1, D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Tingkatkan intensitas cahaya di area kerja dan pastikan seluruh lampu memiliki pelindung (cover) yang bersih dan tidak pecah.",
  },
  // Langit-langit
  {
    id: "langit_tinggi",
    text: "Tinggi minimal 2.4 meter dari lantai",
    category: "Langit-langit",
    scores: { A: "NA", B: 1, C: 1, D: 1, E: 1, F: 1, G: 1, H: 1 },
    suggestion: "Jika memungkinkan, sesuaikan ketinggian langit-langit agar minimal mencapai 2.4 meter untuk sirkulasi udara yang lebih baik.",
  },
  {
    id: "langit_kondisi",
    text: "Kondisi tertutup, bersih dan terawat (contoh: tidak ada jamur, debu, kotoran, sarang hama atau sawang)",
    category: "Langit-langit",
    scores: { A: "NA", B: 1, C: 2, D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Lakukan pembersihan rutin pada langit-langit dari debu, sarang laba-laba, atau jamur, serta perbaiki bagian yang rusak.",
  },
  // Page 6
  {
    id: "kondensasi",
    text: "Tidak ada kondensasi air",
    scores: { A: "NA", B: 1, C: 1, D: 2, E: 2, F: 2, G: 2, H: 1 },
    suggestion: "Tingkatkan sistem ventilasi atau isolasi area dingin untuk mencegah terjadinya kondensasi air pada plafon atau dinding.",
  },
  {
    id: "sampah_serak",
    text: "Tidak ada sampah berserakan",
    category: "Tempat sampah dan limbah",
    scores: { A: 1, B: 1, C: 1, D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Lakukan pembersihan area secara berkala dan pastikan sampah selalu dibuang pada tempatnya agar tidak berserakan.",
  },
  {
    id: "sampah_tutup",
    text: "Terdapat tempat sampah dalam kondisi tertutup, sampah tidak mengunung (frekuensi pembuangan minimal 1 x 24 jam) dan kondisi bersih",
    category: "Tempat sampah dan limbah",
    scores: { A: 1, B: 1, C: 1, D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Pastikan tempat sampah selalu tertutup, tidak meluap, dan rutin dikosongkan minimal sekali setiap 24 jam.",
  },
  {
    id: "bebas_vektor",
    text: "Bebas vektor atau binatang pembawa penyakit (semua tingkat siklus kehidupannya) dan tanda-tanda keberadaannya (contoh: kotoran atau bagian tubuh hama)",
    category: "Vektor atau binatang pembawa penyakit",
    scores: { A: 1, B: 1, C: 2, D: 3, E: 3, F: 3, G: 3, H: 2 },
    suggestion: "Lakukan tindakan pengendalian hama secara menyeluruh untuk membasmi vektor seperti lalat, kecoa, atau tikus.",
  },
  {
    id: "jebakan_hama",
    text: "Terdapat jebakan hama yang ditempatkan pada posisi yang sesuai dan dalam kondisi terawat (tidak rusak, tidak berjamur, dan bersih).",
    category: "Vektor atau binatang pembawa penyakit",
    scores: { A: 1, B: 1, C: 2, D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Pasang jebakan hama di titik-titik strategis dan pastikan dalam kondisi terawat serta dipantau secara rutin.",
  },
  {
    id: "kendali_kimia",
    text: "Pengendalian tidak mengunakan bahan kimia (pestisida) di area dalam bangunan pengolahan pangan",
    category: "Vektor atau binatang pembawa penyakit",
    scores: { A: "NA", B: 1, C: 3, D: 3, E: 3, F: 3, G: 3, H: 3 },
    suggestion: "Hentikan penggunaan pestisida kimia di dalam ruang pengolahan dan beralih ke metode pengendalian fisik yang aman.",
  },
  // Page 7
  {
    id: "ventilasi_bukaan",
    text: "JIKA ventilasi berupa bukaan (contoh: jendela/exhaust) yang terbuka keluar, maka terdapat kasa/tirai/plastik curtain anti serangga untuk mencegah masuknya vektor atau binatang pembawa penyakit. Kasa/tirai/plastik curtain dalam kondisi bersih dan terawat.",
    scores: { A: 1, B: 1, C: 2, D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Pasang kasa anti serangga atau tirai plastik pada setiap ventilasi yang terbuka keluar untuk mencegah masuknya hama.",
  },
  {
    id: "simpan_tidak_lantai",
    text: "Penyimpanan bahan baku, ingredien dan kemasan tidak langsung menyentuh lantai (contoh: menggunakan palet) dengan jarak minimal 15 cm dari lantai, 5 cm dari dinding, dan 60 cm dari langit-langit",
    category: "Penyimpanan bahan baku, ingredien, kemasan, bahan kimia dan pangan matang",
    scores: { A: "NA", B: 1, C: "NA", D: 1, E: 1, F: 1, G: 1, H: "NA" },
    suggestion: "Gunakan palet untuk menyimpan bahan pangan agar tidak menyentuh lantai, dengan jarak min 15cm dari lantai dan 5cm dari dinding.",
  },
  {
    id: "kemasan_bekas",
    text: "Kemasan bekas bahan baku mentah tidak disimpan di area yang terdapat pangan matang",
    category: "Penyimpanan bahan baku, ingredien, kemasan, bahan kimia dan pangan matang",
    scores: { A: "NA", B: "NA", C: "NA", D: "NA", E: 2, F: 2, G: 2, H: "NA" },
    suggestion: "Segera keluarkan kemasan bekas bahan baku mentah dari area penyimpanan pangan matang untuk menghindari kontaminasi silang.",
  },
  {
    id: "pisah_mentah_matang",
    text: "Penyimpanan bahan mentah tidak menyatu dengan pangan matang (contoh di ruang penyimpanan, chiller atau freezer), dan penyimpanan bahan pangan (mentah atau matang) tidak menyatu dengan penyimpanan bahan kimia.",
    category: "Penyimpanan bahan baku, ingredien, kemasan, bahan kimia dan pangan matang",
    scores: { A: "NA", B: "NA", C: 3, D: 3, E: 3, F: 3, G: 3, H: "NA" },
    suggestion: "Pisahkan secara tegas penyimpanan bahan mentah, pangan matang, dan bahan kimia untuk mencegah bahaya kontaminasi.",
  },
  // Page 8
  {
    id: "bahan_baik",
    text: "Bahan baku pangan dan ingredient dalam kondisi baik dan tidak busuk atau berlendir",
    scores: { A: "NA", B: "NA", C: 3, D: 3, E: 3, F: 3, G: 3, H: "NA" },
    suggestion: "Hentikan penggunaan bahan baku yang busuk atau berlendir, dan pastikan hanya bahan segar berkualitas yang digunakan.",
  },
  {
    id: "bahan_olah_baik",
    text: "Khusus untuk bahan baku olahan terkemas dalam kondisi baik (tidak kedaluwarsa, kemasan utuh/tidak bocor, dan memiliki izin edar dari instansi terkait)",
    scores: { A: "NA", B: "NA", C: 3, D: 3, E: 3, F: 3, G: 3, H: "NA" },
    suggestion: "Tingkatkan ketelitian dalam pengecekan tanggal kedaluwarsa serta izin edar pada setiap bahan baku olahan terkemas.",
  },
  {
    id: "suhu_simpan",
    text: "Khusus untuk chiller atau freezer yang digunakan untuk menyimpan bahan pangan, ingredien, atau pangan siap saji, maka suhu penyimpanan harus sesuai (chiller 0 – 4 oC dan freezer ≤ (-15 oC))",
    scores: { A: "NA", B: "NA", C: "NA", D: 2, E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Lakukan kalibrasi pada chiller/freezer dan pastikan suhu operasional selalu sesuai standar (0-4C / <= -15C).",
  },
  {
    id: "simpan_kimia",
    text: "Bahan kimia (contoh untuk cuci tangan/sanitasi tangan, cuci peralatan, pembersihan lantai) disimpan pada area khusus dengan akses terbatas dan memiliki identitas yang jelas. Kuantitas bahan kimia yang digunakan di setiap area hanya untuk penggunaan harian (tidak dalam kemasan galon/bulk)",
    scores: { A: "NA", B: 1, C: 1, D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Pastikan bahan kimia memiliki identitas jelas, disimpan di area tertutup, dan hanya tersedia dalam jumlah pemakaian harian di area kerja.",
  },
  {
    id: "matang_terbuka",
    text: "Tidak ada pangan matang yang disimpan sementara di area luar bangunan pengolahan dalam kondisi terbuka.",
    scores: { A: 3, B: "NA", C: "NA", D: "NA", E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Pastikan tidak ada pangan matang yang diletakkan di luar bangunan, terutama dalam kondisi terbuka tanpa perlindungan.",
  },
  {
    id: "simpan_kemasan_kontak",
    text: "Penyimpanan kemasan yang kontak pangan matang dalam kondisi bersih",
    scores: { A: "NA", B: "NA", C: "NA", D: 3, E: 3, F: 3, G: 3, H: 3 },
    suggestion: "Simpan kemasan yang akan kontak langsung dengan pangan matang di tempat yang bersih dan terbebas dari debu atau kontaminan.",
  },
  // Page 9 - Personil
  {
    id: "personil_sehat",
    text: "Personil sehat/tidak menunjukkan gejala penyakit",
    category: "Personil",
    scores: { A: "NA", B: "NA", C: 1, D: 3, E: 3, F: 3, G: 3, H: 3 },
    suggestion: "Pastikan personil yang sakit tidak diperbolehkan menangani pangan hingga dinyatakan sehat kembali.",
  },
  {
    id: "personil_apd",
    text: "Personil menggunakan APD (celemek, masker, hairnet/penutup rambut) dengan lengkap dan benar",
    category: "Personil",
    scores: { A: "NA", B: "NA", C: "NA", D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Lakukan pengawasan ketat terhadap penggunaan APD lengkap (celemek, masker, hairnet) oleh seluruh penjamah pangan.",
  },
  {
    id: "personil_pakaian",
    text: "Personil menggunakan pakaian kerja khusus selama berada di area pengolahan pangan",
    category: "Personil",
    scores: { A: "NA", B: "NA", C: "NA", D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Wajibkan penggunaan pakaian kerja khusus yang bersih bagi setiap personil yang memasuki area pengolahan.",
  },
  {
    id: "personil_higiene",
    text: "Personil menerapkan personil higiene dengan benar (contoh: tidak memakai aksesoris/perhiasan, rutin mencuci tangan, tidak batuk/bersin langsung di atas pangan,tidak merokok/makan/minum saat mengolah pangan, tidak mengaruk atau menyentuh bagian badan dan kemudian menyentuh pangan)",
    category: "Personil",
    scores: { A: "NA", B: "NA", C: "NA", D: 3, E: 3, F: 3, G: 3, H: 2 },
    suggestion: "Lakukan pelatihan ulang terkait higiene personil secara berkala untuk memastikan budaya bersih diterapkan dengan benar.",
  },
  {
    id: "personil_luka",
    text: "Jika personil memiliki luka, maka luka harus ditutup dengan perban/sejenisnya dan ditutup penutup yang tahan air dan dalam kondisi bersih",
    category: "Personil",
    scores: { A: "NA", B: "NA", C: "NA", D: 3, E: 3, F: 3, G: 3, H: 3 },
    suggestion: "Pastikan setiap personil yang memiliki luka menutupnya dengan perban tahan air yang bersih sebelum bekerja.",
  },
  {
    id: "personil_paham",
    text: "Personil yang bekerja di area ini memiliki pemahaman mengenai prinsip umum higiene personil dan keamanan pangan",
    category: "Personil",
    scores: { A: "NA", B: "NA", C: "NA", D: 2, E: 2, F: 2, G: 2, H: 2 },
    suggestion: "Adakan sesi sosialisasi/pelatihan rutin untuk meningkatkan pemahaman personil tentang prinsip higiene dan keamanan pangan.",
  },
  // Page 10 - Peralatan
  {
    id: "peralatan_aman",
    text: "Dibuat dari bahan tara pangan (kedap air, tahan karat, tidak terbuat dari kayu, dan tidak mentransfer zat berbahaya) dan kondisi terawat (tidak rusak, tidak berkarat, dan bersih)",
    category: "Peralatan atau kemasan yang kontak langsung dengan pangan",
    scores: { A: "NA", B: "NA", C: 1, D: 2, E: 3, F: 3, G: 3, H: "NA" },
    suggestion: "Gunakan peralatan yang terbuat dari bahan tara pangan (food grade) dan pastikan tidak ada peralatan berbahan kayu di area produksi.",
  },
  {
    id: "peralatan_terawat",
    text: "Peralatan dalam kondisi terawat (tidak rusak/pecah, tidak berkarat, dan bersih)",
    category: "Peralatan atau kemasan yang kontak langsung dengan pangan",
    scores: { A: "NA", B: "NA", C: 1, D: 2, E: 3, F: 3, G: 3, H: 1 },
    suggestion: "Lakukan pemeliharaan dan pembersihan rutin pada seluruh peralatan agar tidak rusak, berkarat, atau kotor.",
  },
  {
    id: "kemasan_matang_bersih",
    text: "Khusus untuk kemasan pangan matang dalam kondisi bersih dan terawat (tidak rusak/pecah, tidak berkarat, dan bersih (tidak terdapat sisa bahan kimia pencucian atau sisa makanan), serta dapat ditutup sempurna)",
    category: "Peralatan atau kemasan yang kontak langsung dengan pangan",
    scores: { A: "NA", B: "NA", C: "NA", D: "NA", E: "NA", F: 3, G: 3, H: "NA" },
    suggestion: "Pastikan kemasan pangan matang dalam kondisi sangat bersih, tidak ada sisa sabun/makanan, dan dapat ditutup rapat.",
  },
  // Proses Pengolahan
  {
    id: "thawing_benar",
    text: "Jika terdapat proses thawing/pencairan bahan pangan, maka dilakukan dengan benar.",
    category: "Proses Pengolahan Pangan",
    scores: { A: "NA", B: "NA", C: "NA", D: 2, E: "NA", F: "NA", G: "NA", H: "NA" },
    suggestion: "Pastikan proses thawing dilakukan dengan benar (misal di chiller atau air mengalir) untuk mencegah pertumbuhan bakteri.",
  },
  {
    id: "masak_matang",
    text: "Pangan dimasak sampai matang sempurna dengan penampakan visual normal (tidak ada benda asing) dan bau normal",
    category: "Proses Pengolahan Pangan",
    scores: { A: "NA", B: "NA", C: "NA", D: "NA", E: 3, F: "NA", G: "NA", H: "NA" },
    suggestion: "Pastikan seluruh pangan dimasak hingga matang sempurna dan periksa kualitas visual serta aromanya sebelum disajikan.",
  },
  // Page 11
  {
    id: "suhu_masak",
    text: "Suhu inti pangan yang dimasak minimal 75oC (lakukan sampling pada saat inspeksi dan ukur menggunakan termometer)",
    scores: { A: "NA", B: "NA", C: "NA", D: "NA", E: 3, F: "NA", G: "NA", H: "NA" },
    suggestion: "Wajibkan penggunaan termometer untuk memastikan suhu inti pangan mencapai minimal 75C saat dimasak.",
  },
  {
    id: "kendaraan_bersih",
    text: "Kondisi kendaraan pengangkutan pangan matang bersih, terawat dan bebas dari vektor atau binatang pembawa penyakit.",
    category: "Proses Pengangkutan Pangan Matang",
    scores: { A: "NA", B: "NA", C: "NA", D: "NA", E: "NA", F: "NA", G: 2, H: "NA" },
    suggestion: "Pastikan kendaraan pengangkut pangan matang dalam kondisi bersih, terawat, dan tertutup untuk menghindari hama.",
  },
  {
    id: "angkut_tertutup",
    text: "Pangan yang diangkut dalam kondisi kemasan tertutup sempurna dan pengangkutan sesuai untuk menjaga suhu panas atau dingin (sesuai jenis pangan)",
    category: "Proses Pengangkutan Pangan Matang",
    scores: { A: "NA", B: "NA", C: "NA", D: "NA", E: "NA", F: "NA", G: 3, H: "NA" },
    suggestion: "Gunakan wadah tertutup sempurna dan pastikan suhu pangan tetap terjaga selama proses pengangkutan.",
  },
];

export const SPECIAL_REQUIREMENTS = [
  "Pengelola/pemilik SPPG memiliki sertifikat pelatihan keamanan pangan siap saji",
  "Penjamah pangan yang bekerja di SPPG sudah memiliki sertifikat pelatihan keamanan pangan siap saji minimal 50%",
  "Penjamah dilakukan pemeriksaan kesehatan secara berkala minimal 1 (satu) kali setahun dan dapat dibuktikan dengan rekaman pemeriksaan kesehatan dari unit pelayanan kesehatan setempat.",
  "Tersedia hasil analisa pengujian air dengan hasil yang sesuai dengan persyaratan air minum yang berlaku dan rekaman hasil analisa laboratorium dapat ditunjukkan (1 tahun terakhir)",
  "Tersedia laporan hasil pemeriksaan laboratorium sampel pangan (minimal 1 kali dalam 1 tahun terakhir) sesuai dengan Standar Baku Mutu Kesehatan Lingkungan (SBMKL) yang berlaku saat ini dan hasil analisa sesuai atau masuk persyaratan yang berlaku.",
  "Tersedia dokumentasi pengawasan internal secara berkala (minimal dilakukan 6 bulan sekali) menggunakan formulir IKL dan dibuktikan dengan rekaman pengawasan internal (IKL) yang sudah terisi.",
  "SPPG sudah menerapkan penyimpanan sampel arsip (bank sample) untuk pangan yang diproduksi harian selama 2 x 24 jam pada suhu penyimpanan chiller/kulkas.",
  "Tersedia perlengkapan P3K, obat-obatan, dan APAR yang tidak kedaluwarsa dan mudah dijangkau",
  "Tersedia dokumentasi atau rekaman: SOP sanitasi fasilitas dan ruangan",
  "Tersedia dokumentasi atau rekaman: SOP sanitasi peralatan",
  "Tersedia dokumentasi atau rekaman: SOP persiapan bahan pangan",
  "Tersedia dokumentasi atau rekaman: SOP pengolahan",
  "Tersedia dokumentasi atau rekaman: SOP penyimpanan makanan dan sampel makanan",
  "Tersedia dokumentasi atau rekaman: SOP keselamatan kerja",
  "Tersedia dokumentasi atau rekaman: SOP higiene dan pemeriksaan kesehatan personil",
  "Tersedia dokumentasi atau rekaman: SOP pemeliharaan peralatan dan bangunan",
  "Tersedia dokumentasi atau rekaman: SOP pengendalian serangga, hewan pengerat, dan hewan peliharaan",
  "Tersedia dokumentasi atau rekaman: SOP tindakan apabila terjadi keracunan makanan",
  "Tersedia dokumentasi atau rekaman: Laporan hasil kalibrasi alat ukur seperti termometer (1 tahun terakhir)",
  "Tersedia dokumentasi atau rekaman: Rekaman monitoring suhu chiller dan freezer",
  "Tersedia dokumentasi atau rekaman: Rekaman pembersihan fasilitas (contoh: wastafel, toilet, area kerja)",
];
