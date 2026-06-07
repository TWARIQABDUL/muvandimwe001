import { useState, useEffect } from 'react';
import { Browser } from '@capacitor/browser';

// Replace this with your actual Supabase bucket URL
const UPDATE_CHECK_URL = import.meta.env.VITE_UPDATE_URL || 'https://your-supabase-project.supabase.co/storage/v1/object/public/updates/version.json';

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      // 1. Fetch the version.json file from your public storage
      // We append a timestamp query parameter to bypass browser/CDN caching
      const response = await fetch(`${UPDATE_CHECK_URL}?t=${new Date().getTime()}`);
      if (!response.ok) return;

      const data = await response.json();
      const currentVersion = __APP_VERSION__; // Defined in vite.config.js from package.json
      
      // 2. Compare versions
      if (isNewerVersion(currentVersion, data.version)) {
        setUpdateInfo(data);
        setUpdateAvailable(true);
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
    }
  };

  const isNewerVersion = (current, remote) => {
    // Simple semver comparison (e.g. 1.0.0 vs 1.0.1)
    const curParts = current.split('.').map(Number);
    const remParts = remote.split('.').map(Number);
    
    for (let i = 0; i < Math.max(curParts.length, remParts.length); i++) {
      const cur = curParts[i] || 0;
      const rem = remParts[i] || 0;
      if (rem > cur) return true;
      if (cur > rem) return false;
    }
    return false;
  };

  const downloadUpdate = async () => {
    if (!updateInfo || !updateInfo.url) return;
    
    try {
      // 3. Use Capacitor Browser plugin to trigger the system download manager
      // This is the most reliable way to download and trigger an APK install intent
      await Browser.open({ url: updateInfo.url });
      
      // Hide modal after they click download
      setUpdateAvailable(false);
    } catch (err) {
      console.error('Failed to open download link:', err);
      // Fallback
      window.open(updateInfo.url, '_blank');
    }
  };

  return { updateAvailable, updateInfo, downloadUpdate, ignoreUpdate: () => setUpdateAvailable(false) };
}
