

export interface KTPData {
  nik: string;
  nama: string;
  tempat_tgl_lahir: string;
  jenis_kelamin: string;
  alamat: string;
  rt_rw: string;
  kel_desa: string;
  kecamatan: string;
  agama: string;
  status_perkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  berlaku_hingga: string;
}

export enum TestType {
  PRE_TEST = 'pre-test',
  POST_TEST = 'post-test',
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  isActive?: boolean;
}

export interface UserScore {
  id: string;
  name: string;
  ktp: string;
  phone: string;
  address: string;
  birthInfo: string;
  sppg: string;
  score: number;
  testType: TestType;
  timestamp: number;
}

export interface CsvRow {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer_index: string;
}
