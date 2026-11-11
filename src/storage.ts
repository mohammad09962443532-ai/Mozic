export type Song = {
  id: string;
  title: string;
  artist: string;
  fileName: string;
  coverName?: string;
  favorite: boolean;
  addedAt: number;
};

export type AppSettings = {
  appName: string;
  accent: string;
  theme: 'dark' | 'light';
  backgroundName?: string;
  heroName?: string;
  logoName?: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  appName: 'نوا',
  accent: '#d9a46b',
  theme: 'dark',
};

const SONGS_KEY = 'nava.offline.songs.v1';
const SETTINGS_KEY = 'nava.offline.settings.v1';

export function loadSongs(): Song[] {
  try {
    const value = JSON.parse(localStorage.getItem(SONGS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is Song => typeof item?.id === 'string' && typeof item?.fileName === 'string') : [];
  } catch {
    return [];
  }
}

export function persistSongs(songs: Song[]) {
  localStorage.setItem(SONGS_KEY, JSON.stringify(songs));
}

export function loadSettings(): AppSettings {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { ...DEFAULT_SETTINGS, ...value };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function persistSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

async function getFolder(): Promise<FileSystemDirectoryHandle> {
  if (!navigator.storage?.getDirectory) throw new Error('offline-storage-unavailable');
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle('nava-media', { create: true });
}

export async function saveMedia(file: File, prefix: string): Promise<string> {
  const folder = await getFolder();
  const safeExtension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
  const name = `${prefix}-${crypto.randomUUID()}.${safeExtension}`;
  const handle = await folder.getFileHandle(name, { create: true });
  try {
    const writer = await handle.createWritable();
    await writer.write(file);
    await writer.close();
    return name;
  } catch (error) {
    await folder.removeEntry(name).catch(() => undefined);
    throw error;
  }
}

export async function getMediaUrl(name: string): Promise<string> {
  const folder = await getFolder();
  const handle = await folder.getFileHandle(name);
  const file = await handle.getFile();
  return URL.createObjectURL(file);
}

export async function deleteMedia(name?: string) {
  if (!name) return;
  try {
    const folder = await getFolder();
    await folder.removeEntry(name);
  } catch {
    // The file may already have been removed by the device.
  }
}
