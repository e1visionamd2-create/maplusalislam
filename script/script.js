// =========================================================================
// KONFIGURASI STORAGE BERSIH & STATE UTAMA MA-PLUS Al-ISLAM (TANPA DATA BAWAAN)
// =========================================================================
const STORAGE_KEY = 'maplus_alislam_clean_v1';

const defaultState = {
  currentUser: null,
  mapel: [],
  guru: [],
  siswa: [],
  materi: {
    ebook: [],
    ppt: [],
    video: []
  },
  kuis: [],
  tugas: [],
  presensi: {},
  nilai: {},
  arsipSemester: [],
  pengumuman: [],
  currentView: 'dashboard'
};

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      materi: {
        ...structuredClone(defaultState.materi),
        ...(parsed.materi || {})
      }
    };
  } catch (err) {
    return structuredClone(defaultState);
  }
}

let state = loadInitialState();
if (!state.currentView) state.currentView = 'dashboard';

const sessionUserRaw = sessionStorage.getItem('maplus_current_user');
if (sessionUserRaw) {
  try {
    state.currentUser = JSON.parse(sessionUserRaw);
  } catch (err) {
    state.currentUser = null;
  }
}

let kelasAktifGuru = sessionStorage.getItem('kelasAktifGuru') || '';
let mapelAktifGuru = sessionStorage.getItem('mapelAktifGuru') || '';

