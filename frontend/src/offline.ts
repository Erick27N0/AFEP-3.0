import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'offline_module_';
const INDEX_KEY = 'offline_modules_index';

export type OfflineModule = {
  module_id: string;
  title: string;
  summary: string;
  duration: string;
  icon: string;
  sections: { title: string; content: string }[];
  saved_at: number;
};

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
