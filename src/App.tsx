import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { Album, ArrowLeft, Check, ChevronLeft, Disc3, Heart, ImagePlus, ListMusic, LockKeyhole, LogOut, Menu, MoreHorizontal, Music2, Pause, Play, Plus, Repeat, Repeat1, RotateCcw, Search, Settings2, ShieldCheck, Shuffle, SkipBack, SkipForward, SlidersHorizontal, Trash2, Upload, Volume2, X } from 'lucide-react';
import { DEFAULT_SETTINGS, deleteMedia, getMediaUrl, loadSettings, loadSongs, persistSettings, persistSongs, saveMedia, type AppSettings, type Song } from './storage';

type View = 'all' | 'favorites';
type AdminTab = 'appearance' | 'music';
const ACCENTS = ['#d9a46b', '#a78bfa', '#fb7185', '#65b9aa', '#70a5f2'];

function useMedia(name?: string) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!name) { setUrl(''); return; }
    let alive = true;
    let objectUrl = '';
    getMediaUrl(name).then((value) => {
      objectUrl = value;
      if (alive) setUrl(value);
      else URL.revokeObjectURL(value);
    }).catch(() => { if (alive) setUrl(''); });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [name]);
  return url;
}

function Artwork({ name, className = '', iconSize = 28 }: { name?: string; className?: string; iconSize?: number }) {
  const url = useMedia(name);
  return <div className={`artwork relative flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
    {url ? <img src={url} alt="کاور آهنگ" className="h-full w-full object-cover" /> : <Disc3 size={iconSize} strokeWidth={1.15} className="relative z-10 opacity-80" />}
  </div>;
}

function formatTime(time: number) {
  if (!Number.isFinite(time)) return '۰:۰۰';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`.replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

// Offline access is device-local; the owner code is not printed in the UI.
function isOwner(username: string, password: string) {
  const expected = [21, 60, 63, 52, 63, 108, 107, 111, 101, 109];
  const actual = Array.from(password, (character) => character.charCodeAt(0) ^ 93);
  let difference = actual.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ (actual[i] ?? 0);
  return username.trim() === 'Habib' && difference === 0;
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [songs, setSongs] = useState<Song[]>(loadSongs);
  const [view, setView] = useState<View>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('appearance');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const shouldPlayRef = useRef(false);
  const heroUrl = useMedia(settings.heroName);
  const backgroundUrl = useMedia(settings.backgroundName);
  const logoUrl = useMedia(settings.logoName);
  const currentSong = songs.find((song) => song.id === selectedId) || null;
  const currentCoverUrl = useMedia(currentSong?.coverName);

  useEffect(() => {
    if (!selectedId && songs.length) setSelectedId(songs[0].id);
    if (selectedId && !songs.some((song) => song.id === selectedId)) {
      setSelectedId(songs[0]?.id || null);
      setPlaying(false);
    }
  }, [songs, selectedId]);

  useEffect(() => {
    let alive = true;
    let url = '';
    if (!currentSong) { setAudioUrl(''); return; }
    setAudioUrl('');
    setCurrentTime(0);
    setDuration(0);
    getMediaUrl(currentSong.fileName).then((value) => {
      url = value;
      if (alive) setAudioUrl(value);
      else URL.revokeObjectURL(value);
    }).catch(() => { if (alive) { setNotice('فایل این آهنگ در حافظه پیدا نشد. می‌توانید آن را دوباره اضافه کنید.'); setPlaying(false); } });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [currentSong?.id, currentSong?.fileName]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { document.title = `${settings.appName} | موسیقی آفلاین`; }, [settings.appName]);
  useEffect(() => { if (!notice) return; const timeout = window.setTimeout(() => setNotice(''), 4800); return () => window.clearTimeout(timeout); }, [notice]);

  function updateSettings(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    try { persistSettings(next); setSettings(next); }
    catch { setNotice('فضای ذخیره‌سازی تنظیمات در دسترس نیست.'); }
  }
  function updateSongs(next: Song[]) {
    try { persistSongs(next); setSongs(next); }
    catch { setNotice('فهرست آهنگ‌ها ذخیره نشد.'); }
  }
  function chooseSong(id: string) {
    shouldPlayRef.current = true;
    if (id === selectedId && audioRef.current && audioUrl) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setNotice('پخش آهنگ ممکن نشد. دوباره تلاش کنید.'));
    } else { setSelectedId(id); setPlaying(false); }
  }
  function togglePlay() {
    if (!currentSong) { setNotice('هنوز آهنگی به برنامه اضافه نشده است.'); return; }
    const audio = audioRef.current;
    if (!audio || !audioUrl) { shouldPlayRef.current = true; return; }
    if (audio.paused) audio.play().then(() => setPlaying(true)).catch(() => setNotice('پخش آهنگ ممکن نشد.'));
    else { audio.pause(); setPlaying(false); }
  }
  function stepSong(direction: 1 | -1) {
    if (!songs.length) return;
    const index = songs.findIndex((song) => song.id === selectedId);
    let nextIndex = (index + direction + songs.length) % songs.length;
    if (shuffle && direction === 1 && songs.length > 1) {
      nextIndex = (index + 1 + Math.floor(Math.random() * (songs.length - 1))) % songs.length;
    }
    chooseSong(songs[nextIndex].id);
  }
  function onEnded() {
    if (repeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => setPlaying(false));
    } else if (songs.length > 1) stepSong(1);
    else setPlaying(false);
  }
  function toggleFavorite(id: string) {
    updateSongs(songs.map((song) => song.id === id ? { ...song, favorite: !song.favorite } : song));
  }
  function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    if (isOwner(username, password)) {
      setAdminOpen(true); setLoginOpen(false); setLoginError(''); setPassword(''); setUsername('');
      setNotice('به پنل مدیریت خوش آمدید.');
    } else { setLoginError('نام کاربری یا رمز عبور صحیح نیست.'); setPassword(''); }
  }
  function logout() { setAdminOpen(false); setAdminTab('appearance'); setNotice('از حساب مدیریت خارج شدید.'); }

  async function addSongs(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setBusy(true);
    const added: Song[] = [];
    let failures = 0;
    for (const file of files) {
      if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i.test(file.name)) { failures++; continue; }
      try {
        const fileName = await saveMedia(file, 'song');
        added.push({ id: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim(), artist: 'هنرمند نامشخص', fileName, favorite: false, addedAt: Date.now() });
      } catch { failures++; }
    }
    if (added.length) updateSongs([...songs, ...added]);
    setBusy(false);
    setNotice(added.length ? `${added.length.toLocaleString('fa-IR')} آهنگ به کتابخانه اضافه شد.${failures ? ` ${failures.toLocaleString('fa-IR')} مورد اضافه نشد.` : ''}` : 'آهنگی اضافه نشد. فضای ذخیره‌سازی گوشی یا نوع فایل را بررسی کنید.');
  }
  async function uploadImage(event: ChangeEvent<HTMLInputElement>, field: 'backgroundName' | 'heroName' | 'logoName', oldName?: string) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setNotice('لطفاً یک تصویر انتخاب کنید.'); return; }
    setBusy(true);
    try {
      const name = await saveMedia(file, field);
      updateSettings({ [field]: name });
      await deleteMedia(oldName);
      setNotice('تصویر جدید ذخیره شد.');
    } catch { setNotice('ذخیره تصویر ممکن نشد. فضای خالی گوشی را بررسی کنید.'); }
    finally { setBusy(false); }
  }
  async function uploadCover(event: ChangeEvent<HTMLInputElement>, song: Song) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setNotice('لطفاً یک تصویر انتخاب کنید.'); return; }
    setBusy(true);
    try {
      const name = await saveMedia(file, 'cover');
      updateSongs(songs.map((item) => item.id === song.id ? { ...item, coverName: name } : item));
      await deleteMedia(song.coverName);
      setNotice('کاور آهنگ ذخیره شد.');
    } catch { setNotice('ذخیره کاور ممکن نشد.'); }
    finally { setBusy(false); }
  }
  async function removeSong() {
    const song = songs.find((item) => item.id === deleteTarget);
    setDeleteTarget(null);
    if (!song) return;
    if (selectedId === song.id) { audioRef.current?.pause(); setPlaying(false); setAudioUrl(''); }
    updateSongs(songs.filter((item) => item.id !== song.id));
    await Promise.all([deleteMedia(song.fileName), deleteMedia(song.coverName)]);
    setNotice('آهنگ از کتابخانه حذف شد.');
  }
  async function resetAppearance() {
    setResetOpen(false);
    const old = [settings.backgroundName, settings.heroName, settings.logoName];
    updateSettings({ ...DEFAULT_SETTINGS });
    await Promise.all(old.map((name) => deleteMedia(name)));
    setNotice('تنظیمات ظاهری به حالت اولیه برگشت. آهنگ‌ها حفظ شدند.');
  }

  const visibleSongs = songs.filter((song) => (view === 'all' || song.favorite) && `${song.title} ${song.artist}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const appStyle = { '--accent': settings.accent } as CSSProperties;
  return <div className={`app-shell ${settings.theme === 'light' ? 'theme-light' : ''}`} style={appStyle}>
    {backgroundUrl && <div className="fixed inset-0 z-0 bg-cover bg-center opacity-[0.12] pointer-events-none" style={{ backgroundImage: `url("${backgroundUrl}")` }} />}
    <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); if (shouldPlayRef.current) { shouldPlayRef.current = false; event.currentTarget.play().then(() => setPlaying(true)).catch(() => setNotice('برای پخش دوباره روی دکمه پخش بزنید.')); } }} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onEnded={onEnded} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
    <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col lg:flex-row">
      <aside className="hidden w-[250px] shrink-0 flex-col border-e border-app bg-panel/80 px-5 py-8 lg:flex xl:w-[270px]">
        <div className="mb-14 flex items-center gap-3 px-2"><div className="brand-mark">{logoUrl ? <img src={logoUrl} alt="لوگوی برنامه" className="h-full w-full object-cover" /> : <Music2 size={24} />}</div><div><div className="text-xl font-black tracking-tight">{settings.appName}</div><p className="text-xs text-muted">موسیقی، بی‌وقفه</p></div></div>
        <p className="mb-5 px-3 text-xs font-bold text-muted">کتابخانه شما</p>
        <button data-testid="nav-all" className={`side-link ${view === 'all' ? 'active' : ''}`} onClick={() => setView('all')}><Album size={20} /> همه آهنگ‌ها <span className="ms-auto text-xs opacity-60">{songs.length.toLocaleString('fa-IR')}</span></button>
        <button data-testid="nav-favorites" className={`side-link ${view === 'favorites' ? 'active' : ''}`} onClick={() => setView('favorites')}><Heart size={20} /> موردعلاقه‌ها</button>
        <div className="mt-auto rounded-2xl border border-app bg-raised p-5"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent"><Music2 size={18} /></div><p className="font-bold">موسیقی همیشه همراهته</p><p className="mt-2 text-xs leading-6 text-muted">آهنگ‌های ذخیره‌شده بدون اینترنت، همین‌جا روی گوشی پخش می‌شوند.</p></div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-[185px] lg:pb-[125px]">
        <header className="flex h-[76px] items-center justify-between gap-3 border-b border-app px-4 sm:px-8 lg:h-[88px] lg:px-10">
          <div className="flex min-w-0 items-center gap-3 lg:hidden"><button data-testid="mobile-menu" aria-label="باز کردن فهرست" onClick={() => setMobileMenu(!mobileMenu)} className="icon-button"><Menu size={22} /></button><div className="brand-mark !h-9 !w-9">{logoUrl ? <img src={logoUrl} alt="لوگو" className="h-full w-full object-cover" /> : <Music2 size={18} />}</div><span className="truncate text-lg font-black">{settings.appName}</span></div>
          <div className="hidden text-sm text-muted lg:block">خانه <ChevronLeft size={14} className="mx-1 inline" /> <span className="font-semibold text-main">کتابخانه موسیقی</span></div>
          <div className="flex items-center gap-2 sm:gap-3"><span className="hidden items-center gap-2 rounded-full border border-app px-4 py-2 text-xs text-muted sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" /> آماده برای پخش آفلاین</span><button data-testid="admin-entry" onClick={() => { setLoginError(''); setLoginOpen(true); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-app px-3 text-xs font-semibold text-main transition hover:border-accent hover:text-accent sm:px-4 sm:text-sm"><LockKeyhole size={16} /><span>ورود مدیر</span></button></div>
        </header>

        {mobileMenu && <nav className="absolute inset-x-4 top-[70px] z-30 rounded-2xl border border-app bg-panel p-2 shadow-2xl lg:hidden"><button data-testid="mobile-nav-all" onClick={() => { setView('all'); setMobileMenu(false); }} className="side-link w-full"><Album size={19} /> همه آهنگ‌ها</button><button data-testid="mobile-nav-favorites" onClick={() => { setView('favorites'); setMobileMenu(false); }} className="side-link w-full"><Heart size={19} /> موردعلاقه‌ها</button></nav>}

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div className="hero relative flex min-h-[260px] flex-col justify-center overflow-hidden rounded-[26px] p-6 sm:min-h-[300px] sm:p-10 lg:min-h-[340px] lg:p-12" style={heroUrl ? { backgroundImage: `linear-gradient(90deg, rgba(14,17,21,.90), rgba(14,17,21,.22)), url("${heroUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
            {!heroUrl && <div className="hero-orbit pointer-events-none absolute -left-20 -top-24 h-[440px] w-[440px] rounded-full border border-white/10 sm:left-auto sm:right-[-45px] sm:top-[-60px]"><div className="absolute inset-10 rounded-full border border-white/10" /><div className="absolute inset-20 rounded-full border border-white/10" /><div className="absolute inset-28 flex items-center justify-center rounded-full bg-black/20 text-white/20"><Disc3 size={105} strokeWidth={0.7} /></div></div>}
            <div className="relative z-10"><span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> حال خوب، همین‌جاست</span><h1 className="max-w-[500px] text-3xl font-black leading-[1.5] text-white sm:text-4xl lg:text-[42px]">موسیقی تو،<br /><span className="text-accent">هر جا که باشی.</span></h1><p className="mt-3 max-w-[420px] text-sm leading-7 text-white/70">آهنگ‌های محبوبت را با خودت داشته باش؛ بدون اینترنت، بدون وقفه.</p><button data-testid="hero-play" onClick={() => currentSong ? chooseSong(currentSong.id) : setNotice('برای شروع، مدیر باید آهنگ‌ها را به برنامه اضافه کند.')} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-[#151719] transition hover:brightness-110"><Play size={17} fill="currentColor" /> شروع پخش</button></div>
          </div>

          <section className="mt-10 sm:mt-12"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-bold text-accent">کتابخانه شخصی</p><h2 data-testid="library-heading" className="text-2xl font-black sm:text-3xl">{view === 'all' ? 'همه آهنگ‌ها' : 'موردعلاقه‌ها'}</h2></div><span data-testid="song-count" className="text-sm text-muted">{visibleSongs.length.toLocaleString('fa-IR')} آهنگ</span></div>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2"><button data-testid="filter-all" onClick={() => setView('all')} className={`filter-chip ${view === 'all' ? 'selected' : ''}`}>همه آهنگ‌ها</button><button data-testid="filter-favorites" onClick={() => setView('favorites')} className={`filter-chip ${view === 'favorites' ? 'selected' : ''}`}>موردعلاقه‌ها</button></div><label className="flex h-11 w-full items-center gap-2 rounded-xl border border-app bg-panel px-4 text-muted sm:max-w-[270px]"><Search size={17} /><input data-testid="search-songs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجو در آهنگ‌ها..." className="min-w-0 flex-1 bg-transparent text-sm text-main outline-none placeholder:text-muted" /></label></div>
            <div className="overflow-hidden rounded-2xl border border-app bg-panel"><div className="hidden grid-cols-[48px_1fr_1fr_50px] gap-3 border-b border-app px-5 py-3 text-xs text-muted sm:grid"><span>#</span><span>عنوان آهنگ</span><span>هنرمند</span><span className="text-center"><Heart size={15} /></span></div>
              {visibleSongs.length ? visibleSongs.map((song, index) => <div key={song.id} data-testid={`song-row-${song.id}`} className={`flex items-center gap-3 border-b border-app px-3 py-3 transition last:border-0 hover:bg-raised sm:grid sm:grid-cols-[48px_1fr_1fr_50px] sm:gap-3 sm:px-5 ${selectedId === song.id ? 'bg-accent-faint' : ''}`}><span className="hidden text-sm text-muted sm:block">{String(index + 1).padStart(2, '0').replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])}</span><button data-testid={`play-song-${song.id}`} onClick={() => chooseSong(song.id)} className="flex min-w-0 flex-1 items-center gap-3 text-start sm:flex-none"><Artwork name={song.coverName} className="h-12 w-12 rounded-lg" iconSize={22} /><span className="min-w-0"><span className={`block truncate text-sm font-bold ${selectedId === song.id ? 'text-accent' : ''}`}>{song.title}</span><span className="block truncate text-xs text-muted sm:hidden">{song.artist}</span></span></button><span className="hidden truncate text-sm text-muted sm:block">{song.artist}</span><button data-testid={`favorite-${song.id}`} onClick={() => toggleFavorite(song.id)} aria-label={song.favorite ? 'حذف از موردعلاقه‌ها' : 'افزودن به موردعلاقه‌ها'} className={`icon-button ms-auto ${song.favorite ? 'text-rose-400' : 'text-muted'}`}><Heart size={18} fill={song.favorite ? 'currentColor' : 'none'} /></button></div>) : <div data-testid="library-empty" className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-raised text-accent">{view === 'favorites' ? <Heart size={25} /> : <ListMusic size={25} />}</div><p className="font-bold">{search ? 'آهنگی با این نام پیدا نشد' : view === 'favorites' ? 'هنوز آهنگ موردعلاقه‌ای نداری' : 'کتابخانه هنوز خالیه'}</p><p className="mt-2 max-w-xs text-sm leading-7 text-muted">{search ? 'نام دیگری را جستجو کن.' : view === 'favorites' ? 'روی قلب کنار آهنگ‌ها بزن تا اینجا ببینیشان.' : 'مدیر برنامه می‌تواند آهنگ‌ها را از حافظه گوشی اضافه کند.'}</p></div>}</div>
          </section>
        </main>
      </div>
    </div>

    <div className="player-bar fixed inset-x-0 bottom-0 z-40 border-t border-app bg-panel/95 backdrop-blur-2xl"><div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-4 pt-3 sm:px-8 lg:flex-row lg:items-center lg:gap-6 lg:px-8 lg:py-4"><div className="flex min-w-0 items-center gap-3 lg:w-[27%]"><Artwork name={currentSong?.coverName} className="h-12 w-12 rounded-xl sm:h-14 sm:w-14" iconSize={23} /><div className="min-w-0 flex-1"><p data-testid="now-playing-title" className="truncate text-sm font-bold">{currentSong?.title || 'آهنگی انتخاب نشده'}</p><p className="mt-0.5 truncate text-xs text-muted">{currentSong?.artist || 'کتابخانه موسیقی شما'}</p></div>{currentSong && <button data-testid="player-favorite" onClick={() => toggleFavorite(currentSong.id)} aria-label="موردعلاقه" className={`icon-button lg:hidden ${currentSong.favorite ? 'text-rose-400' : 'text-muted'}`}><Heart size={18} fill={currentSong.favorite ? 'currentColor' : 'none'} /></button>}</div>
      <div className="flex flex-1 flex-col gap-1"><div className="flex items-center justify-center gap-2 sm:gap-4"><button data-testid="shuffle" onClick={() => setShuffle(!shuffle)} aria-label="پخش تصادفی" aria-pressed={shuffle} className={`icon-button ${shuffle ? 'text-accent' : 'text-muted'}`}><Shuffle size={18} /></button><button data-testid="previous" onClick={() => stepSong(-1)} aria-label="آهنگ قبلی" className="icon-button"><SkipForward size={21} fill="currentColor" /></button><button data-testid="play-pause" onClick={togglePlay} aria-label={playing ? 'توقف' : 'پخش'} className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-[#151719] transition hover:scale-105">{playing ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}</button><button data-testid="next" onClick={() => stepSong(1)} aria-label="آهنگ بعدی" className="icon-button"><SkipBack size={21} fill="currentColor" /></button><button data-testid="repeat" onClick={() => setRepeat(!repeat)} aria-label="تکرار آهنگ" aria-pressed={repeat} className={`icon-button ${repeat ? 'text-accent' : 'text-muted'}`}>{repeat ? <Repeat1 size={19} /> : <Repeat size={19} />}</button></div><div className="flex items-center gap-2 text-[11px] text-muted"><span data-testid="current-time" className="w-9 text-center">{formatTime(currentTime)}</span><input data-testid="seek" aria-label="جابه‌جایی در آهنگ" type="range" min="0" max={duration || 1} value={Math.min(currentTime, duration || 1)} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value); }} className="range-input min-w-0 flex-1" /><span data-testid="duration" className="w-9 text-center">{formatTime(duration)}</span></div></div><div className="hidden items-center justify-end gap-2 text-muted lg:flex lg:w-[27%]"><Volume2 size={19} /><input data-testid="volume" aria-label="بلندی صدا" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="range-input w-24 xl:w-32" /></div></div></div>

    {notice && <div data-testid="notice" role="status" className="fixed bottom-[185px] left-4 right-4 z-[80] mx-auto max-w-md rounded-xl border border-app bg-raised px-4 py-3 text-center text-sm shadow-xl lg:bottom-[105px]">{notice}</div>}

    {loginOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setLoginOpen(false); }}><div role="dialog" aria-modal="true" aria-label="ورود مدیر" className="modal-card max-w-[420px]"><div className="mb-7 flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent"><ShieldCheck size={25} /></div><button data-testid="close-login" onClick={() => setLoginOpen(false)} aria-label="بستن" className="icon-button"><X size={20} /></button></div><h2 className="text-2xl font-black">ورود به مدیریت</h2><p className="mt-2 text-sm leading-7 text-muted">این بخش مخصوص مالک برنامه است.</p><form onSubmit={submitLogin} className="mt-7 space-y-4"><label className="block text-sm font-semibold">نام کاربری<input data-testid="admin-username" autoComplete="username" value={username} onChange={(event) => { setUsername(event.target.value); setLoginError(''); }} className="form-input mt-2" placeholder="نام کاربری مدیر" required /></label><label className="block text-sm font-semibold">رمز عبور<input data-testid="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setLoginError(''); }} className="form-input mt-2" placeholder="رمز عبور" required /></label>{loginError && <p data-testid="login-error" role="alert" className="text-sm text-rose-400">{loginError}</p>}<button data-testid="admin-login" type="submit" className="primary-button w-full">ورود به پنل <ArrowLeft size={18} /></button></form></div></div>}

    {adminOpen && <div className="admin-overlay fixed inset-0 z-[60] overflow-y-auto bg-app"><div className="mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col lg:flex-row"><aside className="w-full shrink-0 border-b border-app bg-panel px-4 py-4 sm:px-6 lg:min-h-dvh lg:w-[255px] lg:border-b-0 lg:border-e lg:px-5 lg:py-8"><div className="flex items-center justify-between lg:mb-12"><div className="flex items-center gap-3"><div className="brand-mark"><SlidersHorizontal size={20} /></div><div><p className="font-black">پنل مدیریت</p><p className="text-xs text-muted">{settings.appName}</p></div></div><button data-testid="admin-close" onClick={logout} aria-label="بستن مدیریت" className="icon-button lg:hidden"><X size={20} /></button></div><div className="mt-5 flex gap-2 lg:mt-0 lg:flex-col"><button data-testid="admin-tab-appearance" onClick={() => setAdminTab('appearance')} className={`side-link min-w-0 flex-1 lg:flex-none ${adminTab === 'appearance' ? 'active' : ''}`}><Settings2 size={19} /><span className="truncate">ظاهر برنامه</span></button><button data-testid="admin-tab-music" onClick={() => setAdminTab('music')} className={`side-link min-w-0 flex-1 lg:flex-none ${adminTab === 'music' ? 'active' : ''}`}><ListMusic size={19} /><span className="truncate">مدیریت آهنگ‌ها</span></button></div><div className="mt-6 hidden border-t border-app pt-5 lg:block"><button data-testid="admin-logout" onClick={logout} className="side-link w-full text-rose-400"><LogOut size={19} /> خروج از حساب</button></div></aside>
      <div className="min-w-0 flex-1 px-4 py-7 sm:px-8 lg:px-12 lg:py-10"><div className="mx-auto max-w-[960px]"><div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-bold text-accent">حساب مدیر اصلی / Habib</p><h1 className="text-2xl font-black sm:text-3xl">{adminTab === 'appearance' ? 'تنظیمات ظاهری' : 'مدیریت آهنگ‌ها'}</h1><p className="mt-2 text-sm leading-7 text-muted">{adminTab === 'appearance' ? 'ظاهر و هویت برنامه را به سلیقه خودت تغییر بده. تغییرات خودکار ذخیره می‌شوند.' : 'آهنگ‌ها را از حافظه دستگاه اضافه و اطلاعاتشان را ویرایش کن.'}</p></div><button data-testid="admin-back" onClick={logout} className="hidden min-h-11 items-center gap-2 rounded-xl border border-app px-4 text-sm hover:border-accent lg:flex"><ArrowLeft size={17} /> بازگشت به برنامه</button></div>
      {adminTab === 'appearance' ? <div className="space-y-6"><div className="admin-card"><div className="section-heading"><div className="section-icon"><Music2 size={20} /></div><div><h2 className="font-bold">هویت برنامه</h2><p className="text-sm text-muted">نام و نشان داخل برنامه را شخصی‌سازی کن.</p></div></div><div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold">نام نمایشی برنامه<input data-testid="app-name-input" value={settings.appName} maxLength={30} onChange={(event) => updateSettings({ appName: event.target.value })} className="form-input mt-2" placeholder="نام برنامه" /><span className="mt-2 block text-xs font-normal text-muted">نام داخل برنامه و عنوان صفحه تغییر می‌کند.</span></label><div><p className="mb-2 text-sm font-semibold">لوگوی داخل برنامه</p><label data-testid="upload-logo" className="upload-tile"><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-accent-soft text-accent">{logoUrl ? <img src={logoUrl} alt="لوگوی فعلی" className="h-full w-full object-cover" /> : <ImagePlus size={20} />}</div><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">انتخاب از گالری</span><span className="block text-xs text-muted">تصویر دلخواهت را انتخاب کن</span></span><Plus size={18} className="text-muted" /><input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(event) => uploadImage(event, 'logoName', settings.logoName)} /></label></div></div></div>
      <div className="admin-card"><div className="section-heading"><div className="section-icon"><ImagePlus size={20} /></div><div><h2 className="font-bold">تصاویر برنامه</h2><p className="text-sm text-muted">برای پس‌زمینه و تصویر صفحه اصلی عکس انتخاب کن.</p></div></div><div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"><div><div className="image-preview" style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>{!backgroundUrl && <Disc3 size={34} className="opacity-50" />}</div><div className="mt-3 flex items-center justify-between gap-2"><span className="text-sm font-semibold">پس‌زمینه برنامه</span><label data-testid="upload-background" className="small-upload">تغییر تصویر<input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(event) => uploadImage(event, 'backgroundName', settings.backgroundName)} /></label></div></div><div><div className="image-preview hero-mini" style={heroUrl ? { backgroundImage: `url("${heroUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>{!heroUrl && <Music2 size={34} className="opacity-50" />}</div><div className="mt-3 flex items-center justify-between gap-2"><span className="text-sm font-semibold">تصویر صفحه اصلی</span><label data-testid="upload-hero" className="small-upload">تغییر تصویر<input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(event) => uploadImage(event, 'heroName', settings.heroName)} /></label></div></div></div></div>
      <div className="admin-card"><div className="section-heading"><div className="section-icon"><SlidersHorizontal size={20} /></div><div><h2 className="font-bold">رنگ و قالب</h2><p className="text-sm text-muted">حالت روشن یا تیره و رنگ اصلی را انتخاب کن.</p></div></div><div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2"><div><p className="mb-3 text-sm font-semibold">قالب برنامه</p><div className="flex gap-3"><button data-testid="theme-dark" onClick={() => updateSettings({ theme: 'dark' })} className={`theme-option bg-[#17191e] text-white ${settings.theme === 'dark' ? 'chosen' : ''}`}>تیره {settings.theme === 'dark' && <Check size={16} />}</button><button data-testid="theme-light" onClick={() => updateSettings({ theme: 'light' })} className={`theme-option bg-[#f5f3ef] text-[#232323] ${settings.theme === 'light' ? 'chosen' : ''}`}>روشن {settings.theme === 'light' && <Check size={16} />}</button></div></div><div><p className="mb-3 text-sm font-semibold">رنگ اصلی</p><div className="flex flex-wrap gap-3">{ACCENTS.map((accent) => <button key={accent} data-testid={`accent-${accent.slice(1)}`} onClick={() => updateSettings({ accent })} aria-label={`انتخاب رنگ ${accent}`} className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-transparent transition hover:scale-110" style={{ backgroundColor: accent, outline: settings.accent === accent ? `2px solid ${accent}` : undefined, outlineOffset: 3 }}>{settings.accent === accent && <Check size={19} className="text-[#1b1b1b]" />}</button>)}</div></div></div></div>
      <div className="admin-card flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-bold">بازگشت به ظاهر اولیه</h2><p className="mt-1 text-sm leading-7 text-muted">نام، لوگو، تصاویر، رنگ و قالب بازنشانی می‌شوند؛ آهنگ‌ها باقی می‌مانند.</p></div><button data-testid="reset-settings" onClick={() => setResetOpen(true)} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-app px-4 text-sm font-semibold hover:border-accent"><RotateCcw size={17} /> بازنشانی ظاهر</button></div></div> : <div className="space-y-6"><div className="admin-card flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="section-heading"><div className="section-icon"><Upload size={20} /></div><div><h2 className="font-bold">افزودن آهنگ</h2><p className="text-sm leading-7 text-muted">فایل‌های صوتی گوشی را انتخاب کن؛ در همین دستگاه ذخیره می‌شوند.</p></div></div></div><button data-testid="add-songs" disabled={busy} onClick={() => audioInputRef.current?.click()} className="primary-button shrink-0"><Plus size={19} /> {busy ? 'در حال ذخیره...' : 'انتخاب آهنگ‌ها'}</button><input ref={audioInputRef} data-testid="audio-file-input" type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus" multiple className="sr-only" onChange={addSongs} /></div><div className="admin-card"><div className="mb-5 flex items-center justify-between gap-2"><div><h2 className="font-bold">فهرست آهنگ‌ها</h2><p data-testid="admin-song-count" className="mt-1 text-sm text-muted">{songs.length.toLocaleString('fa-IR')} آهنگ ذخیره‌شده</p></div><MoreHorizontal size={20} className="text-muted" /></div>{songs.length ? <div className="space-y-3">{songs.map((song) => <div key={song.id} data-testid={`admin-song-${song.id}`} className="rounded-xl border border-app bg-raised p-3 sm:p-4"><div className="flex items-start gap-3"><Artwork name={song.coverName} className="h-12 w-12 rounded-lg" iconSize={20} /><div className="min-w-0 flex-1"><input data-testid={`edit-title-${song.id}`} aria-label="نام آهنگ" value={song.title} onChange={(event) => updateSongs(songs.map((item) => item.id === song.id ? { ...item, title: event.target.value } : item))} className="w-full bg-transparent text-sm font-bold outline-none focus:text-accent" /><input data-testid={`edit-artist-${song.id}`} aria-label="نام هنرمند" value={song.artist} onChange={(event) => updateSongs(songs.map((item) => item.id === song.id ? { ...item, artist: event.target.value } : item))} className="mt-1 w-full bg-transparent text-xs text-muted outline-none focus:text-accent" /></div><button data-testid={`delete-song-${song.id}`} onClick={() => setDeleteTarget(song.id)} aria-label="حذف آهنگ" className="icon-button text-rose-400"><Trash2 size={18} /></button></div><label data-testid={`upload-cover-${song.id}`} className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-app px-3 text-xs font-semibold transition hover:border-accent"><ImagePlus size={15} /> تغییر کاور<input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(event) => uploadCover(event, song)} /></label></div>)}</div> : <div className="flex flex-col items-center gap-3 py-12 text-center text-muted"><ListMusic size={32} /><p className="text-sm">هنوز آهنگی اضافه نشده است.</p></div>}</div><button data-testid="admin-logout-mobile" onClick={logout} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-app text-sm text-rose-400 lg:hidden"><LogOut size={18} /> خروج از حساب</button></div>}
      {adminTab === 'appearance' && <button data-testid="admin-logout-mobile" onClick={logout} className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-app text-sm text-rose-400 lg:hidden"><LogOut size={18} /> خروج از حساب</button>}
      </div></div></div></div>}

    {deleteTarget && <div className="modal-backdrop !z-[90]"><div role="dialog" aria-modal="true" className="modal-card max-w-[400px]"><h2 className="text-xl font-black">حذف آهنگ؟</h2><p className="mt-3 text-sm leading-7 text-muted">فایل این آهنگ هم از حافظه مخصوص برنامه در این دستگاه پاک می‌شود.</p><div className="mt-6 flex gap-3"><button data-testid="cancel-delete" onClick={() => setDeleteTarget(null)} className="secondary-button flex-1">انصراف</button><button data-testid="confirm-delete" onClick={removeSong} className="danger-button flex-1">حذف آهنگ</button></div></div></div>}
    {resetOpen && <div className="modal-backdrop !z-[90]"><div role="dialog" aria-modal="true" className="modal-card max-w-[400px]"><h2 className="text-xl font-black">بازنشانی ظاهر؟</h2><p className="mt-3 text-sm leading-7 text-muted">تنظیمات ظاهری پاک می‌شوند اما آهنگ‌ها و علاقه‌مندی‌ها حفظ خواهند شد.</p><div className="mt-6 flex gap-3"><button data-testid="cancel-reset" onClick={() => setResetOpen(false)} className="secondary-button flex-1">انصراف</button><button data-testid="confirm-reset" onClick={resetAppearance} className="primary-button flex-1">بازنشانی</button></div></div></div>}
  </div>;
}

export default App;