function saveState() {
  state.mapel = getDaftarMapel();
  state.tugas = getDaftarTugas();
  state.materi = {
    ebook: getDaftarMateri('ebook'),
    ppt: getDaftarMateri('ppt'),
    video: getDaftarMateri('video')
  };
  state.pengumuman = getDaftarPengumuman();
  state.arsipSemester = JSON.parse(localStorage.getItem('maplus_arsip_rekap_semester') || '[]');
  state.kuis = Object.values(getSemuaKuisPerKelas());

  const snapshot = {
    currentUser: state.currentUser,
    mapel: state.mapel,
    guru: state.guru,
    siswa: state.siswa,
    materi: state.materi,
    kuis: state.kuis,
    tugas: state.tugas,
    presensi: state.presensi,
    nilai: state.nilai,
    arsipSemester: state.arsipSemester,
    pengumuman: state.pengumuman,
    currentView: state.currentView
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function simpanSesiUser() {
  if (state.currentUser) {
    sessionStorage.setItem('maplus_current_user', JSON.stringify(state.currentUser));
  } else {
    sessionStorage.removeItem('maplus_current_user');
  }
  saveState();
}

// =========================================================================
// HELPER LABEL MAPEL + KELAS & HAK AKSES
// =========================================================================
function formatLabelMapelDenganKelas(mapelObj) {
  if (!mapelObj) return '';
  const kelasArr = Array.isArray(mapelObj.kelasList) && mapelObj.kelasList.length > 0
    ? mapelObj.kelasList
    : (mapelObj.kelas ? [mapelObj.kelas] : ['Semua Kelas']);

  if (kelasArr.includes('Semua Kelas')) {
    return `${mapelObj.nama} (Semua Kelas)`;
  }
  return `${mapelObj.nama} (${kelasArr.join(', ')})`;
}

function isMapelBerlakuUntukKelas(mapelObj, kelasTarget) {
  if (!kelasTarget) return true;
  const kelasArr = Array.isArray(mapelObj.kelasList) && mapelObj.kelasList.length > 0
    ? mapelObj.kelasList
    : (mapelObj.kelas ? [mapelObj.kelas] : ['Semua Kelas']);

  return kelasArr.includes('Semua Kelas') || kelasArr.includes(kelasTarget);
}

function getMapelDiampuGuru(dataGuru) {
  if (!dataGuru) return [];
  if (Array.isArray(dataGuru.mapelList) && dataGuru.mapelList.length > 0) {
    return dataGuru.mapelList;
  }
  if (typeof dataGuru.mapel === 'string' && dataGuru.mapel.trim() !== '') {
    return [dataGuru.mapel.trim()];
  }
  return [];
}

function isAkunGuruAtauAdmin() {
  const isStateAdmin = Boolean(
    state.currentUser &&
    (state.currentUser.role === 'admin' || state.currentUser.role === 'guru')
  );
  const menuMgmt = document.getElementById('menu-management-wrapper');
  const mobileMgmt = document.getElementById('mobile-menu-management-wrapper');
  const isMgmtVisible = Boolean(
    (menuMgmt && !menuMgmt.classList.contains('hidden')) ||
    (mobileMgmt && !mobileMgmt.classList.contains('hidden'))
  );
  return Boolean(isStateAdmin || isMgmtVisible);
}

// =========================================================================
// KONTROL MENU & SUB-MENU MOBILE / HP
// =========================================================================
function toggleMobileMenu(forceState = null) {
  const drawer = document.getElementById('mobile-menu-drawer');
  const btn = document.getElementById('btn-mobile-menu');
  const icon = document.getElementById('icon-mobile-menu');
  if (!drawer) return;

  const akanTerbuka = forceState !== null ? forceState : drawer.classList.contains('hidden');
  drawer.classList.toggle('hidden', !akanTerbuka);
  if (btn) btn.setAttribute('aria-expanded', String(akanTerbuka));
  if (icon) {
    icon.setAttribute('data-lucide', akanTerbuka ? 'x' : 'menu');
  }

  if (window.lucide) lucide.createIcons();
}

function closeMobileMenu() {
  toggleMobileMenu(false);
}

function toggleMobileSubmenu(submenuId, chevronId = null) {
  const submenu = document.getElementById(submenuId);
  if (!submenu) return;

  const akanBuka = submenu.classList.contains('hidden');
  submenu.classList.toggle('hidden', !akanBuka);

  if (chevronId) {
    const chevron = document.getElementById(chevronId);
    if (chevron) {
      chevron.classList.toggle('rotate-180', akanBuka);
    }
  }
}

function sinkronkanAksesMenuMobile() {
  const isGuruOrAdmin = Boolean(
    state.currentUser &&
    (state.currentUser.role === 'admin' || state.currentUser.role === 'guru')
  );
  const isSiswa = Boolean(
    state.currentUser &&
    state.currentUser.role === 'siswa'
  );

  const mobileMgmt = document.getElementById('mobile-menu-management-wrapper');
  const mobileSubMgmt = document.getElementById('mobile-submenu-management');
  if (mobileMgmt) {
    mobileMgmt.classList.toggle('hidden', !isGuruOrAdmin);
    if (!isGuruOrAdmin && mobileSubMgmt) {
      mobileSubMgmt.classList.add('hidden');
    }
  }

  const mobilePortalSiswa = document.getElementById('mobile-menu-portal-siswa');
  if (mobilePortalSiswa) {
    mobilePortalSiswa.classList.toggle('hidden', !isSiswa);
  }

  document.querySelectorAll('.khusus-admin').forEach(el => {
    el.classList.toggle('hidden', !isGuruOrAdmin);
  });
}

function formatTanggalSekarang() {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) + ' WIB';
}

function showToast(msg, type = "success") {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const bg = type === 'error' ? 'bg-red-700' : type === 'warning' ? 'bg-amber-600' : type === 'info' ? 'bg-purple-700' : 'bg-emerald-800';
  toast.className = `px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-lg transition-all ${bg}`;
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// =========================================================================
// PENGATURAN GANTI FOTO LATAR BELAKANG BERANDA (DASHBOARD)
// =========================================================================
const DEFAULT_BG_DASHBOARD = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80";

function terapkanLatarBelakangDashboard() {
  const banner = document.getElementById('hero-banner-dashboard');
  const btnReset = document.getElementById('btn-reset-bg-dashboard');
  if (!banner) return;

  const customBg = localStorage.getItem('ma_custom_bg_dashboard');
  const urlGambar = customBg || DEFAULT_BG_DASHBOARD;

  banner.style.backgroundImage = `linear-gradient(to right, rgba(6, 78, 59, 0.88), rgba(4, 47, 46, 0.80)), url('${urlGambar}')`;
  banner.style.backgroundSize = 'cover';
  banner.style.backgroundPosition = 'center';

  if (btnReset) {
    btnReset.classList.toggle('hidden', !customBg);
  }
}

function gantiLatarBelakangDashboard(event) {
  if (!isAkunGuruAtauAdmin()) {
    showToast("Akses Ditolak! Hanya Admin / Guru yang dapat mengganti foto latar.", "error");
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Silakan pilih file gambar (JPG, PNG, atau WEBP)!');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const maxWidth = 1400;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

      try {
        localStorage.setItem('ma_custom_bg_dashboard', compressedDataUrl);
        terapkanLatarBelakangDashboard();
        showToast("Foto latar belakang beranda berhasil diganti!");
      } catch (err) {
        alert("Ukuran gambar terlalu besar untuk disimpan di browser. Gunakan foto dengan ukuran lebih kecil.");
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function resetLatarBelakangDashboard() {
  if (!confirm("Kembalikan foto latar belakang beranda ke gambar bawaan?")) return;
  localStorage.removeItem('ma_custom_bg_dashboard');
  terapkanLatarBelakangDashboard();
  showToast("Foto latar belakang dikembalikan ke default.");
}

// =========================================================================
// FOTO PROFIL STRUKTUR PIMPINAN YAYASAN & MADRASAH
// =========================================================================
function muatFotoStrukturPimpinan() {
  const daftarKey = ['ketua', 'kamad', 'kurikulum', 'kesiswaan', 'bendahara'];
  const savedFotos = JSON.parse(localStorage.getItem('ma_foto_pimpinan') || '{}');

  daftarKey.forEach(key => {
    const imgEl = document.getElementById(`foto-pimpinan-${key}`);
    if (imgEl && savedFotos[key]) {
      imgEl.src = savedFotos[key];
    }
  });
}

function gantiFotoPimpinan(event, jabatanKey) {
  if (!isAkunGuruAtauAdmin()) {
    showToast("Akses Ditolak! Hanya Admin / Guru yang dapat mengganti foto pimpinan.", "error");
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Silakan pilih file gambar (JPG, PNG, atau WEBP)!');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const maxSize = 300;
      const scale = Math.max(img.width, img.height) > maxSize ? maxSize / Math.max(img.width, img.height) : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      try {
        const savedFotos = JSON.parse(localStorage.getItem('ma_foto_pimpinan') || '{}');
        savedFotos[jabatanKey] = compressedDataUrl;
        localStorage.setItem('ma_foto_pimpinan', JSON.stringify(savedFotos));

        muatFotoStrukturPimpinan();
        showToast("Foto profil pimpinan berhasil diperbarui!");
      } catch (err) {
        alert("Ukuran gambar terlalu besar untuk disimpan di browser.");
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// =========================================================================
// PROTEKSI HAK AKSES & NAVIGASI HALAMAN
// =========================================================================
function navigateTo(viewId, isBrowserBack = false) {
  const restrictedViews = ['siswa', 'guru', 'presensi', 'nilai'];

  if (restrictedViews.includes(viewId)) {
    if (!state.currentUser || (state.currentUser.role !== 'admin' && state.currentUser.role !== 'guru')) {
      showToast("Akses Ditolak! Hanya Guru / Admin yang dapat mengelola data dan absensi.", "error");
      viewId = 'dashboard';
    }
  }

  if (viewId === 'portal-siswa') {
    if (!state.currentUser || state.currentUser.role !== 'siswa') {
      showToast("Silakan login menggunakan akun Siswa untuk membuka Portal Rapor.", "info");
      viewId = 'login';
    }
  }

  if (!isBrowserBack && state.currentView !== viewId) {
    history.pushState({ view: viewId }, '', '#' + viewId);
  }

  state.currentView = viewId;
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

  const targetView = document.getElementById('view-' + viewId);
  if (targetView) {
    targetView.classList.remove('hidden');
  } else {
    const dashboardView = document.getElementById('view-dashboard');
    if (dashboardView) dashboardView.classList.remove('hidden');
    state.currentView = 'dashboard';
  }

  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'tentang') {
    muatFotoStrukturPimpinan();
    renderGaleriSekolah();
  }
  if (viewId === 'mapel') {
    renderDaftarMapel();
    renderMapelCards();
  }
  if (viewId === 'kuis') {
    sinkronisasiDropdownMapel();
    renderKuisAktif();
    updateVisibilitasDanStatistikMurid();
  }
  if (viewId === 'tugas') {
    sinkronisasiDropdownMapel();
    renderDaftarTugas();
    updateVisibilitasDanStatistikMurid();
  }
  if (viewId === 'ebook') renderMateriKategori('ebook');
  if (viewId === 'ppt') renderMateriKategori('ppt');
  if (viewId === 'video') renderMateriKategori('video');
  if (viewId === 'siswa') renderSiswaTable();
  if (viewId === 'guru') renderGuruTable();
  if (viewId === 'presensi') renderPresensiTable();
  if (viewId === 'nilai') renderNilaiTable(true);
  if (viewId === 'portal-siswa') renderPortalSiswa();

  closeMobileMenu();
  updateNavbar();
  if (window.lucide) lucide.createIcons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
  if (window.history.length > 1 && location.hash && location.hash !== '#dashboard') {
    window.history.back();
  } else {
    navigateTo('dashboard');
  }
}

function bukaSubMateri(kategori) {
  navigateTo(kategori);
}

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.view) {
    navigateTo(e.state.view, true);
  } else if (location.hash) {
    navigateTo(location.hash.replace('#', ''), true);
  } else {
    navigateTo('dashboard', true);
  }
});

// =========================================================================
// NAVBAR, LOGIN & LOGOUT
// =========================================================================
function updateNavbar() {
  const userBadge = document.getElementById('user-badge');
  const authBtnText = document.getElementById('auth-btn-text');
  const mgmtWrapper = document.getElementById('menu-management-wrapper');

  sinkronkanAksesMenuMobile();

  if (!state.currentUser) {
    if (userBadge) userBadge.classList.add('hidden');
    if (mgmtWrapper) mgmtWrapper.classList.add('hidden');
    if (authBtnText) authBtnText.innerText = 'Masuk';
    return;
  }

  if (userBadge) {
    userBadge.classList.remove('hidden');
    userBadge.classList.add('flex');
  }
  if (authBtnText) authBtnText.innerText = 'Keluar';

  const uName = document.getElementById('user-name');
  const uRole = document.getElementById('user-role-label');
  const uImg = document.getElementById('user-avatar-img');
  const uTxt = document.getElementById('user-avatar-txt');

  if (state.currentUser.role === 'admin' || state.currentUser.role === 'guru') {
    if (mgmtWrapper) mgmtWrapper.classList.remove('hidden');
    const mapelDiampu = getMapelDiampuGuru(state.currentUser.data);
    if (uName) uName.innerText = state.currentUser.data.nama || 'Guru / Staf';
    if (uRole) {
      if (mapelAktifGuru) {
        uRole.innerText = 'Guru: ' + mapelAktifGuru;
      } else if (mapelDiampu.length > 0) {
        uRole.innerText = 'Guru (' + mapelDiampu.length + ' Mapel)';
      } else {
        uRole.innerText = 'Admin / Pengajar';
      }
    }
    if (uImg) uImg.classList.add('hidden');
    if (uTxt) {
      uTxt.innerText = (state.currentUser.data.nama || 'A').charAt(0).toUpperCase();
      uTxt.classList.remove('hidden');
    }
  } else {
    if (mgmtWrapper) mgmtWrapper.classList.add('hidden');
    const s = state.currentUser.data;
    if (uName) uName.innerText = s.nama;
    if (uRole) uRole.innerText = 'Siswa (' + s.kelas + ')';
    if (s.foto && uImg && uTxt) {
      uImg.src = s.foto;
      uImg.classList.remove('hidden');
      uTxt.classList.add('hidden');
    }
  }
}

function switchLoginTab(tab) {
  const formSiswa = document.getElementById('form-login-siswa');
  const formStaf = document.getElementById('form-login-staf');
  const tabSiswa = document.getElementById('tab-login-siswa');
  const tabStaf = document.getElementById('tab-login-staf');

  if (tab === 'siswa') {
    if (formSiswa) formSiswa.classList.remove('hidden');
    if (formStaf) formStaf.classList.add('hidden');
    if (tabSiswa) tabSiswa.className = 'flex-1 py-3 text-xs font-bold text-center border-b-2 border-emerald-600 text-emerald-700 bg-white transition';
    if (tabStaf) tabStaf.className = 'flex-1 py-3 text-xs font-bold text-center text-slate-500 hover:text-slate-700 transition';
  } else {
    if (formSiswa) formSiswa.classList.add('hidden');
    if (formStaf) formStaf.classList.remove('hidden');
    if (tabStaf) tabStaf.className = 'flex-1 py-3 text-xs font-bold text-center border-b-2 border-emerald-600 text-emerald-700 bg-white transition';
    if (tabSiswa) tabSiswa.className = 'flex-1 py-3 text-xs font-bold text-center text-slate-500 hover:text-slate-700 transition';
  }
}

function doLoginSiswa(e) {
  e.preventDefault();
  const inputNis = document.getElementById('login-nis');
  const inputPass = document.getElementById('login-pass-siswa');
  if (!inputNis || !inputPass) return;

  const nisn = inputNis.value.trim();
  const passwordInput = inputPass.value.trim();
  const foundSiswa = state.siswa.find(s => s.nisn === nisn);

  if (!foundSiswa) {
    showToast("NISN tidak ditemukan! Pastikan data siswa sudah diinput oleh Guru/Admin.", "error");
    return;
  }

  const validPassword = foundSiswa.password ? foundSiswa.password : "123456";
  if (passwordInput === validPassword) {
    state.currentUser = { role: 'siswa', data: foundSiswa };
    simpanSesiUser();
    resetKelasGuruOnLogout();
    inputNis.value = '';
    inputPass.value = '';
    updateVisibilitasDanStatistikMurid();
    showToast("Login Berhasil! Selamat datang, " + foundSiswa.nama);
    navigateTo('dashboard');
  } else {
    showToast("Kata sandi salah! Silakan coba lagi.", "error");
  }
}

function doLoginStaf(e) {
  e.preventDefault();
  const inputNipEl = document.getElementById('login-nip');
  const inputPassEl = document.getElementById('login-pass-staf');
  const inputNip = inputNipEl.value.trim();
  const inputPass = inputPassEl.value.trim();

  if (inputNip === 'admin' && inputPass === 'admin123') {
    state.currentUser = { role: 'admin', data: { nama: 'Administrator Sekolah', mapel: null, mapelList: [] } };
    simpanSesiUser();
    kelasAktifGuru = '';
    mapelAktifGuru = '';
    sessionStorage.removeItem('kelasAktifGuru');
    sessionStorage.removeItem('mapelAktifGuru');
    inputNipEl.value = '';
    inputPassEl.value = '';
    updateVisibilitasDanStatistikMurid();
    showToast("Masuk sebagai Admin Utama. Silakan kelola data & pilih kelas/mapel.");
    navigateTo('dashboard');
    return;
  }

  const foundGuru = state.guru.find(g => g.nip === inputNip);
  if (foundGuru) {
    if (foundGuru.password === inputPass) {
      state.currentUser = { role: 'admin', data: foundGuru };
      simpanSesiUser();
      kelasAktifGuru = '';
      sessionStorage.removeItem('kelasAktifGuru');

      const daftarMapelGuru = getMapelDiampuGuru(foundGuru);
      if (daftarMapelGuru.length === 1) {
        mapelAktifGuru = daftarMapelGuru[0];
        sessionStorage.setItem('mapelAktifGuru', mapelAktifGuru);
      } else {
        mapelAktifGuru = '';
        sessionStorage.removeItem('mapelAktifGuru');
      }

      inputNipEl.value = '';
      inputPassEl.value = '';
      updateVisibilitasDanStatistikMurid();
      showToast("Selamat Datang, " + foundGuru.nama + ". Silakan pilih kelas & mata pelajaran.");
      navigateTo('dashboard');
    } else {
      showToast("Password Guru Salah!", "error");
    }
  } else {
    showToast("NIP / Username Guru tidak terdaftar!", "error");
  }
}

function handleAuthAction() {
  if (state.currentUser) {
    state.currentUser = null;
    simpanSesiUser();
    resetKelasGuruOnLogout();
    updateVisibilitasDanStatistikMurid();
    if (document.getElementById('login-nip')) document.getElementById('login-nip').value = '';
    if (document.getElementById('login-pass-staf')) document.getElementById('login-pass-staf').value = '';
    if (document.getElementById('login-nis')) document.getElementById('login-nis').value = '';
    if (document.getElementById('login-pass-siswa')) document.getElementById('login-pass-siswa').value = '';
    showToast("Anda telah keluar");
    navigateTo('login');
  } else {
    navigateTo('login');
  }
}

// =========================================================================
// DASHBOARD, STATISTIK & NOTIFIKASI MURID
// =========================================================================
function updateVisibilitasDanStatistikMurid() {
  const isSiswa = state.currentUser && state.currentUser.role === 'siswa';
  const siswaData = isSiswa ? state.currentUser.data : null;

  const cardHarian = document.getElementById('card-rata-harian');
  const cardTugas = document.getElementById('card-rata-tugas');
  const bannerNotifMurid = document.getElementById('banner-notif-murid');

  if (isSiswa && siswaData) {
    if (cardHarian) cardHarian.classList.remove('hidden');
    if (cardTugas) cardTugas.classList.remove('hidden');
    if (bannerNotifMurid) bannerNotifMurid.classList.remove('hidden');

    const semuaTugas = getDaftarTugas();
    const tugasMuridIni = semuaTugas.filter(t =>
      (t.nisn && t.nisn === siswaData.nisn) ||
      (t.namaSiswa && t.namaSiswa.toLowerCase() === siswaData.nama.toLowerCase())
    );

    const semuaKuis = JSON.parse(localStorage.getItem('ma_riwayat_kuis_murid') || '[]');
    const kuisMuridIni = semuaKuis.filter(k =>
      (k.nisn && k.nisn === siswaData.nisn) ||
      (k.nama && k.nama.toLowerCase() === siswaData.nama.toLowerCase())
    );

    const tugasDinilai = tugasMuridIni.filter(t => t.nilai !== null && t.nilai !== undefined && t.nilai !== '');
    const rataTugas = tugasDinilai.length > 0
      ? (tugasDinilai.reduce((acc, item) => acc + Number(item.nilai), 0) / tugasDinilai.length).toFixed(1)
      : '0.0';

    const rataKuis = kuisMuridIni.length > 0
      ? (kuisMuridIni.reduce((acc, item) => acc + Number(item.skor), 0) / kuisMuridIni.length).toFixed(1)
      : '0.0';

    const elTugas = document.getElementById('stat-rata-tugas');
    const elHarian = document.getElementById('stat-rata-harian');
    if (elTugas) elTugas.textContent = rataTugas;
    if (elHarian) elHarian.textContent = rataKuis;

    renderNotifikasiMurid(siswaData, tugasMuridIni, kuisMuridIni);
  } else {
    if (cardHarian) cardHarian.classList.add('hidden');
    if (cardTugas) cardTugas.classList.add('hidden');
    if (bannerNotifMurid) bannerNotifMurid.classList.add('hidden');

    const boxNotifTugas = document.getElementById('notif-status-tugas-murid');
    const boxNotifKuis = document.getElementById('notif-status-kuis-murid');
    if (boxNotifTugas) boxNotifTugas.classList.add('hidden');
    if (boxNotifKuis) boxNotifKuis.classList.add('hidden');
  }
}

function renderNotifikasiMurid(siswaData, tugasMuridIni, kuisMuridIni) {
  const listDash = document.getElementById('list-notif-murid-dashboard');
  const ringkasanDash = document.getElementById('teks-ringkasan-notif-murid');
  const boxNotifTugas = document.getElementById('notif-status-tugas-murid');
  const pesanNotifTugas = document.getElementById('pesan-notif-tugas-murid');
  const boxNotifKuis = document.getElementById('notif-status-kuis-murid');
  const pesanNotifKuis = document.getElementById('pesan-notif-kuis-murid');

  if (ringkasanDash) {
    ringkasanDash.textContent = `Halo ${siswaData.nama} (${siswaData.kelas}), Anda telah mengumpulkan ${tugasMuridIni.length} tugas dan menyelesaikan ${kuisMuridIni.length} kuis.`;
  }

  if (listDash) {
    let htmlNotif = '';
    tugasMuridIni.slice(0, 2).forEach(t => {
      htmlNotif += `
        <div class="text-[11px] bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
          <span>✅ <strong>Tugas (${t.mapel}):</strong> ${t.isiTugas}</span>
          <span class="text-slate-500 text-[10px]">Dikumpulkan: <strong>${t.waktu || '-'}</strong></span>
        </div>`;
    });
    kuisMuridIni.slice(0, 2).forEach(k => {
      htmlNotif += `
        <div class="text-[11px] bg-white/80 px-3 py-1.5 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-2">
          <span>🏆 <strong>Kuis (${k.mapel || k.topik}):</strong> Nilai ${k.skor}</span>
          <span class="text-slate-500 text-[10px]">Selesai: <strong>${k.tanggalKumpul || '-'}</strong></span>
        </div>`;
    });
    listDash.innerHTML = htmlNotif || '<p class="text-[11px] text-slate-500 italic">Belum ada aktivitas pengumpulan tugas atau kuis.</p>';
  }

  if (boxNotifTugas && pesanNotifTugas) {
    boxNotifTugas.classList.remove('hidden');
    if (tugasMuridIni.length > 0) {
      const terakhir = tugasMuridIni[0];
      pesanNotifTugas.innerHTML = `Anda sudah mengumpulkan <strong>${tugasMuridIni.length} tugas</strong>. Terakhir: <strong>${terakhir.mapel}</strong> pada tanggal <strong>${terakhir.waktu}</strong>.`;
    } else {
      pesanNotifTugas.textContent = 'Anda belum mengumpulkan tugas apa pun. Silakan isi form di bawah untuk mengirim tugas.';
    }
  }

  if (boxNotifKuis && pesanNotifKuis) {
    boxNotifKuis.classList.remove('hidden');
    if (kuisMuridIni.length > 0) {
      const terakhir = kuisMuridIni[0];
      pesanNotifKuis.innerHTML = `Anda sudah mengerjakan <strong>${kuisMuridIni.length} kuis</strong>. Terakhir: <strong>${terakhir.topik}</strong> (Skor: <strong>${terakhir.skor}</strong>) pada tanggal <strong>${terakhir.tanggalKumpul}</strong>.`;
    } else {
      pesanNotifKuis.textContent = 'Anda belum menyelesaikan kuis. Kerjakan soal di bawah lalu klik Selesai.';
    }
  }
}

// =========================================================================
// PEMILIHAN KELAS & MAPEL AKTIF GURU DI DASHBOARD
// =========================================================================
function pilihKelasMengajar(kelas) {
  kelasAktifGuru = kelas;
  if (kelas) {
    sessionStorage.setItem('kelasAktifGuru', kelas);
    ['presensi-kelas', 'nilai-kelas', 'filter-kelas-tugas-guru', 'ai-quiz-kelas'].forEach(id => {
      const el = document.getElementById(id);
      if (el && Array.from(el.options).some(opt => opt.value === kelas)) el.value = kelas;
    });
  } else {
    sessionStorage.removeItem('kelasAktifGuru');
  }
  perbaruiTampilanKelasGuru();
}

function pilihMapelMengajar(mapel) {
  mapelAktifGuru = mapel;
  if (mapel) {
    sessionStorage.setItem('mapelAktifGuru', mapel);
    ['nilai-mapel', 'ai-quiz-mapel'].forEach(id => {
      const el = document.getElementById(id);
      if (el && Array.from(el.options).some(opt => opt.value === mapel)) el.value = mapel;
    });
  } else {
    sessionStorage.removeItem('mapelAktifGuru');
  }
  updateNavbar();
  perbaruiTampilanKelasGuru();
}

function muatOpsiMapelUntukGuruLogin() {
  const selectMapel = document.getElementById('select-mapel-aktif-guru');
  if (!selectMapel || !state.currentUser) return;

  const mapelDiampu = getMapelDiampuGuru(state.currentUser.data);
  const daftarOpsi = mapelDiampu.length > 0
    ? mapelDiampu
    : getDaftarMapel().map(m => formatLabelMapelDenganKelas(m));

  selectMapel.innerHTML = `<option value="">-- Pilih Mata Pelajaran --</option>` +
    daftarOpsi.map(namaMapel => `<option value="${namaMapel}">${namaMapel}</option>`).join('');

  if (mapelAktifGuru && daftarOpsi.includes(mapelAktifGuru)) {
    selectMapel.value = mapelAktifGuru;
  } else if (daftarOpsi.length === 1) {
    mapelAktifGuru = daftarOpsi[0];
    sessionStorage.setItem('mapelAktifGuru', mapelAktifGuru);
    selectMapel.value = mapelAktifGuru;
  } else {
    mapelAktifGuru = '';
    sessionStorage.removeItem('mapelAktifGuru');
    selectMapel.value = '';
  }
}

function perbaruiTampilanKelasGuru() {
  const panelPilihKelas = document.getElementById('panel-pilih-kelas-guru');
  const cardTotalSiswa = document.getElementById('card-total-siswa');
  const cardKehadiran = document.getElementById('card-kehadiran-hari-ini');
  const selectKelas = document.getElementById('select-kelas-aktif-guru');
  const infoText = document.getElementById('info-kelas-terpilih');

  const isGuruOrAdmin = state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.role === 'guru');

  if (!isGuruOrAdmin) {
    if (panelPilihKelas) panelPilihKelas.classList.add('hidden');
    if (cardTotalSiswa) cardTotalSiswa.classList.add('hidden');
    if (cardKehadiran) cardKehadiran.classList.add('hidden');
    return;
  }

  if (panelPilihKelas) panelPilihKelas.classList.remove('hidden');
  if (selectKelas) selectKelas.value = kelasAktifGuru;
  muatOpsiMapelUntukGuruLogin();

  if (!kelasAktifGuru || !mapelAktifGuru) {
    if (cardTotalSiswa) cardTotalSiswa.classList.add('hidden');
    if (cardKehadiran) cardKehadiran.classList.add('hidden');
    if (infoText) {
      if (!kelasAktifGuru && !mapelAktifGuru) {
        infoText.textContent = 'Silakan pilih kelas dan mata pelajaran terlebih dahulu untuk melihat Total Siswa & Kehadiran Hari Ini.';
      } else if (!kelasAktifGuru) {
        infoText.innerHTML = `Mapel terpilih: <strong>${mapelAktifGuru}</strong>. Silakan pilih <strong>Kelas</strong> terlebih dahulu.`;
      } else {
        infoText.innerHTML = `Kelas terpilih: <strong>${kelasAktifGuru}</strong>. Silakan pilih <strong>Mata Pelajaran</strong> terlebih dahulu.`;
      }
    }
    return;
  }

  if (cardTotalSiswa) cardTotalSiswa.classList.remove('hidden');
  if (cardKehadiran) cardKehadiran.classList.remove('hidden');
  if (infoText) {
    infoText.innerHTML = `Aktif mengajar <strong>${mapelAktifGuru}</strong> di <strong>Kelas ${kelasAktifGuru}</strong>.`;
  }

  const siswaDiKelas = state.siswa.filter(s => s.kelas === kelasAktifGuru);
  const totalSiswaKelas = siswaDiKelas.length;

  const labelStatSiswa = document.getElementById('label-kelas-stat-siswa');
  const statTotal = document.getElementById('stat-total-siswa');
  if (labelStatSiswa) labelStatSiswa.textContent = `(${kelasAktifGuru})`;
  if (statTotal) statTotal.innerText = totalSiswaKelas;

  const today = new Date().toISOString().split('T')[0];
  const keyAbsenHariIni = `${today}_${kelasAktifGuru}`;
  const absenKelasHariIni = state.presensi[keyAbsenHariIni] || {};

  let jumlahHadir = 0;
  siswaDiKelas.forEach(s => {
    if (absenKelasHariIni[s.id] === 'Hadir') jumlahHadir++;
  });

  const persenHadir = totalSiswaKelas > 0 ? Math.round((jumlahHadir / totalSiswaKelas) * 100) : 0;

  const labelStatAbsen = document.getElementById('label-kelas-stat-absen');
  const statKehadiran = document.getElementById('stat-kehadiran');
  if (labelStatAbsen) labelStatAbsen.textContent = `(${kelasAktifGuru})`;
  if (statKehadiran) statKehadiran.innerText = `${persenHadir}%`;
}

function resetKelasGuruOnLogout() {
  kelasAktifGuru = '';
  mapelAktifGuru = '';
  sessionStorage.removeItem('kelasAktifGuru');
  sessionStorage.removeItem('mapelAktifGuru');
  perbaruiTampilanKelasGuru();
}

function renderDashboard() {
  terapkanLatarBelakangDashboard();
  perbaruiTampilanKelasGuru();
  updateVisibilitasDanStatistikMurid();
  renderPengumumanMadrasah();
}

// =========================================================================
// SINKRONISASI DROPDOWN MATA PELAJARAN DI SELURUH HALAMAN (TANPA FALLBACK BAWAAN)
// =========================================================================
function sinkronisasiDropdownMapel() {
  const daftarMapel = getDaftarMapel();
  const isSiswa = state.currentUser && state.currentUser.role === 'siswa';
  const kelasSiswa = isSiswa ? state.currentUser.data.kelas : '';

  const optionsHtml = daftarMapel.length > 0
    ? daftarMapel.map(m => {
        const label = formatLabelMapelDenganKelas(m);
        return `<option value="${label}">${label}</option>`;
      }).join('')
    : `<option value="">-- Belum ada mata pelajaran --</option>`;

  const selectTugasSiswa = document.getElementById('tugas-pilih-mapel');
  if (selectTugasSiswa) {
    const valPrev = selectTugasSiswa.value;
    const mapelUntukSiswa = isSiswa
      ? daftarMapel.filter(m => isMapelBerlakuUntukKelas(m, kelasSiswa))
      : daftarMapel;

    selectTugasSiswa.innerHTML = mapelUntukSiswa.length > 0
      ? mapelUntukSiswa.map(m => {
          const label = formatLabelMapelDenganKelas(m);
          return `<option value="${label}">${label}</option>`;
        }).join('')
      : `<option value="">-- Belum ada mata pelajaran --</option>`;

    if (valPrev && Array.from(selectTugasSiswa.options).some(o => o.value === valPrev)) {
      selectTugasSiswa.value = valPrev;
    }
  }

  const selectQuizMapel = document.getElementById('ai-quiz-mapel');
  if (selectQuizMapel) {
    const valPrev = selectQuizMapel.value;
    const kelasQuiz = document.getElementById('ai-quiz-kelas')?.value || kelasAktifGuru;
    const mapelGuru = state.currentUser ? getMapelDiampuGuru(state.currentUser.data) : [];

    let opsiQuiz = daftarMapel.map(m => formatLabelMapelDenganKelas(m));
    if (mapelGuru.length > 0) {
      opsiQuiz = mapelGuru;
    } else if (kelasQuiz) {
      opsiQuiz = daftarMapel.filter(m => isMapelBerlakuUntukKelas(m, kelasQuiz)).map(m => formatLabelMapelDenganKelas(m));
    }

    selectQuizMapel.innerHTML = opsiQuiz.length > 0
      ? opsiQuiz.map(lbl => `<option value="${lbl}">${lbl}</option>`).join('')
      : `<option value="">-- Belum ada mata pelajaran --</option>`;

    if (valPrev && opsiQuiz.includes(valPrev)) selectQuizMapel.value = valPrev;
    else if (mapelAktifGuru && opsiQuiz.includes(mapelAktifGuru)) selectQuizMapel.value = mapelAktifGuru;
  }

  document.querySelectorAll('.select-mapel-materi').forEach(sel => {
    const valLama = sel.value;
    sel.innerHTML = optionsHtml;
    if (valLama && Array.from(sel.options).some(o => o.value === valLama)) sel.value = valLama;
  });

  document.querySelectorAll('.filter-mapel-materi, #filter-mapel-tugas-guru').forEach(sel => {
    const valLama = sel.value || 'SEMUA';
    sel.innerHTML = `<option value="SEMUA">Semua Mata Pelajaran</option>` +
      (daftarMapel.length > 0
        ? daftarMapel.map(m => {
            const label = formatLabelMapelDenganKelas(m);
            return `<option value="${label}">${label}</option>`;
          }).join('')
        : '');
    if (Array.from(sel.options).some(o => o.value === valLama)) sel.value = valLama;
  });
}

// =========================================================================
// MANAJEMEN MATA PELAJARAN (KOSONG DI AWAL, DENGAN PILIHAN KELAS)
// =========================================================================
function getDaftarMapel() {
  const saved = localStorage.getItem('ma_daftar_mapel');
  if (saved !== null) {
    return JSON.parse(saved);
  }
  return Array.isArray(state.mapel) ? state.mapel : [];
}

function toggleSemuaKelasMapel(cbSemua) {
  document.querySelectorAll('.cb-kelas-item').forEach(cb => {
    if (cbSemua.checked) {
      cb.checked = false;
      cb.disabled = true;
    } else {
      cb.disabled = false;
    }
  });
}

function renderMapelCards() {
  const container = document.getElementById('mapel-cards-container');
  if (!container) return;
  const list = getDaftarMapel();
  if (list.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400">Belum ada mata pelajaran.</p>`;
    return;
  }
  container.innerHTML = list.map(m => {
    const labelKelas = Array.isArray(m.kelasList) && m.kelasList.length > 0 ? m.kelasList.join(', ') : (m.kelas || 'Semua Kelas');
    return `
      <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
        <div class="flex flex-wrap gap-1.5">
          <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">${m.kategori || 'Kurikulum'}</span>
          <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Kelas: ${labelKelas}</span>
        </div>
        <h3 class="font-bold text-sm text-slate-800">${m.nama}</h3>
        <p class="text-[11px] font-semibold text-emerald-700 pt-2 border-t border-slate-100">Guru: ${m.guru}</p>
      </div>
    `;
  }).join('');
}

function renderDaftarMapel() {
  const container = document.getElementById('container-daftar-mapel');
  const panelTambah = document.getElementById('panel-tambah-mapel');
  const badgeTotal = document.getElementById('total-badge-mapel');
  if (!container) return;

  const isGuru = isAkunGuruAtauAdmin();
  if (panelTambah) {
    panelTambah.classList.toggle('hidden', !isGuru);
  }

  const daftarMapel = getDaftarMapel();
  if (badgeTotal) badgeTotal.textContent = `${daftarMapel.length} Mapel`;

  if (daftarMapel.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
        Belum ada data mata pelajaran. ${isGuru ? 'Gunakan form di atas untuk menambahkan mata pelajaran baru.' : 'Silakan tunggu guru/admin menambahkan mata pelajaran.'}
      </div>`;
    return;
  }

  container.innerHTML = daftarMapel.map(mapel => {
    const labelKelas = Array.isArray(mapel.kelasList) && mapel.kelasList.length > 0
      ? mapel.kelasList.join(', ')
      : (mapel.kelas || 'Semua Kelas');

    return `
      <div class="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 shadow-sm flex flex-col justify-between space-y-3 transition">
        <div class="space-y-1.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap gap-1">
              <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">${mapel.kategori}</span>
              <span class="px-2.5 py-0.5 bg-sky-100 text-sky-800 rounded-md text-[10px] font-bold">Kelas: ${labelKelas}</span>
            </div>
            ${isGuru ? `
              <button onclick="hapusMataPelajaran(${mapel.id})" title="Hapus Mata Pelajaran" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition shrink-0">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </div>
          <h3 class="font-bold text-sm text-slate-800 pt-1">${mapel.nama}</h3>
        </div>
        <div class="pt-2 border-t border-slate-100 flex items-center space-x-2 text-[11px] text-slate-500">
          <i data-lucide="user" class="w-3.5 h-3.5 text-emerald-600"></i>
          <span>${mapel.guru}</span>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function tambahMataPelajaran() {
  const inputNama = document.getElementById('input-nama-mapel');
  const inputKategori = document.getElementById('input-kategori-mapel');
  const inputGuru = document.getElementById('input-guru-mapel');

  const nama = inputNama.value.trim();
  const kategori = inputKategori.value;
  const guru = inputGuru.value.trim() || state.currentUser?.data?.nama || 'Pengajar';

  const checkedKelas = Array.from(document.querySelectorAll('input[name="mapel-kelas-checkbox"]:checked')).map(cb => cb.value);
  const kelasList = checkedKelas.length > 0 ? checkedKelas : ['Semua Kelas'];

  if (!nama) {
    alert('Nama mata pelajaran tidak boleh kosong!');
    inputNama.focus();
    return;
  }

  const daftarMapel = getDaftarMapel();
  daftarMapel.push({
    id: Date.now(),
    nama: nama,
    kategori: kategori,
    guru: guru,
    kelas: kelasList.join(', '),
    kelasList: kelasList
  });
  localStorage.setItem('ma_daftar_mapel', JSON.stringify(daftarMapel));
  saveState();

  inputNama.value = '';
  inputGuru.value = '';
  document.querySelectorAll('input[name="mapel-kelas-checkbox"]').forEach(cb => {
    cb.checked = false;
    cb.disabled = false;
  });

  renderDaftarMapel();
  renderMapelCards();
  sinkronisasiDropdownMapel();
  renderCheckboxMapelGuru();
  muatOpsiMapelUntukGuruLogin();
  showToast(`Mata pelajaran "${nama}" (${kelasList.join(', ')}) berhasil ditambahkan!`);
}

function hapusMataPelajaran(idMapel) {
  const daftarMapel = getDaftarMapel();
  const target = daftarMapel.find(m => m.id === idMapel);
  if (!target) return;

  if (!confirm(`Apakah Anda yakin ingin menghapus mata pelajaran "${target.nama}"?`)) return;

  const sisaMapel = daftarMapel.filter(m => m.id !== idMapel);
  localStorage.setItem('ma_daftar_mapel', JSON.stringify(sisaMapel));
  saveState();

  renderDaftarMapel();
  renderMapelCards();
  sinkronisasiDropdownMapel();
  renderCheckboxMapelGuru();
  muatOpsiMapelUntukGuruLogin();
  showToast(`Mata pelajaran "${target.nama}" dihapus.`);
}

// =========================================================================
// SISTEM KUIS AI OTOMATIS (ACAK SOAL & PILIHAN PG SAAT DIULANG)
// =========================================================================
let intervalTimerKuis = null;
let soalKuisSesiAktif = [];

function acakArray(arr) {
  const salinan = [...arr];
  for (let i = salinan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [salinan[i], salinan[j]] = [salinan[j], salinan[i]];
  }
  return salinan;
}

function acakSoalDanPilihan(daftarSoal) {
  const soalTeracak = acakArray(daftarSoal);

  return soalTeracak.map((item) => {
    const daftarOpsi = item.opsi || item.options || item.pilihan || [];
    let teksJawabanBenar = "";
    const kunciLama = item.jawaban ?? item.answer ?? item.kunci;

    if (typeof kunciLama === "number") {
      teksJawabanBenar = daftarOpsi[kunciLama];
    } else if (typeof kunciLama === "string") {
      const idxHuruf = ["A", "B", "C", "D", "E"].indexOf(kunciLama.toUpperCase());
      teksJawabanBenar = idxHuruf !== -1 && daftarOpsi[idxHuruf] ? daftarOpsi[idxHuruf] : kunciLama;
    }

    const opsiTeracak = acakArray(daftarOpsi);
    const indexKunciBaru = opsiTeracak.indexOf(teksJawabanBenar);

    return {
      ...item,
      pertanyaan: item.pertanyaan || item.question || item.soal || "",
      opsi: opsiTeracak,
      jawaban: indexKunciBaru !== -1 ? indexKunciBaru : 0,
      teksKunciBenar: teksJawabanBenar
    };
  });
}

function getSoalUntukUser(dataKuis, userId, paksaAcakUlang = false) {
  if (!dataKuis || !Array.isArray(dataKuis.soal)) return [];
  if (!dataKuis.pengerjaanPerUser) dataKuis.pengerjaanPerUser = {};
  if (!dataKuis.pengerjaanPerUser[userId]) {
    dataKuis.pengerjaanPerUser[userId] = {
      sudahSelesaiManual: false,
      skorTersimpan: null,
      jawabanTersimpan: [],
      soalTeracak: null
    };
  }

  const statusUser = dataKuis.pengerjaanPerUser[userId];
  if (paksaAcakUlang || !Array.isArray(statusUser.soalTeracak) || statusUser.soalTeracak.length !== dataKuis.soal.length) {
    statusUser.soalTeracak = acakSoalDanPilihan(dataKuis.soal);
  }
  soalKuisSesiAktif = statusUser.soalTeracak;
  return statusUser.soalTeracak;
}

function getSemuaKuisPerKelas() {
  return JSON.parse(localStorage.getItem('ma_ai_quiz_by_class') || '{}');
}

function simpanSemuaKuisPerKelas(objKuis) {
  localStorage.setItem('ma_ai_quiz_by_class', JSON.stringify(objKuis));
  state.kuis = Object.values(objKuis);
}

function getKelasTargetKuisAktif() {
  if (state.currentUser && state.currentUser.role === 'siswa') {
    return state.currentUser.data.kelas || '';
  }
  const selectKelasKuis = document.getElementById('ai-quiz-kelas');
  if (selectKelasKuis && selectKelasKuis.value) {
    return selectKelasKuis.value;
  }
  if (kelasAktifGuru) {
    if (selectKelasKuis && Array.from(selectKelasKuis.options).some(opt => opt.value === kelasAktifGuru)) {
      selectKelasKuis.value = kelasAktifGuru;
    }
    return kelasAktifGuru;
  }
  return '';
}

function getIdPengerjaKuis() {
  if (state.currentUser && state.currentUser.role === 'siswa') {
    return `SISWA_${state.currentUser.data.nisn}`;
  }
  if (isAkunGuruAtauAdmin()) {
    return `GURU_${state.currentUser?.data?.nip || 'ADMIN'}`;
  }
  return 'GUEST';
}

function catatRiwayatKuisMurid(topikKuis, skorFinal, kelasKuis, mapelKuis = '') {
  const isSiswa = state.currentUser && state.currentUser.role === 'siswa';
  const siswaData = isSiswa ? state.currentUser.data : null;

  const semuaKuis = getSemuaKuisPerKelas();
  const dataKuis = kelasKuis ? semuaKuis[kelasKuis] : null;
  const namaMapel = mapelKuis || (dataKuis && dataKuis.mapel) || mapelAktifGuru || '';

  const riwayatPerMurid = JSON.parse(localStorage.getItem('ma_riwayat_kuis_murid') || '[]');
  riwayatPerMurid.unshift({
    id: Date.now(),
    nisn: siswaData ? siswaData.nisn : 'GUEST',
    nama: siswaData ? siswaData.nama : 'Siswa Tamu',
    kelas: siswaData ? siswaData.kelas : (kelasKuis || '-'),
    mapel: namaMapel,
    topik: topikKuis,
    skor: skorFinal,
    tanggalKumpul: formatTanggalSekarang()
  });
  localStorage.setItem('ma_riwayat_kuis_murid', JSON.stringify(riwayatPerMurid));

  if (isSiswa && siswaData && namaMapel) {
    sinkronisasiNilaiOtomatis(false, siswaData.kelas, namaMapel);
  }

  updateVisibilitasDanStatistikMurid();
}

function cekHakAksesGuruKuis() {
  const panelGuru = document.getElementById('panel-ai-guru');
  if (!panelGuru) return;

  if (isAkunGuruAtauAdmin()) {
    panelGuru.classList.remove('hidden');
    const apiKeyInput = document.getElementById('gemini-api-key');
    const savedKey = localStorage.getItem('maplus_gemini_key');
    if (apiKeyInput && savedKey && !apiKeyInput.value) {
      apiKeyInput.value = savedKey;
    }
    const selectKelasKuis = document.getElementById('ai-quiz-kelas');
    if (selectKelasKuis && !selectKelasKuis.value && kelasAktifGuru) {
      selectKelasKuis.value = kelasAktifGuru;
    }
    const selectMapelKuis = document.getElementById('ai-quiz-mapel');
    if (selectMapelKuis && mapelAktifGuru && Array.from(selectMapelKuis.options).some(o => o.value === mapelAktifGuru)) {
      selectMapelKuis.value = mapelAktifGuru;
    }
  } else {
    panelGuru.classList.add('hidden');
  }
}

async function generateSoalAI() {
  const kelasSelect = document.getElementById('ai-quiz-kelas');
  const mapelSelect = document.getElementById('ai-quiz-mapel');
  const topikInput = document.getElementById('ai-quiz-topik');
  const jumlahSelect = document.getElementById('ai-quiz-jumlah');
  const durasiSelect = document.getElementById('ai-quiz-durasi');
  const apiKeyInput = document.getElementById('gemini-api-key');
  const btnGen = document.getElementById('btn-generate-ai');

  const kelasTarget = kelasSelect ? kelasSelect.value.trim() : '';
  const mapelTarget = mapelSelect ? mapelSelect.value.trim() : (mapelAktifGuru || '');
  const topik = topikInput ? topikInput.value.trim() : '';
  const jumlah = parseInt(jumlahSelect?.value) || 5;
  const durasiMenit = parseInt(durasiSelect?.value) || 5;

  if (!kelasTarget) {
    alert('Silakan pilih KELAS tujuan kuis terlebih dahulu!');
    if (kelasSelect) kelasSelect.focus();
    return;
  }

  if (!mapelTarget) {
    alert('Silakan pilih atau tambahkan Mata Pelajaran terlebih dahulu!');
    return;
  }

  if (apiKeyInput && apiKeyInput.value.trim()) {
    localStorage.setItem('maplus_gemini_key', apiKeyInput.value.trim());
  }
  const apiKey = (apiKeyInput && apiKeyInput.value.trim()) || localStorage.getItem('maplus_gemini_key') || '';

  if (!topik) {
    alert('Silakan masukkan topik atau materi perintah untuk AI terlebih dahulu!');
    if (topikInput) topikInput.focus();
    return;
  }

  const teksAsli = btnGen.innerHTML;
  btnGen.disabled = true;
  btnGen.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>AI Menyusun Soal...</span>`;
  if (window.lucide) lucide.createIcons();

  const randomSeed = Math.floor(Math.random() * 1000000);
  const promptAI = `Buatkan ${jumlah} soal pilihan ganda yang unik, bervariasi, dan mendalam dalam Bahasa Indonesia untuk siswa Madrasah Aliyah (SMA) mata pelajaran "${mapelTarget}" tentang materi: "${topik}". (Kode variasi unik: ${randomSeed}).
Setiap soal harus memiliki pertanyaan spesifik tentang materi tersebut, 4 pilihan jawaban dalam array "opsi", dan index jawaban benar (0, 1, 2, atau 3) yang bervariasi dalam key "jawaban".
Balas HANYA dengan JSON array valid tanpa markdown atau teks tambahan:
[{"pertanyaan":"...","opsi":["Pilihan A","Pilihan B","Pilihan C","Pilihan D"],"jawaban":0}]`;

  let daftarSoalBaru = [];
  let sumberAI = 'AI Online';

  try {
    if (apiKey) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptAI }] }],
          generationConfig: { temperature: 0.95 }
        })
      });

      if (!response.ok) throw new Error('Gemini API Error');
      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      daftarSoalBaru = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      sumberAI = 'Gemini AI';
    } else {
      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'Kamu adalah guru pembuat soal ujian sekolah di Indonesia. Jawab HANYA dengan JSON array valid tanpa teks pembuka/penutup.' },
            { role: 'user', content: promptAI }
          ],
          seed: randomSeed,
          model: 'openai'
        })
      });

      if (!response.ok) throw new Error('AI Server sibuk');
      const rawText = await response.text();
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Format JSON AI tidak terbaca');
      daftarSoalBaru = JSON.parse(jsonMatch[0]);
      sumberAI = 'AI Otomatis';
    }

    daftarSoalBaru = daftarSoalBaru
      .filter(s => s && s.pertanyaan && Array.isArray(s.opsi) && s.opsi.length >= 4)
      .slice(0, jumlah)
      .map(s => ({
        pertanyaan: s.pertanyaan,
        opsi: s.opsi.slice(0, 4),
        jawaban: (typeof s.jawaban === 'number' && s.jawaban >= 0 && s.jawaban <= 3) ? s.jawaban : 0
      }));

    if (daftarSoalBaru.length === 0) throw new Error('Soal kosong');

  } catch (err) {
    console.warn('AI online gagal, menggunakan bank soal cadangan teracak:', err.message);
    daftarSoalBaru = buatSoalPintarOtomatis(topik, jumlah);
    sumberAI = 'Mode Offline Teracak';
  } finally {
    hentikanSemuaTimerKuis();

    const waktuSelesaiAbsolut = Date.now() + (durasiMenit * 60 * 1000);
    const semuaKuis = getSemuaKuisPerKelas();

    semuaKuis[kelasTarget] = {
      kelas: kelasTarget,
      mapel: mapelTarget,
      topik: topik,
      durasiMenit: durasiMenit,
      endTimeTimestamp: waktuSelesaiAbsolut,
      tanggal: new Date().toLocaleDateString('id-ID'),
      soal: daftarSoalBaru,
      waktuHabis: false,
      expiredAt: null,
      pengerjaanPerUser: {}
    };

    simpanSemuaKuisPerKelas(semuaKuis);
    saveState();
    renderKuisAktif();

    btnGen.disabled = false;
    btnGen.innerHTML = teksAsli;
    if (window.lucide) lucide.createIcons();

    showToast(`Berhasil (${sumberAI})! ${daftarSoalBaru.length} soal ${mapelTarget} "${topik}" dikirim khusus untuk Kelas ${kelasTarget}.`);
  }
}

