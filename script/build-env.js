-- Tabel Master Siswa
create table if not exists public.siswa (
  id text primary key,
  nisn text unique not null,
  nama text not null,
  password text default '123456',
  kelas text not null,
  jk text not null,
  foto text,
  created_at timestamptz default now()
);

-- Tabel Master Guru
create table if not exists public.guru (
  id text primary key,
  nip text unique not null,
  nama text not null,
  password text not null,
  mapel text,
  mapel_list jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Tabel Mata Pelajaran
create table if not exists public.mapel (
  id bigint primary key,
  nama text not null,
  kategori text,
  guru text,
  kelas text,
  kelas_list jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Tabel Pengumpulan Tugas
create table if not exists public.tugas (
  id bigint primary key,
  nisn text,
  nama_siswa text not null,
  kelas text,
  mapel text,
  isi_tugas text not null,
  waktu text,
  nilai numeric,
  created_at timestamptz default now()
);

-- Tabel Penyimpanan Terpadu (Presensi, Nilai Semester, Kuis, Riwayat Kuis, Materi, Pengumuman, Galeri, Arsip)
create table if not exists public.app_store (
  store_key text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);