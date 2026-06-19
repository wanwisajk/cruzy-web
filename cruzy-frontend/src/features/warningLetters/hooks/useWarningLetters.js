import { useCallback, useEffect, useState } from 'react';
import { warningLetterService } from '../services/warningLetterService.js';

export function useWarningLetters() {
  const [warningLetters, setWarningLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchWarningLetters = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await warningLetterService.getWarningLetters();
      setWarningLetters(Array.isArray(data) ? data : []);
    } catch (err) {
      if (silent) {
        console.error('Warning letters auto-refresh failed:', err);
      } else {
        setError(err.message || 'ไม่สามารถโหลดหนังสือเตือนได้');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarningLetters();
  }, [fetchWarningLetters]);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const tick = async () => {
      if (disposed || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        await fetchWarningLetters({ silent: true });
      } finally {
        inFlight = false;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const interval = window.setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchWarningLetters]);

  const createWarningLetter = useCallback(async (payload) => {
    setSaving(true);
    setError('');
    try {
      await warningLetterService.createWarningLetter(payload);
      await fetchWarningLetters();
    } catch (err) {
      setError(err.message || 'ไม่สามารถออกหนังสือเตือนได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchWarningLetters]);

  const updateWarningLetter = useCallback(async (id, payload) => {
    setSaving(true);
    setError('');
    try {
      await warningLetterService.updateWarningLetter(id, payload);
      await fetchWarningLetters();
    } catch (err) {
      setError(err.message || 'ไม่สามารถอัปเดตหนังสือเตือนได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchWarningLetters]);

  const deleteWarningLetter = useCallback(async (id) => {
    setSaving(true);
    setError('');
    try {
      await warningLetterService.deleteWarningLetter(id);
      await fetchWarningLetters();
    } catch (err) {
      setError(err.message || 'ไม่สามารถลบหนังสือเตือนได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchWarningLetters]);

  return {
    warningLetters,
    loading,
    saving,
    error,
    refreshWarningLetters: fetchWarningLetters,
    createWarningLetter,
    updateWarningLetter,
    deleteWarningLetter
  };
}