function buatSoalPintarOtomatis(topik, jumlah) {
  const bankTemplate = [
    {
      pertanyaan: `Apa pengertian utama dan konsep dasar yang dipelajari dalam materi "${topik}"?`,
      opsi: [
        `Pemahaman sistematis mengenai prinsip, struktur, dan penerapan ${topik}`,
        `Pengabaian terhadap kaidah dasar dalam kajian ${topik}`,
        `Metode acak yang tidak berkaitan dengan ${topik}`,
        `Proses penghapusan seluruh konsep ${topik}`
      ],
      jawaban: 0
    },
    {
      pertanyaan: `Manakah pernyataan yang paling tepat mengenai fungsi atau manfaat mempelajari "${topik}"?`,
      opsi: [
        `Membatasi kemampuan analisis dalam pemecahan masalah`,
        `Meningkatkan ketepatan analisis, pemahaman konsep, dan penerapan praktis terkait ${topik}`,
        `Hanya digunakan sebagai hafalan tanpa implementasi nyata`,
        `Tidak memiliki hubungan dengan perkembangan ilmu pengetahuan`
      ],
      jawaban: 1
    },
    {
      pertanyaan: `Dalam penerapan materi "${topik}", langkah awal yang harus diperhatikan agar hasilnya akurat adalah...`,
      opsi: [
        `Langsung menyimpulkan tanpa memeriksa data awal`,
        `Mengabaikan aturan baku yang berlaku pada ${topik}`,
        `Mengidentifikasi komponen utama serta memahami kaidah dasar ${topik}`,
        `Mengubah seluruh variabel tanpa dasar teori`
      ],
      jawaban: 2
    },
    {
      pertanyaan: `Faktor utama yang sering menyebabkan kekeliruan saat menganalisis persoalan "${topik}" adalah...`,
      opsi: [
        `Ketelitian dalam mengikuti prosedur yang ditetapkan`,
        `Kesesuaian antara teori dan praktik lapangan`,
        `Evaluasi berkala terhadap setiap tahapan`,
        `Kurangnya pemahaman terhadap konsep fundamental ${topik}`
      ],
      jawaban: 3
    },
    {
      pertanyaan: `Kesimpulan yang benar mengenai peran penting "${topik}" dalam pembelajaran di madrasah adalah...`,
      opsi: [
        `Membekali peserta didik dengan landasan teori dan keterampilan aplikatif yang terukur`,
        `Menjadi materi tambahan yang tidak perlu dievaluasi`,
        `Menggantikan seluruh mata pelajaran lainnya`,
        `Hanya berlaku pada kondisi tertentu tanpa dasar ilmiah`
      ],
      jawaban: 0
    }
  ];

  return acakSoalDanPilihan(bankTemplate).slice(0, jumlah);
}

