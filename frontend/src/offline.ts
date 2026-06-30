import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'offline_module_';
const INDEX_KEY = 'offline_modules_index';
const PROGRESS_KEY = 'training_progress';
const FAVORITES_KEY = 'user_favorites';

export type OfflineModule = {
  module_id: string;
  title: string;
  summary: string;
  duration: string;
  icon: string;
  sections: { title: string; content: string }[];
  saved_at: number;
};

export type TrainingProgress = {
  completed: boolean;
  completed_at: number | null;
  updated_at: number;
};

export type TrainingProgressMap = Record<string, TrainingProgress>;
export type FavoriteKind = 'module' | 'donor' | 'opportunity';

export type FavoriteItem = {
  id: string;
  kind: FavoriteKind;
  title: string;
  subtitle?: string;
  description?: string;
  href?: string;
  saved_at: number;
};

export type FavoritesMap = Record<FavoriteKind, Record<string, FavoriteItem>>;

export async function saveModule(mod: Omit<OfflineModule, 'saved_at'>) {
  const payload: OfflineModule = { ...mod, saved_at: Date.now() };
  await AsyncStorage.setItem(KEY_PREFIX + mod.module_id, JSON.stringify(payload));
  const idx = await getIndex();
  if (!idx.includes(mod.module_id)) {
    idx.push(mod.module_id);
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(idx));
  }
}

export async function getModule(module_id: string): Promise<OfflineModule | null> {
  const raw = await AsyncStorage.getItem(KEY_PREFIX + module_id);
  return raw ? JSON.parse(raw) : null;
}

export async function removeModule(module_id: string) {
  await AsyncStorage.removeItem(KEY_PREFIX + module_id);
  const idx = await getIndex();
  const next = idx.filter((x) => x !== module_id);
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
}

export async function getIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getProgress(): Promise<TrainingProgressMap> {
  const raw = await AsyncStorage.getItem(PROGRESS_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function getModuleProgress(module_id: string): Promise<TrainingProgress> {
  const progress = await getProgress();
  return progress[module_id] ?? {
    completed: false,
    completed_at: null,
    updated_at: 0,
  };
}

export async function setModuleCompleted(module_id: string, completed: boolean) {
  const progress = await getProgress();
  const now = Date.now();
  progress[module_id] = {
    completed,
    completed_at: completed ? now : null,
    updated_at: now,
  };
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  return progress[module_id];
}

function emptyFavorites(): FavoritesMap {
  return { module: {}, donor: {}, opportunity: {} };
}

export async function getFavorites(): Promise<FavoritesMap> {
  const raw = await AsyncStorage.getItem(FAVORITES_KEY);
  return raw ? { ...emptyFavorites(), ...JSON.parse(raw) } : emptyFavorites();
}

export async function getFavoriteList(kind?: FavoriteKind): Promise<FavoriteItem[]> {
  const favorites = await getFavorites();
  const items = kind
    ? Object.values(favorites[kind])
    : Object.values(favorites).flatMap((bucket) => Object.values(bucket));
  return items.sort((a, b) => b.saved_at - a.saved_at);
}

export async function isFavorite(kind: FavoriteKind, id: string): Promise<boolean> {
  const favorites = await getFavorites();
  return Boolean(favorites[kind][id]);
}

export async function toggleFavorite(item: Omit<FavoriteItem, 'saved_at'>): Promise<boolean> {
  const favorites = await getFavorites();
  const bucket = favorites[item.kind];
  if (bucket[item.id]) {
    delete bucket[item.id];
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return false;
  }
  bucket[item.id] = { ...item, saved_at: Date.now() };
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return true;
}
