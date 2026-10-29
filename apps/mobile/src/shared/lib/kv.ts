/** Synchronous key-value storage backed by SQLite (expo-sqlite/kv-store). */
import Storage from 'expo-sqlite/kv-store';

export const kv = {
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => {
    Storage.removeItemSync(key);
  },
};