function hentikanSemuaTimerKuis() {
  if (intervalTimerKuis) {
    clearInterval(intervalTimerKuis);
    intervalTimerKuis = null;
  }
}

function simpanDraftJawabanSementara() {
  const kelasTarget = getKelasTargetKuisAktif();
  if (!kelasTarget) return;

  const semuaKuis = getSemuaKuisPerKelas();
  const dataKuis = semuaKuis[kelasTarget];
  if (!dataKuis || dataKuis.waktuHabis) return;

  const userId = getIdPengerjaKuis();
  const daftarSoalUser = getSoalUntukUser(dataKuis, userId, false);

  const draft = [];
  daftarSoalUser.forEach((_, idx) => {
    const terpilih = document.querySelector(`input[name="jawaban_soal_${idx}"]:checked`);
    draft.push(terpilih ? parseInt(terpilih.value, 10) : -1);
  });

  dataKuis.pengerjaanPerUser[userId].jawabanTersimpan = draft;
  simpanSemuaKuisPerKelas(semuaKuis);
}

function mulaiPemantauTimerGlobal() {
  hentikanSemuaTimerKuis();

  const cekStatusWaktu = () => {
    const semuaKuis = getSemuaKuisPerKelas();
    const daftarKelas = Object.keys(semuaKuis);

    if (daftarKelas.length === 0) {
      hentikanSemuaTimerKuis();
      return;
    }

    let adaPerubahan = false;
    const sekarang = Date.now();

    daftarKelas.forEach(kls => {
      const kuisKelas = semuaKuis[kls];
      if (!kuisKelas) return;

      if (kuisKelas.waktuHabis && kuisKelas.expiredAt) {
        if (sekarang >= kuisKelas.expiredAt) {
          delete semuaKuis[kls];
          adaPerubahan = true;
        }
        return;
      }

      if (!kuisKelas.endTimeTimestamp) {
        kuisKelas.endTimeTimestamp = sekarang + ((kuisKelas.durasiMenit || 5) * 60 * 1000);
        adaPerubahan = true;
      }

      if (sekarang >= kuisKelas.endTimeTimestamp) {
        const userId = getIdPengerjaKuis();
        const daftarSoalUser = getSoalUntukUser(kuisKelas, userId, false);
        const dataUser = kuisKelas.pengerjaanPerUser[userId];

        const totalSoal = daftarSoalUser.length;
        const jawabanAkhir = dataUser.jawabanTersimpan || [];
        let jumlahBenar = 0;

        daftarSoalUser.forEach((item, idx) => {
          const isKelasSedangDibuka = getKelasTargetKuisAktif() === kls;
          const radioDom = isKelasSedangDibuka ? document.querySelector(`input[name="jawaban_soal_${idx}"]:checked`) : null;
          const jwb = radioDom ? parseInt(radioDom.value, 10) : (jawabanAkhir[idx] !== undefined ? jawabanAkhir[idx] : -1);
          jawabanAkhir[idx] = jwb;
          if (jwb === parseInt(item.jawaban, 10)) jumlahBenar++;
        });

        const skorFinal = Math.round((jumlahBenar / totalSoal) * 100);
        dataUser.jawabanTersimpan = jawabanAkhir;
        dataUser.skorTersimpan = skorFinal;
        kuisKelas.pengerjaanPerUser[userId] = dataUser;
        kuisKelas.waktuHabis = true;
        kuisKelas.expiredAt = sekarang + (3 * 60 * 1000);
        adaPerubahan = true;

        if (state.currentUser && state.currentUser.role === 'siswa' && state.currentUser.data.kelas === kls && !dataUser.sudahSelesaiManual) {
          catatRiwayatKuisMurid(kuisKelas.topik, skorFinal, kls, kuisKelas.mapel);
        }

        const viewKuis = document.getElementById('view-kuis');
        if (viewKuis && !viewKuis.classList.contains('hidden') && getKelasTargetKuisAktif() === kls) {
          alert(`Waktu pengerjaan kuis Kelas ${kls} telah habis! Kuis dikunci dan akan menghilang otomatis dalam 3 menit.`);
        }
      }
    });

    if (adaPerubahan) {
      simpanSemuaKuisPerKelas(semuaKuis);
      const viewKuis = document.getElementById('view-kuis');
      if (viewKuis && !viewKuis.classList.contains('hidden')) {
        renderKuisAktif();
      }
      return;
    }

    const kelasAktif = getKelasTargetKuisAktif();
    const kuisAktif = kelasAktif ? semuaKuis[kelasAktif] : null;
    const boxTimer = document.getElementById('box-timer-kuis');
    const tampilanTimer = document.getElementById('tampilan-timer-kuis');

    if (!kuisAktif) {
      if (boxTimer) boxTimer.classList.add('hidden');
      return;
    }

    if (kuisAktif.waktuHabis && kuisAktif.expiredAt) {
      const sisaJedaMs = kuisAktif.expiredAt - sekarang;
      const totalDetikJeda = Math.max(0, Math.ceil(sisaJedaMs / 1000));
      const mnt = Math.floor(totalDetikJeda / 60);
      const dtk = totalDetikJeda % 60;
      const countdownEl = document.getElementById('countdown-hapus-kuis');
      if (countdownEl) {
        countdownEl.textContent = `${String(mnt).padStart(2, '0')}:${String(dtk).padStart(2, '0')}`;
      }
      return;
    }

    const sisaMs = kuisAktif.endTimeTimestamp - sekarang;
    if (boxTimer && tampilanTimer && sisaMs > 0) {
      boxTimer.classList.remove('hidden');
      const totalDetik = Math.ceil(sisaMs / 1000);
      const menit = Math.floor(totalDetik / 60);
      const detik = totalDetik % 60;
      tampilanTimer.textContent = `${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')}`;

      if (totalDetik <= 30) {
        tampilanTimer.className = 'font-mono text-lg font-extrabold text-red-400 animate-pulse';
      } else {
        tampilanTimer.className = 'font-mono text-lg font-extrabold text-amber-400';
      }
    }
  };

  cekStatusWaktu();
  intervalTimerKuis = setInterval(cekStatusWaktu, 1000);
}

