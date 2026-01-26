import { useState, useEffect, useCallback } from 'react';

export function useSettings() {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const loadSettings = useCallback(async () => {
        try {
            const data = await window.electron.getSettings();
            setSettings(data);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const updateSettings = async (updates: Partial<UserSettings>) => {
        try {
            const updated = await window.electron.updateSettings(updates);
            setSettings(updated);
            return updated;
        } catch (error) {
            console.error('Failed to update settings:', error);
            throw error;
        }
    };

    return {
        settings,
        loading,
        updateSettings,
        reload: loadSettings
    };
}
