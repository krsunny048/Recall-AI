import { useEffect, useState } from "react";
function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Could not persist ${key} to localStorage.`, error);
    }
  }, [key, value]);
  return [value, setValue];
}
export {
  useLocalStorageState
};