function renderSoalDariSesiAcak(dataKuis, daftarSoalUser, statusUser) {
  const container = document.getElementById('container-soal-kuis');
  if (!container) return;

  const hurufOpsi = ['A', 'B', 'C', 'D', 'E'];
  const draftJawaban = (statusUser && statusUser.jawabanTersimpan) || [];

  const bannerPeringatan = `
    <div id="banner-waktu-habis" class="${dataKuis.waktuHabis ? '' : 'hidden'} p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
      <div class="flex items-start space-x-3">
        <i data-lucide="lock" class="w-5 h-5 text-red-600 shrink-0 mt-0.5"></i>
        <div class="text-xs space-y-0.5">
          <p class="font-bold text-red-900">Waktu Pengerjaan Telah Habis — Kuis Dikunci</p>
          <p>Anda <strong>tidak dapat mengulangi kuis ini</strong> karena batas waktu pengerjaan sudah habis.</p>
        </div>
      </div>
      <div class="px-3 py-1.5 rounded-xl bg-red-600 text-white text-[11px] font-bold shrink-0 text-center">
        Hilang otomatis dalam: <span id="countdown-hapus-kuis" class="font-mono">03:00</span>
      </div>
    </div>
  `;

  container.innerHTML = bannerPeringatan + daftarSoalUser.map((item, idx) => `
    <div id="card-soal-${idx}" class="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 transition">
      <div class="flex items-start space-x-2.5">
        <span class="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold shrink-0">${idx + 1}</span>
        <p class="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">${item.pertanyaan}</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        ${(item.opsi || []).map((teksOpsi, optIdx) => {
          const isChecked = draftJawaban[idx] === optIdx ? 'checked' : '';
          return `
          <label id="label-soal-${idx}-opt-${optIdx}" class="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 hover:bg-purple-50/60 cursor-pointer text-xs text-slate-700 transition">
            <input type="radio" name="jawaban_soal_${idx}" value="${optIdx}" ${isChecked} onchange="simpanDraftJawabanSementara()" class="accent-purple-600 w-4 h-4 shrink-0">
            <span><strong class="text-slate-900">${hurufOpsi[optIdx]}.</strong> ${teksOpsi}</span>
          </label>`;
        }).join('')}
      </div>
      <div id="feedback-soal-${idx}" class="hidden text-[11px] font-semibold pt-1"></div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function renderKuisAktif() {
  cekHakAksesGuruKuis();

  const container = document.getElementById('container-soal-kuis');
  const footerAksi = document.getElementById('footer-aksi-kuis');
  const judulEl = document.getElementById('judul-kuis-aktif');
  const subjudulEl = document.getElementById('subjudul-kuis-aktif');
  const boxSkor = document.getElementById('box-skor-kuis');
  const boxTimer = document.getElementById('box-timer-kuis');

  if (!container) return;

  if (boxSkor) boxSkor.classList.add('hidden');
  const isGuru = isAkunGuruAtauAdmin();
  const kelasTarget = getKelasTargetKuisAktif();

  if (!state.currentUser) {
    if (boxTimer) boxTimer.classList.add('hidden');
    if (judulEl) judulEl.textContent = 'Kuis Pembelajaran Interaktif';
    if (subjudulEl) subjudulEl.textContent = 'Silakan masuk menggunakan akun Siswa atau Guru.';
    container.innerHTML = `
      <div class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
        Silakan <strong>Masuk (Login)</strong> terlebih dahulu untuk melihat dan mengerjakan kuis sesuai kelas Anda.
      </div>`;
    if (footerAksi) footerAksi.classList.add('hidden');
    return;
  }

  if (isGuru && !kelasTarget) {
    if (boxTimer) boxTimer.classList.add('hidden');
    if (judulEl) judulEl.textContent = 'Kuis Pembelajaran Interaktif';
    if (subjudulEl) subjudulEl.textContent = 'Pilih kelas tujuan terlebih dahulu untuk membuat atau melihat kuis.';
    container.innerHTML = `
      <div class="p-8 text-center bg-purple-50/60 rounded-2xl border border-dashed border-purple-300 text-xs text-purple-800">
        Silakan pilih <strong>Kelas Tujuan Kuis</strong> pada panel di atas agar soal tidak bertabrakan antar kelas.
      </div>`;
    if (footerAksi) footerAksi.classList.add('hidden');
    return;
  }

  const semuaKuis = getSemuaKuisPerKelas();
  const dataKuis = semuaKuis[kelasTarget];

  if (!dataKuis) {
    if (boxTimer) boxTimer.classList.add('hidden');
    if (judulEl) judulEl.textContent = `Kuis Kelas ${kelasTarget}`;
    if (subjudulEl) subjudulEl.textContent = `Belum ada kuis aktif untuk Kelas ${kelasTarget}.`;
    container.innerHTML = `
      <div class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
        Belum ada soal kuis aktif untuk <strong>Kelas ${kelasTarget}</strong>. ${isGuru ? 'Silakan buat soal kuis baru di panel atas.' : 'Silakan tunggu guru membuat soal kuis untuk kelas Anda.'}
      </div>`;
    if (footerAksi) footerAksi.classList.add('hidden');
    return;
  }

  if (dataKuis.waktuHabis && dataKuis.expiredAt && Date.now() >= dataKuis.expiredAt) {
    delete semuaKuis[kelasTarget];
    simpanSemuaKuisPerKelas(semuaKuis);
    renderKuisAktif();
    return;
  }

  if (!dataKuis.waktuHabis && dataKuis.endTimeTimestamp && Date.now() >= dataKuis.endTimeTimestamp) {
    mulaiPemantauTimerGlobal();
    return;
  }

  const userId = getIdPengerjaKuis();
  const belumAdaSoalTeracak = !(dataKuis.pengerjaanPerUser && dataKuis.pengerjaanPerUser[userId] && dataKuis.pengerjaanPerUser[userId].soalTeracak);
  const daftarSoalUser = getSoalUntukUser(dataKuis, userId, false);
  const statusUser = dataKuis.pengerjaanPerUser[userId];

  if (belumAdaSoalTeracak) {
    simpanSemuaKuisPerKelas(semuaKuis);
  }

  const durasi = dataKuis.durasiMenit || 5;
  const labelMapel = dataKuis.mapel ? ` • ${dataKuis.mapel}` : '';
  if (judulEl) judulEl.textContent = `Kuis AI (${kelasTarget}${labelMapel}): ${dataKuis.topik}`;
  if (subjudulEl) subjudulEl.textContent = `Kelas ${kelasTarget} • Total ${daftarSoalUser.length} Soal (Teracak) • Batas Waktu: ${durasi} Menit • Dibuat ${dataKuis.tanggal}`;

  renderSoalDariSesiAcak(dataKuis, daftarSoalUser, statusUser);

  if (dataKuis.waktuHabis || statusUser.sudahSelesaiManual) {
    if (dataKuis.waktuHabis && boxTimer) {
      boxTimer.classList.remove('hidden');
      const tampilanTimer = document.getElementById('tampilan-timer-kuis');
      if (tampilanTimer) {
        tampilanTimer.textContent = '00:00';
        tampilanTimer.className = 'font-mono text-lg font-extrabold text-red-400';
      }
    }
    terapkanTampilanTerkunci(dataKuis, statusUser, daftarSoalUser);
    mulaiPemantauTimerGlobal();
    return;
  }

  if (footerAksi) {
    footerAksi.classList.remove('hidden');
    const btnUlangi = footerAksi.querySelector('button[onclick="resetJawabanKuis()"]');
    if (btnUlangi) btnUlangi.classList.remove('hidden');
  }

  const btnSubmit = document.getElementById('btn-submit-kuis');
  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  mulaiPemantauTimerGlobal();
}

function terapkanTampilanTerkunci(dataKuis, statusUser, daftarSoalUser) {
  const hurufOpsi = ['A', 'B', 'C', 'D', 'E'];
  const jawabanTersimpan = (statusUser && statusUser.jawabanTersimpan) || [];
  const soalDipakai = daftarSoalUser || (statusUser && statusUser.soalTeracak) || dataKuis.soal;

  soalDipakai.forEach((item, idx) => {
    const jawabanUser = jawabanTersimpan[idx] !== undefined ? jawabanTersimpan[idx] : -1;
    const kunciJawaban = parseInt(item.jawaban, 10);

    const cardEl = document.getElementById(`card-soal-${idx}`);
    const feedbackEl = document.getElementById(`feedback-soal-${idx}`);
    const labelBenar = document.getElementById(`label-soal-${idx}-opt-${kunciJawaban}`);
    const labelUser = jawabanUser >= 0 ? document.getElementById(`label-soal-${idx}-opt-${jawabanUser}`) : null;

    document.querySelectorAll(`input[name="jawaban_soal_${idx}"]`).forEach(inp => {
      if (parseInt(inp.value, 10) === jawabanUser) inp.checked = true;
      inp.disabled = true;
    });

    if (feedbackEl) feedbackEl.classList.remove('hidden');

    if (jawabanUser === kunciJawaban) {
      if (cardEl) cardEl.classList.add('border-emerald-400', 'bg-emerald-50/20');
      if (labelBenar) labelBenar.classList.add('bg-emerald-100', 'border-emerald-500', 'text-emerald-900', 'font-semibold');
      if (feedbackEl) feedbackEl.innerHTML = `<span class="text-emerald-600">✔ Jawaban Benar!</span>`;
    } else if (jawabanUser === -1) {
      if (cardEl) cardEl.classList.add('border-amber-300', 'bg-amber-50/20');
      if (labelBenar) labelBenar.classList.add('bg-emerald-100', 'border-emerald-500', 'text-emerald-900', 'font-semibold');
      if (feedbackEl) feedbackEl.innerHTML = `<span class="text-amber-700">⏱ Tidak dijawab (Waktu Habis). Kunci jawaban: <strong>${hurufOpsi[kunciJawaban]}. ${item.opsi[kunciJawaban]}</strong></span>`;
    } else {
      if (cardEl) cardEl.classList.add('border-red-300', 'bg-red-50/20');
      if (labelUser) labelUser.classList.add('bg-red-100', 'border-red-400', 'text-red-900');
      if (labelBenar) labelBenar.classList.add('bg-emerald-100', 'border-emerald-500', 'text-emerald-900', 'font-semibold');
      if (feedbackEl) feedbackEl.innerHTML = `<span class="text-red-600">✘ Jawaban Salah. Kunci jawaban: <strong>${hurufOpsi[kunciJawaban]}. ${item.opsi[kunciJawaban]}</strong></span>`;
    }
  });

  const boxSkor = document.getElementById('box-skor-kuis');
  const nilaiEl = document.getElementById('nilai-akhir-kuis');
  const nilaiAkhir = (statusUser && statusUser.skorTersimpan) ?? 0;

  if (nilaiEl) nilaiEl.textContent = `${nilaiAkhir} / 100`;
  if (boxSkor) {
    boxSkor.classList.remove('hidden');
    boxSkor.className = nilaiAkhir >= 75
      ? 'px-4 py-2 rounded-2xl bg-emerald-600 text-white text-center shadow-md'
      : 'px-4 py-2 rounded-2xl bg-amber-600 text-white text-center shadow-md';
  }

  const footerAksi = document.getElementById('footer-aksi-kuis');
  if (footerAksi) {
    footerAksi.classList.remove('hidden');
    const btnUlangi = footerAksi.querySelector('button[onclick="resetJawabanKuis()"]');
    if (btnUlangi) {
      if (dataKuis.waktuHabis && !isAkunGuruAtauAdmin()) {
        btnUlangi.classList.add('hidden');
      } else {
        btnUlangi.classList.remove('hidden');
      }
    }
  }
  const btnSubmit = document.getElementById('btn-submit-kuis');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
  }
}

function koreksiNilaiOtomatis(waktuHabis = false) {
  const kelasTarget = getKelasTargetKuisAktif();
  if (!kelasTarget) return;

  const semuaKuis = getSemuaKuisPerKelas();
  const dataKuis = semuaKuis[kelasTarget];
  if (!dataKuis) return;

  const userId = getIdPengerjaKuis();
  const daftarSoalUser = getSoalUntukUser(dataKuis, userId, false);
  const totalSoal = daftarSoalUser.length;
  let jumlahBenar = 0;

  if (!waktuHabis) {
    for (let i = 0; i < totalSoal; i++) {
      const terpilih = document.querySelector(`input[name="jawaban_soal_${i}"]:checked`);
      if (!terpilih) {
        alert(`Nomor ${i + 1} belum dijawab! Silakan lengkapi semua jawaban sebelum waktu habis.`);
        return;
      }
    }
  }

  const jawabanUserArray = [];
  daftarSoalUser.forEach((item, idx) => {
    const terpilih = document.querySelector(`input[name="jawaban_soal_${idx}"]:checked`);
    const jawabanUser = terpilih ? parseInt(terpilih.value, 10) : -1;
    jawabanUserArray.push(jawabanUser);

    if (jawabanUser === parseInt(item.jawaban, 10)) {
      jumlahBenar++;
    }
  });

  const nilaiAkhir = Math.round((jumlahBenar / totalSoal) * 100);

  const statusUser = {
    skorTersimpan: nilaiAkhir,
    jawabanTersimpan: jawabanUserArray,
    sudahSelesaiManual: !waktuHabis,
    soalTeracak: daftarSoalUser
  };
  dataKuis.pengerjaanPerUser[userId] = statusUser;

  if (waktuHabis) {
    dataKuis.waktuHabis = true;
    dataKuis.expiredAt = Date.now() + (3 * 60 * 1000);
  }

  simpanSemuaKuisPerKelas(semuaKuis);

  catatRiwayatKuisMurid(dataKuis.topik, nilaiAkhir, kelasTarget, dataKuis.mapel);
  saveState();
  showToast(`Kuis "${dataKuis.topik}" selesai! Nilai Anda: ${nilaiAkhir} (Otomatis masuk ke Nilai Harian)`);

  terapkanTampilanTerkunci(dataKuis, statusUser, daftarSoalUser);
  mulaiPemantauTimerGlobal();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetJawabanKuis() {
  const kelasTarget = getKelasTargetKuisAktif();
  if (!kelasTarget) return;

  const semuaKuis = getSemuaKuisPerKelas();
  const dataKuis = semuaKuis[kelasTarget];

  if (dataKuis) {
    if ((dataKuis.waktuHabis || (dataKuis.endTimeTimestamp && Date.now() >= dataKuis.endTimeTimestamp)) && !isAkunGuruAtauAdmin()) {
      alert('Tidak bisa mengulangi kuis karena waktu pengerjaan telah habis!');
      return;
    }

    const userId = getIdPengerjaKuis();
    if (!dataKuis.pengerjaanPerUser) dataKuis.pengerjaanPerUser = {};

    const soalAcakBaru = acakSoalDanPilihan(dataKuis.soal);
    soalKuisSesiAktif = soalAcakBaru;

    dataKuis.pengerjaanPerUser[userId] = {
      sudahSelesaiManual: false,
      skorTersimpan: null,
      jawabanTersimpan: [],
      soalTeracak: soalAcakBaru
    };
    simpanSemuaKuisPerKelas(semuaKuis);
  }

  const boxSkor = document.getElementById('box-skor-kuis');
  if (boxSkor) boxSkor.classList.add('hidden');

  const btnSubmit = document.getElementById('btn-submit-kuis');
  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  renderKuisAktif();
  showToast("Kuis diulang! Urutan soal dan pilihan jawaban telah diacak.", "info");
}

// =========================================================================
// SISTEM PENGUMPULAN TUGAS -> TERHUBUNG OTOMATIS KE NILAI TUGAS SEMESTER
// =========================================================================
function getDaftarTugas() {
  const saved = localStorage.getItem('ma_daftar_tugas');
  return saved ? JSON.parse(saved) : [];
}

function kumpulkanTugasSiswa() {
  const isSiswa = state.currentUser && state.currentUser.role === 'siswa';
  const siswaData = isSiswa ? state.currentUser.data : null;

  const inputNama = document.getElementById('tugas-nama-siswa');
  const inputKelas = document.getElementById('tugas-kelas-siswa');
  const selectMapel = document.getElementById('tugas-pilih-mapel');
  const inputIsi = document.getElementById('tugas-judul-jawaban');

  const namaSiswa = siswaData ? siswaData.nama : (inputNama ? inputNama.value.trim() : '');
  const kelasSiswa = siswaData ? siswaData.kelas : (inputKelas ? inputKelas.value : '');
  const nisnSiswa = siswaData ? siswaData.nisn : '-';
  const mapel = selectMapel ? selectMapel.value : '';
  const isiTugas = inputIsi ? inputIsi.value.trim() : '';

  if (!namaSiswa || !isiTugas || !mapel) {
    alert('Nama siswa, mata pelajaran, dan judul/link tugas wajib diisi!');
    return;
  }

  const tanggalKumpul = formatTanggalSekarang();
  const daftarTugas = getDaftarTugas();

  daftarTugas.unshift({
    id: Date.now(),
    nisn: nisnSiswa,
    namaSiswa: namaSiswa,
    kelas: kelasSiswa,
    mapel: mapel,
    isiTugas: isiTugas,
    waktu: tanggalKumpul,
    nilai: null
  });

  localStorage.setItem('ma_daftar_tugas', JSON.stringify(daftarTugas));
  saveState();
  if (inputIsi) inputIsi.value = '';

  renderDaftarTugas();
  updateVisibilitasDanStatistikMurid();
  showToast(`Notifikasi: Tugas "${isiTugas}" berhasil dikumpulkan pada ${tanggalKumpul}!`);
}

function renderDaftarTugas() {
  const isGuru = isAkunGuruAtauAdmin();
  const isSiswa = state.currentUser && state.currentUser.role === 'siswa';
  const siswaData = isSiswa ? state.currentUser.data : null;

  const panelFormMurid = document.getElementById('panel-form-kumpul-tugas');
  const panelFilterGuru = document.getElementById('panel-filter-tugas-guru');
  const placeholderGuru = document.getElementById('placeholder-pilih-kelas-tugas');
  const wrapperDaftar = document.getElementById('wrapper-daftar-tugas');
  const container = document.getElementById('container-daftar-tugas');
  const badgeJumlah = document.getElementById('badge-jumlah-tugas');
  const filterMapelGuru = document.getElementById('filter-mapel-tugas-guru');
  const filterKelasGuru = document.getElementById('filter-kelas-tugas-guru');

  if (!container) return;

  sinkronisasiDropdownMapel();
  const daftarTugas = getDaftarTugas();

  if (isGuru) {
    if (panelFormMurid) panelFormMurid.classList.add('hidden');
    if (panelFilterGuru) panelFilterGuru.classList.remove('hidden');

    if (filterKelasGuru && !filterKelasGuru.value && kelasAktifGuru) {
      filterKelasGuru.value = kelasAktifGuru;
    }

    const kelasDipilih = filterKelasGuru ? filterKelasGuru.value : '';
    const mapelDipilih = filterMapelGuru ? filterMapelGuru.value : 'SEMUA';

    if (!kelasDipilih) {
      if (placeholderGuru) placeholderGuru.classList.remove('hidden');
      if (wrapperDaftar) wrapperDaftar.classList.add('hidden');
      return;
    }

    if (placeholderGuru) placeholderGuru.classList.add('hidden');
    if (wrapperDaftar) wrapperDaftar.classList.remove('hidden');

    let hasilFilter = daftarTugas.filter(t => t.kelas === kelasDipilih);
    if (mapelDipilih && mapelDipilih !== 'SEMUA') {
      hasilFilter = hasilFilter.filter(t => t.mapel === mapelDipilih);
    }

    const judulEl = document.getElementById('judul-daftar-tugas');
    if (judulEl) judulEl.textContent = `Daftar Pengumpulan Tugas — Kelas ${kelasDipilih}`;
    if (badgeJumlah) badgeJumlah.textContent = `${hasilFilter.length} Tugas`;

    if (hasilFilter.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
          Belum ada murid di <strong>Kelas ${kelasDipilih}</strong> yang mengumpulkan tugas untuk filter ini.
        </div>`;
      return;
    }

    container.innerHTML = hasilFilter.map(t => `
      <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">Kelas ${t.kelas || kelasDipilih}</span>
            <span class="px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-md text-[10px] font-bold">${t.mapel}</span>
            <span class="text-[11px] text-slate-500">📅 Dikumpulkan: <strong>${t.waktu || '-'}</strong></span>
          </div>
          <h4 class="text-sm font-bold text-slate-800">${t.namaSiswa} <span class="text-xs font-normal text-slate-500">(NISN: ${t.nisn || '-'})</span></h4>
          <p class="text-xs text-slate-600 break-all">📄 ${t.isiTugas}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <input type="number" min="0" max="100" id="input-nilai-tugas-${t.id}" value="${t.nilai !== null && t.nilai !== undefined ? t.nilai : ''}" placeholder="Nilai (0-100)"
                 class="w-24 px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-none">
          <button onclick="simpanPerubahanTugasGuru(${t.id})" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition">
            Simpan Nilai
          </button>
          <button onclick="editKeteranganTugasGuru(${t.id})" class="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold transition">
            Ubah
          </button>
          <button onclick="hapusTugas(${t.id})" title="Hapus Tugas" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `).join('');
  } else if (isSiswa && siswaData) {
    if (panelFormMurid) panelFormMurid.classList.remove('hidden');
    if (panelFilterGuru) panelFilterGuru.classList.add('hidden');
    if (placeholderGuru) placeholderGuru.classList.add('hidden');
    if (wrapperDaftar) wrapperDaftar.classList.remove('hidden');

    const inputNama = document.getElementById('tugas-nama-siswa');
    const inputKelas = document.getElementById('tugas-kelas-siswa');
    if (inputNama) {
      inputNama.value = siswaData.nama;
      inputNama.readOnly = true;
    }
    if (inputKelas) {
      inputKelas.value = siswaData.kelas;
      inputKelas.disabled = true;
    }

    const tugasSaya = daftarTugas.filter(t =>
      (t.nisn && t.nisn === siswaData.nisn) ||
      (t.namaSiswa && t.namaSiswa.toLowerCase() === siswaData.nama.toLowerCase())
    );

    const judulEl = document.getElementById('judul-daftar-tugas');
    if (judulEl) judulEl.textContent = `Riwayat Pengumpulan Tugas (${siswaData.nama} - ${siswaData.kelas})`;
    if (badgeJumlah) badgeJumlah.textContent = `${tugasSaya.length} Tugas`;

    if (tugasSaya.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
          Anda belum mengumpulkan tugas. Silakan isi formulir di atas untuk mengumpulkan tugas pertama Anda.
        </div>`;
      return;
    }

    container.innerHTML = tugasSaya.map(t => `
      <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-md text-[10px] font-bold">${t.mapel}</span>
            <span class="text-[11px] text-emerald-700 font-semibold">✅ Sudah Dikumpulkan pada ${t.waktu || '-'}</span>
          </div>
          <p class="text-xs font-bold text-slate-800 break-all">${t.isiTugas}</p>
        </div>

        <div class="shrink-0">
          ${t.nilai !== null && t.nilai !== undefined ? `
            <span class="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-extrabold inline-block">
              Nilai: ${t.nilai}
            </span>
          ` : `
            <span class="px-3.5 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-[11px] font-semibold inline-block">
              Menunggu Penilaian Guru
            </span>
          `}
        </div>
      </div>
    `).join('');
  } else {
    if (panelFormMurid) panelFormMurid.classList.add('hidden');
    if (panelFilterGuru) panelFilterGuru.classList.add('hidden');
    if (placeholderGuru) placeholderGuru.classList.add('hidden');
    if (wrapperDaftar) wrapperDaftar.classList.remove('hidden');
    if (badgeJumlah) badgeJumlah.textContent = `0 Tugas`;

    container.innerHTML = `
      <div class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
        Silakan <strong>Masuk (Login)</strong> menggunakan akun Siswa atau Guru untuk mengakses pengumpulan dan rekap tugas.
      </div>`;
  }

  if (window.lucide) lucide.createIcons();
}

function simpanPerubahanTugasGuru(idTugas) {
  const daftarTugas = getDaftarTugas();
  const idx = daftarTugas.findIndex(t => t.id === idTugas);
  if (idx === -1) return;

  const inputEl = document.getElementById(`input-nilai-tugas-${idTugas}`);
  const rawVal = inputEl ? inputEl.value.trim() : '';

  if (rawVal === '') {
    daftarTugas[idx].nilai = null;
  } else {
    const angkaNilai = parseFloat(rawVal);
    if (isNaN(angkaNilai) || angkaNilai < 0 || angkaNilai > 100) {
      alert('Nilai tidak valid! Masukkan angka antara 0 sampai 100.');
      return;
    }
    daftarTugas[idx].nilai = angkaNilai;
  }

  localStorage.setItem('ma_daftar_tugas', JSON.stringify(daftarTugas));
  sinkronisasiNilaiOtomatis(false, daftarTugas[idx].kelas, daftarTugas[idx].mapel);
  saveState();

  renderDaftarTugas();
  updateVisibilitasDanStatistikMurid();
  showToast(`Nilai tugas untuk ${daftarTugas[idx].namaSiswa} disimpan & otomatis masuk ke rekap Nilai Tugas!`);
}

function editKeteranganTugasGuru(idTugas) {
  const daftarTugas = getDaftarTugas();
  const idx = daftarTugas.findIndex(t => t.id === idTugas);
  if (idx === -1) return;

  const judulBaru = prompt(`Ubah judul/keterangan tugas milik ${daftarTugas[idx].namaSiswa}:`, daftarTugas[idx].isiTugas);
  if (judulBaru !== null && judulBaru.trim() !== '') {
    daftarTugas[idx].isiTugas = judulBaru.trim();
    localStorage.setItem('ma_daftar_tugas', JSON.stringify(daftarTugas));
    saveState();
    renderDaftarTugas();
    showToast('Data tugas murid berhasil diperbarui!');
  }
}

function hapusTugas(idTugas) {
  if (!confirm('Hapus data tugas ini?')) return;
  const target = getDaftarTugas().find(t => t.id === idTugas);
  const sisa = getDaftarTugas().filter(t => t.id !== idTugas);
  localStorage.setItem('ma_daftar_tugas', JSON.stringify(sisa));

  if (target) {
    sinkronisasiNilaiOtomatis(false, target.kelas, target.mapel);
  }
  saveState();
  renderDaftarTugas();
  updateVisibilitasDanStatistikMurid();
  showToast('Data tugas dihapus', 'error');
}

// =========================================================================
// INTEGRASI OTOMATIS NILAI HARIAN (KUIS) & NILAI TUGAS + REKAP SEMESTER
// =========================================================================
function hitungNilaiHarianDariKuis(siswaObj, mapel) {
  const riwayatKuis = JSON.parse(localStorage.getItem('ma_riwayat_kuis_murid') || '[]');
  const hasilSiswa = riwayatKuis.filter(item => {
    const cocokNisn = siswaObj.nisn && item.nisn && item.nisn === siswaObj.nisn;
    const cocokNama = (item.nama || '').trim().toLowerCase() === (siswaObj.nama || '').trim().toLowerCase();
    const cocokMapel = !item.mapel || (mapel && item.mapel.toLowerCase() === mapel.toLowerCase());
    return (cocokNisn || cocokNama) && cocokMapel;
  });

  if (hasilSiswa.length === 0) return null;
  const total = hasilSiswa.reduce((acc, cur) => acc + Number(cur.skor || cur.nilai || 0), 0);
  return Math.round(total / hasilSiswa.length);
}

function hitungNilaiTugasDariPengumpulan(siswaObj, kelasSiswa, mapel) {
  const daftarTugas = getDaftarTugas();
  const tugasSiswa = daftarTugas.filter(t => {
    const cocokNisn = siswaObj.nisn && t.nisn && t.nisn === siswaObj.nisn;
    const cocokNama = (t.namaSiswa || '').trim().toLowerCase() === (siswaObj.nama || '').trim().toLowerCase();
    const cocokKelas = !t.kelas || t.kelas === kelasSiswa;
    const cocokMapel = !mapel || (t.mapel || '').toLowerCase() === mapel.toLowerCase();
    const sudahDinilai = t.nilai !== undefined && t.nilai !== null && t.nilai !== '';
    return (cocokNisn || cocokNama) && cocokKelas && cocokMapel && sudahDinilai;
  });

  if (tugasSiswa.length === 0) return null;
  const total = tugasSiswa.reduce((acc, cur) => acc + Number(cur.nilai || 0), 0);
  return Math.round(total / tugasSiswa.length);
}

function sinkronisasiNilaiOtomatis(tampilkanNotif = false, overrideKelas = null, overrideMapel = null) {
  const semester = document.getElementById('nilai-semester')?.value || '2026/2027 - Ganjil';
  const mapel = overrideMapel || document.getElementById('nilai-mapel')?.value || mapelAktifGuru || '';
  const kelas = overrideKelas || document.getElementById('nilai-kelas')?.value || kelasAktifGuru || '';

  if (!kelas || !mapel) {
    if (!overrideKelas && !overrideMapel) {
      renderNilaiTable(false);
    }
    return;
  }

  const siswaKelas = state.siswa.filter(s => s.kelas === kelas);
  let dbNilai = JSON.parse(localStorage.getItem('maplus_data_nilai_semester') || '{}');

  siswaKelas.forEach(siswa => {
    const idSiswa = siswa.nisn || siswa.id;
    const key = `${semester}__${kelas}__${mapel}__${idSiswa}`;
    const nilaiHarianKuis = hitungNilaiHarianDariKuis(siswa, mapel);
    const nilaiTugasKumpul = hitungNilaiTugasDariPengumpulan(siswa, kelas, mapel);

    if (!dbNilai[key]) {
      dbNilai[key] = { harian: 0, tugas: 0 };
    }
    if (nilaiHarianKuis !== null) {
      dbNilai[key].harian = nilaiHarianKuis;
    }
    if (nilaiTugasKumpul !== null) {
      dbNilai[key].tugas = nilaiTugasKumpul;
    }
  });

  localStorage.setItem('maplus_data_nilai_semester', JSON.stringify(dbNilai));
  state.nilai = dbNilai;

  if (!overrideKelas && !overrideMapel) {
    renderNilaiTable(false);
  }

  if (tampilkanNotif) {
    showToast('Nilai Harian (Kuis) & Nilai Tugas berhasil disinkronkan!', 'success');
  }
}

function renderNilaiTable(autoSync = true) {
  const tbody = document.getElementById('table-nilai-body');
  if (!tbody) return;

  const selectMapel = document.getElementById('nilai-mapel');
  const kelasEl = document.getElementById('nilai-kelas');

  if (kelasEl && kelasAktifGuru && Array.from(kelasEl.options).some(opt => opt.value === kelasAktifGuru)) {
    kelasEl.value = kelasAktifGuru;
  }

  if (state.currentUser && selectMapel) {
    const valSebelum = selectMapel.value;
    const mapelDiampu = getMapelDiampuGuru(state.currentUser.data);
    if (mapelDiampu.length > 0) {
      selectMapel.innerHTML = mapelDiampu.map(m => `<option value="${m}">${m}</option>`).join('');
      if (valSebelum && mapelDiampu.includes(valSebelum)) {
        selectMapel.value = valSebelum;
      } else if (mapelAktifGuru && mapelDiampu.includes(mapelAktifGuru)) {
        selectMapel.value = mapelAktifGuru;
      }
      selectMapel.disabled = mapelDiampu.length === 1;
    } else {
      const semuaMapel = getDaftarMapel().map(m => formatLabelMapelDenganKelas(m));
      selectMapel.innerHTML = semuaMapel.length > 0
        ? semuaMapel.map(m => `<option value="${m}">${m}</option>`).join('')
        : `<option value="">-- Belum ada mata pelajaran --</option>`;
      if (valSebelum && semuaMapel.includes(valSebelum)) {
        selectMapel.value = valSebelum;
      } else if (mapelAktifGuru && semuaMapel.includes(mapelAktifGuru)) {
        selectMapel.value = mapelAktifGuru;
      }
      selectMapel.disabled = false;
    }
  }

  if (autoSync) {
    sinkronisasiNilaiOtomatis(false);
    return;
  }

  const semester = document.getElementById('nilai-semester')?.value || '2026/2027 - Ganjil';
  const mapel = selectMapel ? selectMapel.value : '';
  const kelas = kelasEl ? kelasEl.value : '';

  if (!kelas || !mapel) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-slate-400">Tambahkan/pilih mata pelajaran dan kelas untuk mengelola nilai</td></tr>`;
    renderArsipSemester();
    return;
  }

  const siswaKelas = state.siswa.filter(s => s.kelas === kelas);
  const dbNilai = JSON.parse(localStorage.getItem('maplus_data_nilai_semester') || '{}');

  if (siswaKelas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-slate-400">Tidak ada murid di kelas ${kelas}</td></tr>`;
    renderArsipSemester();
    return;
  }

  tbody.innerHTML = siswaKelas.map(siswa => {
    const idSiswa = siswa.nisn || siswa.id;
    const key = `${semester}__${kelas}__${mapel}__${idSiswa}`;
    const nilaiObj = dbNilai[key] || { harian: 0, tugas: 0 };
    const rata = Math.round((Number(nilaiObj.harian || 0) + Number(nilaiObj.tugas || 0)) / 2);

    return `
      <tr class="hover:bg-slate-50 transition" data-siswa-id="${idSiswa}" data-siswa-nama="${siswa.nama}">
        <td class="px-4 py-3 font-semibold text-slate-800">${siswa.nama}</td>
        <td class="px-4 py-3 text-center">
          <input type="number" min="0" max="100" value="${nilaiObj.harian}"
                 oninput="hitungRataBarisNilai(this)"
                 class="input-nilai-harian w-20 text-center py-1.5 px-2 border border-slate-300 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
        </td>
        <td class="px-4 py-3 text-center">
          <input type="number" min="0" max="100" value="${nilaiObj.tugas}"
                 oninput="hitungRataBarisNilai(this)"
                 class="input-nilai-tugas w-20 text-center py-1.5 px-2 border border-slate-300 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
        </td>
        <td class="px-4 py-3 text-center font-extrabold text-emerald-700 text-sm cell-rata-nilai">${rata}</td>
      </tr>
    `;
  }).join('');

  renderArsipSemester();
}

