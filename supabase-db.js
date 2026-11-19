// =========================================================================
// SUPABASE DATABASE CLIENT - MA-PLUS Al-ISLAM
// =========================================================================
const envCfg = window.__ENV__ || {};
const SUPABASE_URL = envCfg.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = envCfg.SUPABASE_ANON_KEY || '';

const SupabaseDB = (() => {
  let client = null;

  function getClient() {
    if (!client && window.supabase && SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  async function pullAllToLocal(stateRef) {
    const sb = getClient();
    if (!sb) return false;

    try {
      const [siswaRes, guruRes, mapelRes, tugasRes, storeRes] = await Promise.all([
        sb.from('siswa').select('*'),
        sb.from('guru').select('*'),
        sb.from('mapel').select('*'),
        sb.from('tugas').select('*').order('id', { ascending: false }),
        sb.from('app_store').select('*')
      ]);

      if (!siswaRes.error && Array.isArray(siswaRes.data)) {
        stateRef.siswa = siswaRes.data;
      }

      if (!guruRes.error && Array.isArray(guruRes.data)) {
        stateRef.guru = guruRes.data.map((g) => ({
          ...g,
          mapelList: Array.isArray(g.mapel_list) ? g.mapel_list : (g.mapel ? [g.mapel] : [])
        }));
      }

      if (!mapelRes.error && Array.isArray(mapelRes.data)) {
        const mappedMapel = mapelRes.data.map((m) => ({
          ...m,
          kelasList: Array.isArray(m.kelas_list) ? m.kelas_list : (m.kelas ? [m.kelas] : ['Semua Kelas'])
        }));
        stateRef.mapel = mappedMapel;
        localStorage.setItem('ma_daftar_mapel', JSON.stringify(mappedMapel));
      }

      if (!tugasRes.error && Array.isArray(tugasRes.data)) {
        const mappedTugas = tugasRes.data.map((t) => ({
          id: t.id,
          nisn: t.nisn || '-',
          namaSiswa: t.nama_siswa,
          kelas: t.kelas || '',
          mapel: t.mapel || '',
          isiTugas: t.isi_tugas,
          waktu: t.waktu || '',
          nilai: t.nilai
        }));
        stateRef.tugas = mappedTugas;
        localStorage.setItem('ma_daftar_tugas', JSON.stringify(mappedTugas));
      }

      if (!storeRes.error && Array.isArray(storeRes.data)) {
        const mapStore = Object.fromEntries(storeRes.data.map((row) => [row.store_key, row.payload]));

        if (mapStore.presensi) stateRef.presensi = mapStore.presensi;
        if (mapStore.nilai) {
          stateRef.nilai = mapStore.nilai;
          localStorage.setItem('maplus_data_nilai_semester', JSON.stringify(mapStore.nilai));
        }
        if (mapStore.arsip_semester) {
          stateRef.arsipSemester = mapStore.arsip_semester;
          localStorage.setItem('maplus_arsip_rekap_semester', JSON.stringify(mapStore.arsip_semester));
        }
        if (mapStore.pengumuman) {
          stateRef.pengumuman = mapStore.pengumuman;
          localStorage.setItem('ma_pengumuman_madrasah', JSON.stringify(mapStore.pengumuman));
        }
        if (mapStore.materi) {
          stateRef.materi = mapStore.materi;
          localStorage.setItem('ma_materi_ebook', JSON.stringify(mapStore.materi.ebook || []));
          localStorage.setItem('ma_materi_ppt', JSON.stringify(mapStore.materi.ppt || []));
          localStorage.setItem('ma_materi_video', JSON.stringify(mapStore.materi.video || []));
        }
        if (mapStore.kuis) {
          localStorage.setItem('ma_ai_quiz_by_class', JSON.stringify(mapStore.kuis));
          stateRef.kuis = Object.values(mapStore.kuis);
        }
        if (mapStore.riwayat_kuis) {
          localStorage.setItem('ma_riwayat_kuis_murid', JSON.stringify(mapStore.riwayat_kuis));
        }
        if (mapStore.galeri_video) {
          localStorage.setItem('ma_galeri_video', JSON.stringify(mapStore.galeri_video));
        }
        if (mapStore.galeri_foto) {
          localStorage.setItem('ma_galeri_foto', JSON.stringify(mapStore.galeri_foto));
        }
      }

      return true;
    } catch (err) {
      console.warn('Supabase pull gagal, memakai cache lokal:', err.message);
      return false;
    }
  }

  async function pushAllFromState(stateRef) {
    const sb = getClient();
    if (!sb) return false;

    try {
      const siswaRows = (stateRef.siswa || []).map((s) => ({
        id: String(s.id),
        nisn: String(s.nisn),
        nama: s.nama,
        password: s.password || '123456',
        kelas: s.kelas,
        jk: s.jk || 'L',
        foto: s.foto || ''
      }));

      const guruRows = (stateRef.guru || []).map((g) => ({
        id: String(g.id),
        nip: String(g.nip),
        nama: g.nama,
        password: g.password,
        mapel: g.mapel || '',
        mapel_list: Array.isArray(g.mapelList) ? g.mapelList : []
      }));

      const mapelRows = (stateRef.mapel || []).map((m) => ({
        id: Number(m.id),
        nama: m.nama,
        kategori: m.kategori || '',
        guru: m.guru || '',
        kelas: m.kelas || 'Semua Kelas',
        kelas_list: Array.isArray(m.kelasList) ? m.kelasList : ['Semua Kelas']
      }));

      const tugasRows = (stateRef.tugas || []).map((t) => ({
        id: Number(t.id),
        nisn: t.nisn || '-',
        nama_siswa: t.namaSiswa,
        kelas: t.kelas || '',
        mapel: t.mapel || '',
        isi_tugas: t.isiTugas,
        waktu: t.waktu || '',
        nilai: t.nilai === '' || t.nilai === undefined ? null : t.nilai
      }));

      const storePayload = [
        { store_key: 'presensi', payload: stateRef.presensi || {} },
        { store_key: 'nilai', payload: JSON.parse(localStorage.getItem('maplus_data_nilai_semester') || '{}') },
        { store_key: 'arsip_semester', payload: JSON.parse(localStorage.getItem('maplus_arsip_rekap_semester') || '[]') },
        { store_key: 'pengumuman', payload: JSON.parse(localStorage.getItem('ma_pengumuman_madrasah') || '[]') },
        { store_key: 'materi', payload: stateRef.materi || { ebook: [], ppt: [], video: [] } },
        { store_key: 'kuis', payload: JSON.parse(localStorage.getItem('ma_ai_quiz_by_class') || '{}') },
        { store_key: 'riwayat_kuis', payload: JSON.parse(localStorage.getItem('ma_riwayat_kuis_murid') || '[]') },
        { store_key: 'galeri_video', payload: JSON.parse(localStorage.getItem('ma_galeri_video') || '[]') },
        { store_key: 'galeri_foto', payload: JSON.parse(localStorage.getItem('ma_galeri_foto') || '[]') }
      ];

      await Promise.all([
        siswaRows.length ? sb.from('siswa').upsert(siswaRows, { onConflict: 'id' }) : Promise.resolve(),
        guruRows.length ? sb.from('guru').upsert(guruRows, { onConflict: 'id' }) : Promise.resolve(),
        mapelRows.length ? sb.from('mapel').upsert(mapelRows, { onConflict: 'id' }) : Promise.resolve(),
        tugasRows.length ? sb.from('tugas').upsert(tugasRows, { onConflict: 'id' }) : Promise.resolve(),
        sb.from('app_store').upsert(storePayload, { onConflict: 'store_key' })
      ]);

      return true;
    } catch (err) {
      console.warn('Supabase push tertunda:', err.message);
      return false;
    }
  }

  async function deleteRow(table, column, value) {
    const sb = getClient();
    if (!sb) return;
    try {
      await sb.from(table).delete().eq(column, value);
    } catch (_) {}
  }

  return {
    getClient,
    pullAllToLocal,
    pushAllFromState,
    deleteRow
  };
})();
