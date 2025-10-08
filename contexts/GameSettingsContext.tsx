'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface GameSettings {
  bloodEffects: boolean;
  screenShake: boolean;
  vignetteEffect: boolean;
  musicVolume: number;
  soundVolume: number;
  masterVolume: number;
}

interface GameSettingsContextType {
  settings: GameSettings;
  updateSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
}

const GameSettingsContext = createContext<GameSettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: GameSettings = {
  bloodEffects: true,
  screenShake: true,
  vignetteEffect: true,
  musicVolume: 0.3,
  soundVolume: 0.5,
  masterVolume: 1,
};

// Provider component
export const GameSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on initial render
  useEffect(() => {
    const savedSettings = localStorage.getItem('policeStoriesGameSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('policeStoriesGameSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <GameSettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </GameSettingsContext.Provider>
  );
};

export const useGameSettings = () => {
  const context = useContext(GameSettingsContext);
  if (context === undefined) {
    throw new Error('useGameSettings must be used within a GameSettingsProvider');
  }
  return context;
};