function hitungRataBarisNilai(inputEl) {
  const row = inputEl.closest('tr');
  const harian = Number(row.querySelector('.input-nilai-harian').value || 0);
  const tugas = Number(row.querySelector('.input-nilai-tugas').value || 0);
  const rata = Math.round((harian + tugas) / 2);
  row.querySelector('.cell-rata-nilai').textContent = rata;
}

function saveNilai() {
  if (!state.currentUser || (state.currentUser.role !== 'admin' && state.currentUser.role !== 'guru')) {
    showToast("Akses Ditolak!", "error");
    return;
  }

  const semester = document.getElementById('nilai-semester')?.value || '2026/2027 - Ganjil';
  const mapel = document.getElementById('nilai-mapel')?.value || '';
  const kelas = document.getElementById('nilai-kelas')?.value || '';
  if (!kelas || !mapel) {
    showToast("Pilih kelas dan mata pelajaran terlebih dahulu.", "error");
    return;
  }

  const dbNilai = JSON.parse(localStorage.getItem('maplus_data_nilai_semester') || '{}');

  document.querySelectorAll('#table-nilai-body tr[data-siswa-id]').forEach(row => {
    const idSiswa = row.getAttribute('data-siswa-id');
    const harian = Number(row.querySelector('.input-nilai-harian').value || 0);
    const tugas = Number(row.querySelector('.input-nilai-tugas').value || 0);
    const key = `${semester}__${kelas}__${mapel}__${idSiswa}`;
    dbNilai[key] = { harian, tugas };
  });

  localStorage.setItem('maplus_data_nilai_semester', JSON.stringify(dbNilai));
  state.nilai = dbNilai;
  saveState();
  showToast(`Nilai ${mapel} (${kelas}) pada ${semester} berhasil tersimpan!`, 'success');
}

function rekapGantiSemester() {
  const selectSem = document.getElementById('nilai-semester');
  const semesterAktif = selectSem.value;
  const kelas = document.getElementById('nilai-kelas').value;
  const mapel = document.getElementById('nilai-mapel').value;

  const konfirmasi = confirm(
    `Rekap seluruh nilai kelas ${kelas} pada "${semesterAktif}" ke dalam arsip rapor dan lanjutkan ke semester berikutnya?`
  );
  if (!konfirmasi) return;

  saveNilai();

  const rows = document.querySelectorAll('#table-nilai-body tr[data-siswa-id]');
  if (rows.length === 0) return;

  const daftarRekapSiswa = [];
  rows.forEach(row => {
    daftarRekapSiswa.push({
      nama: row.getAttribute('data-siswa-nama'),
      harian: Number(row.querySelector('.input-nilai-harian').value || 0),
      tugas: Number(row.querySelector('.input-nilai-tugas').value || 0),
      rata: Number(row.querySelector('.cell-rata-nilai').textContent || 0)
    });
  });

  const arsip = JSON.parse(localStorage.getItem('maplus_arsip_rekap_semester') || '[]');
  arsip.unshift({
    id: Date.now(),
    tanggalRekap: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
    semester: semesterAktif,
    kelas: kelas,
    mapel: mapel,
    dataSiswa: daftarRekapSiswa
  });
  localStorage.setItem('maplus_arsip_rekap_semester', JSON.stringify(arsip));

  if (selectSem.selectedIndex < selectSem.options.length - 1) {
    selectSem.selectedIndex += 1;
  }

  saveState();
  renderNilaiTable(true);
  showToast(`Rekap ${semesterAktif} berhasil diarsipkan! Beralih ke ${selectSem.value}.`, 'success');
}

function renderArsipSemester() {
  const container = document.getElementById('container-arsip-semester');
  const badge = document.getElementById('badge-arsip-semester');
  if (!container) return;

  const arsip = JSON.parse(localStorage.getItem('maplus_arsip_rekap_semester') || '[]');
  if (badge) badge.textContent = `${arsip.length} Arsip`;

  if (arsip.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic">Belum ada arsip rekapitulasi semester yang disimpan.</p>`;
    return;
  }

  container.innerHTML = arsip.map(item => `
    <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span class="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md text-[10px] font-bold">${item.semester}</span>
          <h4 class="font-bold text-xs text-slate-800 mt-1">${item.mapel} — Kelas ${item.kelas}</h4>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-[11px] text-slate-500">Direkap: ${item.tanggalRekap}</span>
          <button onclick="hapusArsipSemester(${item.id})" class="text-red-500 hover:text-red-700 text-[11px] font-semibold">Hapus</button>
        </div>
      </div>
      <div class="overflow-x-auto bg-white rounded-xl border border-amber-100">
        <table class="w-full text-left text-[11px] text-slate-600">
          <thead class="bg-slate-50 border-b border-slate-100 text-slate-500">
            <tr>
              <th class="px-3 py-1.5">Nama Siswa</th>
              <th class="px-3 py-1.5 text-center">Harian (Kuis)</th>
              <th class="px-3 py-1.5 text-center">Tugas</th>
              <th class="px-3 py-1.5 text-center">Nilai Akhir</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${item.dataSiswa.map(s => `
              <tr>
                <td class="px-3 py-1.5 font-medium text-slate-800">${s.nama}</td>
                <td class="px-3 py-1.5 text-center">${s.harian}</td>
                <td class="px-3 py-1.5 text-center">${s.tugas}</td>
                <td class="px-3 py-1.5 text-center font-bold text-emerald-700">${s.rata}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('');
}

function hapusArsipSemester(id) {
  let arsip = JSON.parse(localStorage.getItem('maplus_arsip_rekap_semester') || '[]');
  arsip = arsip.filter(a => a.id !== id);
  localStorage.setItem('maplus_arsip_rekap_semester', JSON.stringify(arsip));
  saveState();
  renderArsipSemester();
}

// =========================================================================
// PORTAL RAPOR SISWA
// =========================================================================
function renderPortalSiswa() {
  if (!state.currentUser || state.currentUser.role !== 'siswa') return;
  const s = state.currentUser.data;

  const pNama = document.getElementById('portal-nama');
  const pNisn = document.getElementById('portal-nisn');
  const pKelas = document.getElementById('portal-kelas');
  const pFoto = document.getElementById('portal-foto');

  if (pNama) pNama.innerText = s.nama;
  if (pNisn) pNisn.innerText = s.nisn;
  if (pKelas) pKelas.innerText = s.kelas;
  if (pFoto) pFoto.src = s.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.nama)}&background=059669&color=fff`;

  const tbody = document.getElementById('portal-nilai-body');
  if (tbody) {
    const dbNilai = JSON.parse(localStorage.getItem('maplus_data_nilai_semester') || '{}');
    const semesterAktif = document.getElementById('nilai-semester')?.value || '2026/2027 - Ganjil';
    const daftarMapel = getDaftarMapel().filter(m => isMapelBerlakuUntukKelas(m, s.kelas));

    if (daftarMapel.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400">Belum ada mata pelajaran untuk kelas Anda.</td></tr>`;
      return;
    }

    tbody.innerHTML = daftarMapel.map(m => {
      const labelMapel = formatLabelMapelDenganKelas(m);
      const key = `${semesterAktif}__${s.kelas}__${labelMapel}__${s.nisn}`;
      const nilaiObj = dbNilai[key] || {
        harian: hitungNilaiHarianDariKuis(s, labelMapel) || 0,
        tugas: hitungNilaiTugasDariPengumpulan(s, s.kelas, labelMapel) || 0
      };
      const rata = Math.round((Number(nilaiObj.harian || 0) + Number(nilaiObj.tugas || 0)) / 2);

      return `
        <tr>
          <td class="px-4 py-2.5 font-semibold text-slate-800">${labelMapel}</td>
          <td class="px-4 py-2.5 text-center">${nilaiObj.harian}</td>
          <td class="px-4 py-2.5 text-center">${nilaiObj.tugas}</td>
          <td class="px-4 py-2.5 text-center font-bold text-emerald-700">${rata}</td>
        </tr>
      `;
    }).join('');
  }
}

// =========================================================================
// MANAGEMENT SISWA (KOSONG DI AWAL)
// =========================================================================
function renderSiswaTable() {
  const tbody = document.getElementById('table-siswa-body');
  if (!tbody) return;

  const searchInput = document.getElementById('search-siswa');
  const filterInput = document.getElementById('filter-kelas-siswa');

  const search = searchInput ? searchInput.value.toLowerCase() : '';
  const filter = filterInput ? filterInput.value : '';

  const filtered = state.siswa.filter(s => {
    const matchSearch = s.nama.toLowerCase().includes(search) || s.nisn.includes(search);
    const matchKelas = filter === '' || s.kelas === filter;
    return matchSearch && matchKelas;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400">Belum ada data siswa. Klik "Tambah Siswa Baru" untuk menginput data.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-2.5 flex items-center space-x-3">
        <img src="${s.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.nama)}&background=059669&color=fff`}" class="w-8 h-8 rounded-full object-cover">
        <span class="font-semibold text-slate-800">${s.nama}</span>
      </td>
      <td class="px-4 py-2.5 font-mono text-[11px]">${s.nisn}</td>
      <td class="px-4 py-2.5">${s.kelas}</td>
      <td class="px-4 py-2.5">${s.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
      <td class="px-4 py-2.5 text-center">
        <button onclick="deleteSiswa('${s.id}')" class="text-red-600 hover:underline font-semibold">Hapus</button>
      </td>
    </tr>
  `).join('');
}

function openModalSiswa() {
  if (!state.currentUser || (state.currentUser.role !== 'admin' && state.currentUser.role !== 'guru')) {
    showToast("Akses Ditolak! Hanya Guru / Admin yang dapat menambah siswa.", "error");
    return;
  }
  const modal = document.getElementById('modal-siswa');
  const form = document.getElementById('form-siswa');
  if (form) form.reset();
  if (modal) modal.classList.remove('hidden');
}

function closeModalSiswa() {
  const modal = document.getElementById('modal-siswa');
  if (modal) modal.classList.add('hidden');
}

function saveSiswaForm(e) {
  e.preventDefault();
  if (!state.currentUser || (state.currentUser.role !== 'admin' && state.currentUser.role !== 'guru')) {
    showToast("Akses Ditolak!", "error");
    return;
  }

  const nama = document.getElementById('siswa-nama').value.trim();
  const nisn = document.getElementById('siswa-nisn').value.trim();
  const passwordInput = document.getElementById('siswa-pass');
  const password = passwordInput ? (passwordInput.value.trim() || "123456") : "123456";
  const fotoInput = document.getElementById('siswa-foto')?.value.trim();
  const foto = fotoInput || `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=059669&color=fff`;
  const kelas = document.getElementById('siswa-kelas').value;
  const jk = document.getElementById('siswa-jk').value;

  state.siswa.push({ id: Date.now().toString(), nisn, nama, password, kelas, jk, foto });
  saveState();
  closeModalSiswa();
  renderSiswaTable();
  perbaruiTampilanKelasGuru();
  showToast("Siswa berhasil ditambahkan!");
}

function deleteSiswa(id) {
  if (!state.currentUser || (state.currentUser.role !== 'admin' && state.currentUser.role !== 'guru')) {
    showToast("Akses Ditolak! Hanya Guru / Admin yang dapat menghapus siswa.", "error");
    return;
  }

  if (confirm("Yakin ingin menghapus siswa ini?")) {
    state.siswa = state.siswa.filter(s => s.id !== id);
    saveState();
    renderSiswaTable();
    perbaruiTampilanKelasGuru();
    showToast("Data siswa dihapus", "error");
  }
}

// =========================================================================
// MANAGEMENT GURU (KOSONG DI AWAL): TAMBAH AKUN BARU + EDIT / TAMBAH MAPEL
// =========================================================================
function renderGuruTable() {
  const tbody = document.getElementById('table-guru-body');
  if (!tbody) return;

  if (state.guru.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-slate-400">Belum ada data guru. Klik "Tambah Guru Baru" untuk menambahkan akun guru.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.guru.map(g => {
    const listMapel = getMapelDiampuGuru(g);
    const badgeMapelHtml = listMapel.length > 0
      ? listMapel.map(m => `<span class="inline-block bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-bold mr-1 mb-1">${m}</span>`).join('')
      : `<span class="text-xs text-slate-400">Belum ada mapel</span>`;

    return `
      <tr class="hover:bg-slate-50">
        <td class="px-4 py-2.5 font-semibold text-slate-800">${g.nama}</td>
        <td class="px-4 py-2.5 font-mono text-[11px]">${g.nip}</td>
        <td class="px-4 py-2.5">${badgeMapelHtml}</td>
        <td class="px-4 py-2.5 text-center space-x-2 whitespace-nowrap">
          <button onclick="openModalEditMapelGuru('${g.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs transition">
            + Edit Mapel
          </button>
          <button onclick="deleteGuru('${g.id}')" class="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-xs transition">
            Hapus
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderCheckboxMapelGuru() {
  const container = document.getElementById('container-checkbox-mapel-guru');
  if (!container) return;

  const daftarMapel = getDaftarMapel();
  if (daftarMapel.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 col-span-full">Belum ada mata pelajaran tersedia. Tambahkan di menu Mata Pelajaran terlebih dahulu.</p>`;
    return;
  }

  container.innerHTML = daftarMapel.map(m => {
    const labelLengkap = formatLabelMapelDenganKelas(m);
    return `
      <label class="flex items-center space-x-2 p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 cursor-pointer text-xs text-slate-700">
        <input type="checkbox" name="guru-mapel-checkbox" value="${labelLengkap}" class="accent-emerald-600 w-4 h-4 rounded shrink-0">
        <span class="font-medium leading-snug">${labelLengkap}</span>
      </label>
    `;
  }).join('');
}

function openModalGuru() {
  const modal = document.getElementById('modal-guru');
  const form = document.getElementById('form-guru');
  if (form) form.reset();
  renderCheckboxMapelGuru();
  if (modal) modal.classList.remove('hidden');
}

function closeModalGuru() {
  const modal = document.getElementById('modal-guru');
  if (modal) modal.classList.add('hidden');
}

function saveGuruForm(e) {
  e.preventDefault();
  const nama = document.getElementById('guru-nama').value.trim();
  const nip = document.getElementById('guru-nip').value.trim();
  const password = document.getElementById('guru-pass').value.trim();

  const checkedBoxes = Array.from(document.querySelectorAll('input[name="guru-mapel-checkbox"]:checked'));
  const mapelTerpilih = checkedBoxes.map(cb => cb.value);

  if (mapelTerpilih.length === 0) {
    showToast("Pilih minimal 1 mata pelajaran yang diampu guru!", "error");
    return;
  }

  if (state.guru.some(g => g.nip === nip)) {
    showToast("NIP / Username sudah terdaftar!", "error");
    return;
  }

  state.guru.push({
    id: Date.now().toString(),
    nip,
    nama,
    password,
    mapel: mapelTerpilih.join(', '),
    mapelList: mapelTerpilih
  });

  saveState();
  closeModalGuru();
  renderGuruTable();
  showToast(`Akun guru ${nama} (${mapelTerpilih.length} mapel) berhasil didaftarkan!`);
}

function deleteGuru(id) {
  if (confirm("Yakin ingin menghapus data guru ini?")) {
    state.guru = state.guru.filter(g => g.id !== id);
    saveState();
    renderGuruTable();
    showToast("Data guru dihapus", "error");
  }
}

function openModalEditMapelGuru(guruId) {
  const guru = state.guru.find(g => g.id === guruId);
  if (!guru) return;

  const modal = document.getElementById('modal-edit-mapel-guru');
  const idInput = document.getElementById('edit-mapel-guru-id');
  const subtitle = document.getElementById('edit-mapel-guru-subtitle');
  const container = document.getElementById('container-edit-checkbox-mapel-guru');

  if (!modal || !container) return;

  idInput.value = guru.id;
  if (subtitle) subtitle.textContent = `Guru: ${guru.nama} (NIP: ${guru.nip})`;

  const mapelSaatIni = getMapelDiampuGuru(guru);
  const daftarMapel = getDaftarMapel();

  const semuaOpsiSet = new Set(daftarMapel.map(m => formatLabelMapelDenganKelas(m)));
  mapelSaatIni.forEach(mLama => semuaOpsiSet.add(mLama));

  const semuaOpsi = Array.from(semuaOpsiSet);

  if (semuaOpsi.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 col-span-full">Belum ada mata pelajaran. Tambahkan di menu Mata Pelajaran terlebih dahulu.</p>`;
  } else {
    container.innerHTML = semuaOpsi.map(labelMapel => {
      const isChecked = mapelSaatIni.includes(labelMapel) ? 'checked' : '';
      return `
        <label class="flex items-center space-x-2 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 cursor-pointer text-xs text-slate-700">
          <input type="checkbox" name="edit-guru-mapel-cb" value="${labelMapel}" ${isChecked} class="accent-emerald-600 w-4 h-4 rounded shrink-0">
          <span class="font-medium leading-snug">${labelMapel}</span>
        </label>
      `;
    }).join('');
  }

  modal.classList.remove('hidden');
}

function closeModalEditMapelGuru() {
  const modal = document.getElementById('modal-edit-mapel-guru');
  if (modal) modal.classList.add('hidden');
}

function simpanEditMapelGuru() {
  const guruId = document.getElementById('edit-mapel-guru-id').value;
  const idx = state.guru.findIndex(g => g.id === guruId);
  if (idx === -1) return;

  const terpilih = Array.from(document.querySelectorAll('input[name="edit-guru-mapel-cb"]:checked')).map(cb => cb.value);

  if (terpilih.length === 0) {
    showToast("Pilih minimal 1 mata pelajaran untuk guru ini!", "error");
    return;
  }

  state.guru[idx].mapelList = terpilih;
  state.guru[idx].mapel = terpilih.join(', ');
  saveState();

  if (state.currentUser && state.currentUser.data && state.currentUser.data.id === guruId) {
    state.currentUser.data = state.guru[idx];
    simpanSesiUser();
    muatOpsiMapelUntukGuruLogin();
    updateNavbar();
  }

  closeModalEditMapelGuru();
  renderGuruTable();
  showToast(`Daftar mapel untuk ${state.guru[idx].nama} berhasil diperbarui!`);
}

// =========================================================================
// ABSENSI / PRESENSI
// =========================================================================
function renderPresensiTable() {
  const kelasEl = document.getElementById('presensi-kelas');
  const dateEl = document.getElementById('presensi-tanggal');
  if (!kelasEl || !dateEl) return;

  if (kelasAktifGuru && Array.from(kelasEl.options).some(opt => opt.value === kelasAktifGuru)) {
    kelasEl.value = kelasAktifGuru;
  }

  const kelas = kelasEl.value;
  if (!dateEl.value) {
    dateEl.value = new Date().toISOString().split('T')[0];
  }
  const date = dateEl.value;

  const filteredSiswa = state.siswa.filter(s => s.kelas === kelas);
  const tbody = document.getElementById('table-presensi-body');
  if (!tbody) return;

  if (filteredSiswa.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="px-4 py-8 text-center text-slate-400">Tidak ada murid di kelas ${kelas}</td></tr>`;
    updatePresensiCounter({}, []);
    return;
  }

  const key = `${date}_${kelas}`;
  const savedPresensi = state.presensi[key] || {};

  tbody.innerHTML = filteredSiswa.map(s => {
    const status = savedPresensi[s.id] || 'Hadir';
    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-4 py-3 flex items-center space-x-3">
          <img src="${s.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.nama)}&background=059669&color=fff`}" class="w-8 h-8 rounded-full object-cover">
          <span class="font-semibold text-slate-800">${s.nama}</span>
        </td>
        <td class="px-4 py-3 font-mono text-xs">${s.nisn}</td>
        <td class="px-4 py-3 text-center">
          <div class="inline-flex space-x-1 bg-slate-100 p-1 rounded-xl">
            ${['Hadir', 'Izin', 'Sakit', 'Alfa'].map(st => `
              <button onclick="setPresensiStatus('${s.id}', '${st}')" class="px-3 py-1 text-xs font-bold rounded-lg transition ${status === st ? getPresensiBadgeStyle(st) : 'text-slate-500 hover:bg-slate-200'}">
                ${st}
              </button>
            `).join('')}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updatePresensiCounter(savedPresensi, filteredSiswa);
}

function getPresensiBadgeStyle(st) {
  if (st === 'Hadir') return 'bg-emerald-600 text-white shadow-sm';
  if (st === 'Izin') return 'bg-blue-600 text-white shadow-sm';
  if (st === 'Sakit') return 'bg-amber-600 text-white shadow-sm';
  return 'bg-red-600 text-white shadow-sm';
}

function setPresensiStatus(siswaId, status) {
  if (!state.currentUser || (state.currentUser.role !== 'admin' && state.currentUser.role !== 'guru')) {
    showToast("Akses Ditolak! Hanya Guru / Admin yang dapat mengabsen.", "error");
    return;
  }

  const kelas = document.getElementById('presensi-kelas').value;
  const date = document.getElementById('presensi-tanggal').value;
  const key = `${date}_${kelas}`;

  if (!state.presensi[key]) state.presensi[key] = {};
  state.presensi[key][siswaId] = status;
  renderPresensiTable();
}

function setAllPresensi(status) {
  if (!state.currentUser || (state.currentUser.role !== 'admin' && state.currentUser.role !== 'guru')) {
    showToast("Akses Ditolak! Hanya Guru / Admin yang dapat mengabsen.", "error");
    return;
  }

  const kelas = document.getElementById('presensi-kelas').value;
  const date = document.getElementById('presensi-tanggal').value;
  const key = `${date}_${kelas}`;

  if (!state.presensi[key]) state.presensi[key] = {};
  state.siswa.filter(s => s.kelas === kelas).forEach(s => {
    state.presensi[key][s.id] = status;
  });
  renderPresensiTable();
}

function updatePresensiCounter(savedPresensi, filteredSiswa = []) {
  let hadir = 0, izin = 0, sakit = 0, alfa = 0;
  filteredSiswa.forEach(s => {
    const st = savedPresensi[s.id] || 'Hadir';
    if (st === 'Hadir') hadir++;
    if (st === 'Izin') izin++;
    if (st === 'Sakit') sakit++;
    if (st === 'Alfa') alfa++;
  });

  const cHadir = document.getElementById('count-hadir');
  const cIzin = document.getElementById('count-izin');
  const cSakit = document.getElementById('count-sakit');
  const cAlfa = document.getElementById('count-alfa');

  if (cHadir) cHadir.innerText = hadir;
  if (cIzin) cIzin.innerText = izin;
  if (cSakit) cSakit.innerText = sakit;
  if (cAlfa) cAlfa.innerText = alfa;
}

function savePresensi() {
  if (!state.currentUser || (state.currentUser.role !== 'admin' && state.currentUser.role !== 'guru')) {
    showToast("Akses Ditolak! Hanya Guru / Admin yang dapat menyimpan absensi.", "error");
    return;
  }
  saveState();
  perbaruiTampilanKelasGuru();
  showToast("Data absensi murid berhasil disimpan!");
}

// =========================================================================
// PENYIMPANAN FILE BESAR (INDEXEDDB) & UPLOAD E-BOOK, PPT, VIDEO (MAX 100MB)
// =========================================================================
const DB_MATERI_NAME = 'MAPlusMateriDB';
const DB_MATERI_STORE = 'files_materi';

function bukaDBMateri() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_MATERI_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_MATERI_STORE)) {
        db.createObjectStore(DB_MATERI_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function simpanBlobKeDB(id, fileBlob) {
  const db = await bukaDBMateri();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_MATERI_STORE, 'readwrite');
    tx.objectStore(DB_MATERI_STORE).put({ id: id, blob: fileBlob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function ambilBlobDariDB(id) {
  const db = await bukaDBMateri();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_MATERI_STORE, 'readonly');
    const req = tx.objectStore(DB_MATERI_STORE).get(id);
    req.onsuccess = () => resolve(req.result ? req.result.blob : null);
    req.onerror = () => reject(req.error);
  });
}

async function hapusBlobDariDB(id) {
  const db = await bukaDBMateri();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_MATERI_STORE, 'readwrite');
    tx.objectStore(DB_MATERI_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getDaftarMateri(jenis) {
  const saved = localStorage.getItem(`ma_materi_${jenis}`);
  return saved ? JSON.parse(saved) : [];
}

function formatUrlYouTubeEmbed(url) {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

async function tambahMateriPembelajaran(jenis) {
  if (!isAkunGuruAtauAdmin()) {
    alert('Akses ditolak! Hanya Guru / Admin yang dapat mengunggah materi.');
    return;
  }

  const mapelEl = document.getElementById(`${jenis}-pilih-mapel`);
  const judulEl = document.getElementById(`${jenis}-judul`);
  const fileEl = document.getElementById(`${jenis}-file`);
  const linkEl = document.getElementById(`${jenis}-link`);

  const mapel = mapelEl ? mapelEl.value : '';
  const judul = judulEl ? judulEl.value.trim() : '';
  const fileObj = fileEl && fileEl.files.length > 0 ? fileEl.files[0] : null;
  const linkManual = linkEl ? linkEl.value.trim() : '';

  if (!mapel) {
    alert('Silakan pilih atau tambahkan Mata Pelajaran terlebih dahulu!');
    return;
  }

  if (!judul) {
    alert('Silakan masukkan judul materi terlebih dahulu!');
    if (judulEl) judulEl.focus();
    return;
  }

  if (!fileObj && !linkManual) {
    alert('Silakan pilih file untuk diupload ATAU masukkan link materi!');
    return;
  }

  const idMateri = Date.now();
  let sumberData = linkManual;
  let namaFileAsli = '';
  let ukuranFileMB = '';
  let tipeSumber = 'link';

  if (fileObj) {
    const batasMaxBytes = 100 * 1024 * 1024;
    if (fileObj.size > batasMaxBytes) {
      alert(`Ukuran file (${(fileObj.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 100 MB!`);
      return;
    }

    try {
      await simpanBlobKeDB(idMateri, fileObj);
      sumberData = `indexeddb://${idMateri}`;
      namaFileAsli = fileObj.name;
      ukuranFileMB = `${(fileObj.size / (1024 * 1024)).toFixed(1)} MB`;
      tipeSumber = 'file';
    } catch (e) {
      alert('Gagal menyimpan file ke penyimpanan browser. Pastikan ruang penyimpanan perangkat mencukupi.');
      return;
    }
  }

  const daftar = getDaftarMateri(jenis);
  daftar.unshift({
    id: idMateri,
    mapel: mapel,
    judul: judul,
    sumber: sumberData,
    namaFile: namaFileAsli,
    ukuran: ukuranFileMB,
    tipe: tipeSumber,
    tanggal: new Date().toLocaleDateString('id-ID')
  });

  localStorage.setItem(`ma_materi_${jenis}`, JSON.stringify(daftar));
  saveState();

  if (judulEl) judulEl.value = '';
  if (fileEl) fileEl.value = '';
  if (linkEl) linkEl.value = '';

  renderMateriKategori(jenis);
  showToast(`Materi "${judul}" berhasil ditambahkan ke ${jenis.toUpperCase()}!`);
}

async function bukaAtauUnduhFileMateri(idMateri, namaFileDefault) {
  try {
    const blob = await ambilBlobDariDB(idMateri);
    if (!blob) {
      alert('File tidak ditemukan di penyimpanan browser (mungkin data browser telah dibersihkan).');
      return;
    }
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = namaFileDefault || 'materi_pembelajaran';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (err) {
    alert('Gagal membuka file materi.');
  }
}

async function muatVideoDariIndexedDB(idMateri) {
  const videoEl = document.getElementById(`video-player-${idMateri}`);
  if (!videoEl || videoEl.dataset.loaded === 'true') return;

  try {
    const blob = await ambilBlobDariDB(idMateri);
    if (blob) {
      videoEl.src = URL.createObjectURL(blob);
      videoEl.dataset.loaded = 'true';
    }
  } catch (err) {
    console.warn('Gagal memuat video:', err);
  }
}

async function hapusMateriPembelajaran(jenis, idMateri) {
  if (!confirm('Yakin ingin menghapus materi pembelajaran ini?')) return;
  const target = getDaftarMateri(jenis).find(item => item.id === idMateri);
  if (target && target.tipe === 'file') {
    await hapusBlobDariDB(idMateri).catch(() => {});
  }
  const sisa = getDaftarMateri(jenis).filter(item => item.id !== idMateri);
  localStorage.setItem(`ma_materi_${jenis}`, JSON.stringify(sisa));
  saveState();
  renderMateriKategori(jenis);
  showToast('Materi pembelajaran dihapus', 'error');
}

function renderMateriKategori(jenis) {
  sinkronisasiDropdownMapel();

  const container = document.getElementById(`container-materi-${jenis}`);
  const filterSelect = document.getElementById(`filter-mapel-${jenis}`);
  if (!container) return;

  const isAdmin = isAkunGuruAtauAdmin();
  const filterMapel = filterSelect ? filterSelect.value : 'SEMUA';

  let daftar = getDaftarMateri(jenis);
  if (filterMapel !== 'SEMUA') {
    daftar = daftar.filter(item => item.mapel === filterMapel);
  }

  if (daftar.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
        Belum ada materi ${jenis.toUpperCase()} untuk pilihan mata pelajaran ini.
      </div>`;
    return;
  }

  if (jenis === 'video') {
    container.innerHTML = daftar.map(item => {
      const ytEmbed = item.tipe === 'link' ? formatUrlYouTubeEmbed(item.sumber) : null;
      let playerHtml = '';

      if (item.tipe === 'file') {
        if (item.sumber.startsWith('data:')) {
          playerHtml = `<video controls class="w-full h-48 rounded-xl bg-black object-contain"><source src="${item.sumber}"></video>`;
        } else {
          playerHtml = `<video id="video-player-${item.id}" controls preload="metadata" class="w-full h-48 rounded-xl bg-black object-contain"></video>`;
        }
      } else if (ytEmbed) {
        playerHtml = `<iframe src="${ytEmbed}" class="w-full h-48 rounded-xl" allowfullscreen></iframe>`;
      } else {
        playerHtml = `
          <a href="${item.sumber}" target="_blank" rel="noopener noreferrer" class="w-full h-36 rounded-xl bg-rose-50 border border-rose-200 flex flex-col items-center justify-center text-rose-700 hover:bg-rose-100 transition space-y-1.5">
            <i data-lucide="external-link" class="w-7 h-7"></i>
            <span class="text-xs font-bold">Buka Tautan Video Pembelajaran</span>
          </a>`;
      }

      return `
        <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold">${item.mapel}</span>
              ${isAdmin ? `
                <button onclick="hapusMateriPembelajaran('video', ${item.id})" title="Hapus Video" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>` : ''}
            </div>
            <h4 class="font-bold text-sm text-slate-800">${item.judul}</h4>
            ${playerHtml}
          </div>
          <div class="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-100">
            <span>${item.tipe === 'file' ? `${item.namaFile}${item.ukuran ? ` (${item.ukuran})` : ''}` : 'Tautan Video'}</span>
            <span>${item.tanggal}</span>
          </div>
        </div>`;
    }).join('');

    daftar.forEach(item => {
      if (item.tipe === 'file' && !item.sumber.startsWith('data:')) {
        muatVideoDariIndexedDB(item.id);
      }
    });
  } else {
    const warnaBadge = jenis === 'ebook' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
    const warnaTombol = jenis === 'ebook' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700';

    container.innerHTML = daftar.map(item => {
      const tombolAksi = item.tipe === 'file'
        ? (item.sumber.startsWith('data:')
            ? `<a href="${item.sumber}" download="${item.namaFile || item.judul}" class="w-full py-2 px-3 ${warnaTombol} text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5">
                 <i data-lucide="download" class="w-4 h-4"></i>
                 <span>Unduh / Buka ${jenis.toUpperCase()}</span>
               </a>`
            : `<button type="button" onclick="bukaAtauUnduhFileMateri(${item.id}, '${(item.namaFile || item.judul).replace(/'/g, "\\'")}')" class="w-full py-2 px-3 ${warnaTombol} text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5">
                 <i data-lucide="download" class="w-4 h-4"></i>
                 <span>Unduh / Buka ${jenis.toUpperCase()}</span>
               </button>`)
        : `<a href="${item.sumber}" target="_blank" rel="noopener noreferrer" class="w-full py-2 px-3 ${warnaTombol} text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5">
             <i data-lucide="external-link" class="w-4 h-4"></i>
             <span>Buka ${jenis.toUpperCase()}</span>
           </a>`;

      return `
        <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
          <div class="space-y-1.5">
            <div class="flex items-start justify-between gap-2">
              <span class="px-2.5 py-0.5 ${warnaBadge} rounded-md text-[10px] font-bold">${item.mapel}</span>
              ${isAdmin ? `
                <button onclick="hapusMateriPembelajaran('${jenis}', ${item.id})" title="Hapus Materi" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>` : ''}
            </div>
            <h4 class="font-bold text-sm text-slate-800 pt-1">${item.judul}</h4>
            <p class="text-[11px] text-slate-400">${item.tipe === 'file' ? `File: ${item.namaFile}${item.ukuran ? ` (${item.ukuran})` : ''}` : 'Tautan Eksternal'} • ${item.tanggal}</p>
          </div>

          <div class="pt-2 border-t border-slate-100">
            ${tombolAksi}
          </div>
        </div>
      `;
    }).join('');
  }

  if (window.lucide) lucide.createIcons();
}

// =========================================================================
// MANAJEMEN PENGUMUMAN MADRASAH (KOSONG DI AWAL)
// =========================================================================
function getDaftarPengumuman() {
  const saved = localStorage.getItem('ma_pengumuman_madrasah');
  let list = saved ? JSON.parse(saved) : [];

  const sekarang = Date.now();
  const listAktif = list.filter(item => !item.expiresAt || item.expiresAt > sekarang);

  if (saved !== null && listAktif.length !== list.length) {
    localStorage.setItem('ma_pengumuman_madrasah', JSON.stringify(listAktif));
  }

  return listAktif;
}

function toggleFormPengumuman() {
  if (!isAkunGuruAtauAdmin()) {
    showToast("Akses Ditolak! Hanya Admin / Guru yang dapat mengatur pengumuman.", "error");
    return;
  }
  const form = document.getElementById('form-tambah-pengumuman');
  if (form) {
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
      const inputJudul = document.getElementById('pengumuman-judul');
      if (inputJudul) inputJudul.focus();
    }
  }
}

function formatSisaDurasiPengumuman(expiresAt) {
  if (!expiresAt) return 'Permanen';
  const sisaMs = expiresAt - Date.now();
  if (sisaMs <= 0) return 'Berakhir';

  const sisaJam = Math.ceil(sisaMs / (1000 * 60 * 60));
  if (sisaJam < 24) return `Sisa ${sisaJam} jam`;
  const sisaHari = Math.ceil(sisaMs / (1000 * 60 * 60 * 24));
  return `Sisa ${sisaHari} hari`;
}

function renderPengumumanMadrasah() {
  const container = document.getElementById('container-pengumuman-madrasah');
  if (!container) return;

  const isAdmin = isAkunGuruAtauAdmin();
  const daftar = getDaftarPengumuman();

  if (!isAdmin) {
    const form = document.getElementById('form-tambah-pengumuman');
    if (form) form.classList.add('hidden');
  }

  if (daftar.length === 0) {
    container.innerHTML = `
      <div class="py-6 text-center text-xs text-slate-400 italic">
        Tidak ada pengumuman aktif saat ini.
      </div>`;
    return;
  }

  container.innerHTML = daftar.map(item => {
    const labelDurasi = formatSisaDurasiPengumuman(item.expiresAt);
    const badgeDurasi = item.expiresAt
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold">⏳ ${labelDurasi}</span>`
      : ``;

    return `
      <div class="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="font-bold text-sm text-emerald-800">${item.judul}</h4>
            ${isAdmin ? badgeDurasi : ''}
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">${item.isi}</p>
        </div>

        ${isAdmin ? `
          <button type="button" onclick="hapusPengumumanMadrasah(${item.id})" title="Hapus Pengumuman"
                  class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition shrink-0">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function tambahPengumumanMadrasah() {
  if (!isAkunGuruAtauAdmin()) {
    showToast("Akses Ditolak!", "error");
    return;
  }

  const inputJudul = document.getElementById('pengumuman-judul');
  const inputIsi = document.getElementById('pengumuman-isi');
  const selectDurasi = document.getElementById('pengumuman-durasi');

  const judul = inputJudul ? inputJudul.value.trim() : '';
  const isi = inputIsi ? inputIsi.value.trim() : '';
  const durasiHari = selectDurasi ? parseInt(selectDurasi.value, 10) : 7;

  if (!judul || !isi) {
    alert("Judul dan isi pengumuman wajib diisi!");
    return;
  }

  const expiresAt = durasiHari > 0
    ? Date.now() + (durasiHari * 24 * 60 * 60 * 1000)
    : null;

  const daftar = getDaftarPengumuman();
  daftar.unshift({
    id: Date.now(),
    judul: judul,
    isi: isi,
    durasiHari: durasiHari,
    expiresAt: expiresAt
  });

  localStorage.setItem('ma_pengumuman_madrasah', JSON.stringify(daftar));
  saveState();

  if (inputJudul) inputJudul.value = '';
  if (inputIsi) inputIsi.value = '';
  toggleFormPengumuman();
  renderPengumumanMadrasah();

  const infoDurasi = durasiHari > 0 ? `selama ${durasiHari} hari` : `secara permanen`;
  showToast(`Pengumuman "${judul}" diterbitkan (${infoDurasi})!`);
}

function hapusPengumumanMadrasah(idPengumuman) {
  if (!isAkunGuruAtauAdmin()) return;
  if (!confirm("Yakin ingin menghapus pengumuman ini?")) return;

  const sisa = getDaftarPengumuman().filter(p => p.id !== idPengumuman);
  localStorage.setItem('ma_pengumuman_madrasah', JSON.stringify(sisa));
  saveState();
  renderPengumumanMadrasah();
  showToast("Pengumuman berhasil dihapus", "error");
}

// =========================================================================
// GALERI FOTO & VIDEO SEKOLAH (KOSONG DI AWAL, BISA DIKELOLA ADMIN/GURU)
// =========================================================================
let indeksSlideGaleri = {};

function getDaftarGaleriVideo() {
  const saved = localStorage.getItem('ma_galeri_video');
  return saved ? JSON.parse(saved) : [];
}

function getDaftarGaleriFoto() {
  const saved = localStorage.getItem('ma_galeri_foto');
  return saved ? JSON.parse(saved) : [];
}

function toggleFormGaleri(jenis) {
  if (!isAkunGuruAtauAdmin()) {
    showToast("Akses Ditolak! Hanya Admin / Guru yang dapat mengelola galeri.", "error");
    return;
  }
  const formVideo = document.getElementById('form-galeri-video');
  const formFoto = document.getElementById('form-galeri-foto');

  if (jenis === 'video' && formVideo) {
    formVideo.classList.toggle('hidden');
    if (formFoto) formFoto.classList.add('hidden');
  } else if (jenis === 'foto' && formFoto) {
    formFoto.classList.toggle('hidden');
    if (formVideo) formVideo.classList.add('hidden');
  }
}

async function simpanVideoGaleri() {
  if (!isAkunGuruAtauAdmin()) return;

  const judulEl = document.getElementById('galeri-video-judul');
  const fileEl = document.getElementById('galeri-video-file');
  const linkEl = document.getElementById('galeri-video-link');
  const kanalEl = document.getElementById('galeri-video-yt-kanal');
  const deskripsiEl = document.getElementById('galeri-video-deskripsi');

  const judul = judulEl ? judulEl.value.trim() : '';
  const fileObj = fileEl && fileEl.files.length > 0 ? fileEl.files[0] : null;
  const linkManual = linkEl ? linkEl.value.trim() : '';
  const linkKanal = kanalEl ? kanalEl.value.trim() : '';
  const deskripsi = deskripsiEl ? deskripsiEl.value.trim() : '';

  if (!judul) {
    alert('Judul video wajib diisi!');
    if (judulEl) judulEl.focus();
    return;
  }

  if (!fileObj && !linkManual) {
    alert('Silakan pilih file video ATAU masukkan link video YouTube!');
    return;
  }

  const idVideo = Date.now();
  let sumberData = linkManual;
  let tipeSumber = 'link';

  if (fileObj) {
    const batasMaxBytes = 100 * 1024 * 1024;
    if (fileObj.size > batasMaxBytes) {
      alert(`Ukuran video (${(fileObj.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 100 MB!`);
      return;
    }
    try {
      await simpanBlobKeDB(`galeri_vid_${idVideo}`, fileObj);
      sumberData = `indexeddb://galeri_vid_${idVideo}`;
      tipeSumber = 'file';
    } catch (err) {
      alert('Gagal menyimpan file video ke penyimpanan browser.');
      return;
    }
  }

  const daftar = getDaftarGaleriVideo();
  daftar.unshift({
    id: idVideo,
    judul: judul,
    deskripsi: deskripsi || 'Dokumentasi kegiatan dan profil resmi MA-PLUS Al-ISLAM.',
    tipe: tipeSumber,
    sumber: sumberData,
    linkKanal: linkKanal
  });

  localStorage.setItem('ma_galeri_video', JSON.stringify(daftar));

  if (judulEl) judulEl.value = '';
  if (fileEl) fileEl.value = '';
  if (linkEl) linkEl.value = '';
  if (kanalEl) kanalEl.value = '';
  if (deskripsiEl) deskripsiEl.value = '';

  toggleFormGaleri('video');
  renderGaleriSekolah();
  showToast(`Video "${judul}" berhasil ditambahkan ke galeri!`);
}

async function hapusVideoGaleri(idVideo) {
  if (!isAkunGuruAtauAdmin()) return;
  if (!confirm('Yakin ingin menghapus video ini dari galeri sekolah?')) return;

  const daftar = getDaftarGaleriVideo();
  const target = daftar.find(v => v.id === idVideo);
  if (target && target.tipe === 'file') {
    await hapusBlobDariDB(`galeri_vid_${idVideo}`).catch(() => {});
  }

  const sisa = daftar.filter(v => v.id !== idVideo);
  localStorage.setItem('ma_galeri_video', JSON.stringify(sisa));
  renderGaleriSekolah();
  showToast('Video galeri berhasil dihapus', 'error');
}

function kompresFileGambarGaleri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const maxWidth = 1000;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function simpanFotoGaleri() {
  if (!isAkunGuruAtauAdmin()) return;

  const judulEl = document.getElementById('galeri-foto-judul');
  const filesEl = document.getElementById('galeri-foto-files');
  const ketEl = document.getElementById('galeri-foto-keterangan');

  const judul = judulEl ? judulEl.value.trim() : '';
  const files = filesEl ? Array.from(filesEl.files) : [];
  const keterangan = ketEl ? ketEl.value.trim() : '';

  if (!judul) {
    alert('Judul kegiatan/foto wajib diisi!');
    if (judulEl) judulEl.focus();
    return;
  }

  if (files.length === 0) {
    alert('Pilih minimal 1 file gambar untuk diunggah!');
    return;
  }

  const gambarValid = files.filter(f => f.type.startsWith('image/'));
  if (gambarValid.length === 0) {
    alert('Format file tidak didukung. Pilih file JPG, PNG, atau WEBP!');
    return;
  }

  try {
    const daftarDataUrl = [];
    for (const file of gambarValid) {
      const dataUrl = await kompresFileGambarGaleri(file);
      daftarDataUrl.push(dataUrl);
    }

    const daftar = getDaftarGaleriFoto();
    daftar.unshift({
      id: Date.now(),
      judul: judul,
      keterangan: keterangan || 'Dokumentasi kegiatan MA-PLUS Al-ISLAM.',
      fotos: daftarDataUrl
    });

    localStorage.setItem('ma_galeri_foto', JSON.stringify(daftar));

    if (judulEl) judulEl.value = '';
    if (filesEl) filesEl.value = '';
    if (ketEl) ketEl.value = '';

    toggleFormGaleri('foto');
    renderGaleriSekolah();
    showToast(`Berhasil menambahkan ${daftarDataUrl.length} foto ke galeri!`);
  } catch (err) {
    alert('Ukuran total foto terlalu besar untuk disimpan di browser. Kurangi jumlah foto dalam sekali unggah.');
  }
}

function hapusFotoGaleri(idKartu) {
  if (!isAkunGuruAtauAdmin()) return;
  if (!confirm('Yakin ingin menghapus kartu foto ini dari galeri?')) return;

  const sisa = getDaftarGaleriFoto().filter(item => item.id !== idKartu);
  localStorage.setItem('ma_galeri_foto', JSON.stringify(sisa));
  delete indeksSlideGaleri[idKartu];
  renderGaleriSekolah();
  showToast('Foto galeri berhasil dihapus', 'error');
}

function geserSlideFotoGaleri(idKartu, arah) {
  const daftar = getDaftarGaleriFoto();
  const item = daftar.find(f => f.id === idKartu);
  if (!item || !Array.isArray(item.fotos) || item.fotos.length <= 1) return;

  const total = item.fotos.length;
  const idxSekarang = indeksSlideGaleri[idKartu] || 0;
  const idxBaru = (idxSekarang + arah + total) % total;
  indeksSlideGaleri[idKartu] = idxBaru;

  const imgEl = document.getElementById(`galeri-img-${idKartu}`);
  const counterEl = document.getElementById(`galeri-counter-${idKartu}`);
  if (imgEl) imgEl.src = item.fotos[idxBaru];
  if (counterEl) counterEl.textContent = `${idxBaru + 1} / ${total}`;

  for (let i = 0; i < total; i++) {
    const dotEl = document.getElementById(`galeri-dot-${idKartu}-${i}`);
    if (dotEl) {
      dotEl.className = i === idxBaru
        ? 'w-2 h-2 rounded-full bg-white shadow transition-all'
        : 'w-1.5 h-1.5 rounded-full bg-white/50 transition-all';
    }
  }
}

async function muatVideoGaleriDariDB(idVideo) {
  const videoEl = document.getElementById(`galeri-video-player-${idVideo}`);
  if (!videoEl || videoEl.dataset.loaded === 'true') return;

  try {
    const blob = await ambilBlobDariDB(`galeri_vid_${idVideo}`);
    if (blob) {
      videoEl.src = URL.createObjectURL(blob);
      videoEl.dataset.loaded = 'true';
    }
  } catch (err) {
    console.warn('Gagal memuat video galeri:', err);
  }
}

function renderGaleriSekolah() {
  const containerVideo = document.getElementById('container-galeri-video');
  const containerFoto = document.getElementById('container-galeri-foto');
  const isAdmin = isAkunGuruAtauAdmin();

  if (containerVideo) {
    const daftarVideo = getDaftarGaleriVideo();
    if (daftarVideo.length === 0) {
      containerVideo.innerHTML = `
        <div class="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-400">
          Belum ada video dokumentasi sekolah.
        </div>`;
    } else {
      containerVideo.innerHTML = daftarVideo.map(vid => {
        const ytEmbed = vid.tipe === 'link' && vid.sumber ? formatUrlYouTubeEmbed(vid.sumber) : null;
        let mediaHtml = '';

        if (vid.tipe === 'file') {
          mediaHtml = `<video id="galeri-video-player-${vid.id}" controls preload="metadata" class="w-full h-56 sm:h-64 rounded-2xl bg-slate-900 object-contain"></video>`;
        } else if (ytEmbed) {
          mediaHtml = `<iframe src="${ytEmbed}" class="w-full h-56 sm:h-64 rounded-2xl bg-slate-900" allowfullscreen></iframe>`;
        } else {
          mediaHtml = `<video controls class="w-full h-56 sm:h-64 rounded-2xl bg-slate-900 object-contain"><source src="${vid.sumber || ''}"></video>`;
        }

        return `
          <div class="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative">
            <div class="lg:col-span-7">
              ${mediaHtml}
            </div>
            <div class="lg:col-span-5 space-y-3">
              <div class="flex items-center justify-between gap-2">
                <span class="px-2.5 py-1 rounded-md bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase tracking-wider">VIDEO PROFIL</span>
                ${isAdmin ? `
                  <button type="button" onclick="hapusVideoGaleri(${vid.id})" title="Hapus Video" class="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center space-x-1 transition">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    <span>Hapus</span>
                  </button>
                ` : ''}
              </div>
              <h3 class="text-base sm:text-lg font-extrabold text-slate-800">${vid.judul}</h3>
              <p class="text-xs text-slate-600 leading-relaxed">${vid.deskripsi}</p>
              ${vid.linkKanal ? `
                <div class="pt-1">
                  <a href="${vid.linkKanal}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition">
                    <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                    <span>Kunjungi Kanal YouTube Resmi Sekolah</span>
                  </a>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

      daftarVideo.forEach(vid => {
        if (vid.tipe === 'file') {
          muatVideoGaleriDariDB(vid.id);
        }
      });
    }
  }

  if (containerFoto) {
    const daftarFoto = getDaftarGaleriFoto();
    if (daftarFoto.length === 0) {
      containerFoto.innerHTML = `
        <div class="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-400">
          Belum ada dokumentasi foto di galeri sekolah.
        </div>`;
    } else {
      containerFoto.innerHTML = daftarFoto.map(item => {
        const listFoto = Array.isArray(item.fotos) && item.fotos.length > 0 ? item.fotos : [];
        const totalFoto = listFoto.length;
        const idxAktif = (indeksSlideGaleri[item.id] || 0) < totalFoto ? (indeksSlideGaleri[item.id] || 0) : 0;
        indeksSlideGaleri[item.id] = idxAktif;

        const hasMultiple = totalFoto > 1;

        return `
          <div class="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between group">
            <div class="relative h-52 bg-slate-100 overflow-hidden">
              <img id="galeri-img-${item.id}" src="${listFoto[idxAktif] || ''}" alt="${item.judul}" class="w-full h-full object-cover transition-all duration-300">

              ${isAdmin ? `
                <button type="button" onclick="hapusFotoGaleri(${item.id})" title="Hapus Kartu Foto" class="absolute top-3 right-3 p-2 rounded-xl bg-red-600/90 hover:bg-red-700 text-white shadow-md transition z-10">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              ` : ''}

              ${hasMultiple ? `
                <button type="button" onclick="geserSlideFotoGaleri(${item.id}, -1)" title="Foto Sebelumnya"
                        class="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center shadow transition z-10">
                  <i data-lucide="chevron-left" class="w-4 h-4"></i>
                </button>
                <button type="button" onclick="geserSlideFotoGaleri(${item.id}, 1)" title="Foto Selanjutnya"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center shadow transition z-10">
                  <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </button>

                <span id="galeri-counter-${item.id}" class="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">
                  ${idxAktif + 1} / ${totalFoto}
                </span>

                <div class="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/40">
                  ${listFoto.map((_, i) => `
                    <span id="galeri-dot-${item.id}-${i}" class="${i === idxAktif ? 'w-2 h-2 rounded-full bg-white shadow' : 'w-1.5 h-1.5 rounded-full bg-white/50'} transition-all"></span>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <div class="p-4 space-y-1">
              <h4 class="font-bold text-sm text-slate-800">${item.judul}</h4>
              <p class="text-xs text-slate-500 leading-relaxed">${item.keterangan}</p>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if (window.lucide) lucide.createIcons();
}

// =========================================================================
// MODAL PROFIL PEMBUAT / TIM PENGEMBANG
// =========================================================================
function openModalPembuat() {
  const modal = document.getElementById('modal-pembuat');
  if (modal) {
    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }
}

function closeModalPembuat() {
  const modal = document.getElementById('modal-pembuat');
  if (modal) modal.classList.add('hidden');
}

// =========================================================================
// INISIALISASI AWAL & KONTROL VISIBILITAS ADMIN/GURU
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
  terapkanLatarBelakangDashboard();
  muatFotoStrukturPimpinan();
  renderGaleriSekolah();

  if (Object.keys(getSemuaKuisPerKelas()).length > 0) {
    mulaiPemantauTimerGlobal();
  }

  const tglInput = document.getElementById('presensi-tanggal');
  if (tglInput && !tglInput.value) tglInput.valueAsDate = new Date();

  sinkronisasiDropdownMapel();
  renderDaftarMapel();
  renderDaftarTugas();
  renderPengumumanMadrasah();
  renderMateriKategori('ebook');
  renderMateriKategori('ppt');
  renderMateriKategori('video');
  updateVisibilitasDanStatistikMurid();
  perbaruiTampilanKelasGuru();

  const initialView = location.hash ? location.hash.replace('#', '') : 'dashboard';
  history.replaceState({ view: initialView }, '', '#' + initialView);
  navigateTo(initialView, true);

  sinkronkanAksesMenuMobile();
  if (window.lucide) lucide.createIcons();
});

setInterval(() => {
  sinkronkanAksesMenuMobile();
}, 300);

setInterval(() => {
  renderPengumumanMadrasah();
}, 60000);