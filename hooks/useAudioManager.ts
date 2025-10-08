import { useEffect, useRef, useCallback } from 'react';

type SoundType = 
  | 'laser_shot_1'
  | 'pick_up_1'
  | 'pistol_shot'
  | 'player_hit_1'
  | 'power_up_1'
  | 'power_up_2'
  | 'reload_rifle'
  | 'reload_shotgun'
  | 'reload-pistol'
  | 'rifle_shot-1'
  | 'shotgun_shot_1'
  | 'sniper_shot_1';

type MusicType = 
  | 'Pixel Dreams'
  | 'Pixel Showdown'
  | 'Pixel Sky';

interface ExtendedHTMLAudioElement extends HTMLAudioElement {
  defaultVolume?: number;
}

export const useAudioManager = () => {
  const musicRef = useRef<ExtendedHTMLAudioElement | null>(null);
  const soundRefs = useRef<Record<string, ExtendedHTMLAudioElement>>({});
  const initializedRef = useRef(false);
  const masterVolumeRef = useRef<number>(1);

  // Initialize audio elements
  useEffect(() => {
    if (initializedRef.current) return;
    
    initializedRef.current = true;

    // Create background music element
    const musicElement = new Audio('/Music/Pixel Dreams.mp3');
    musicElement.defaultVolume = 0.1; // 10% base volume
    musicElement.volume = 0.1 * masterVolumeRef.current; // 10% volume scaled by master
    musicElement.loop = true;
    musicRef.current = musicElement;

    // Create sound effect elements
    const soundFiles: SoundType[] = [
      'laser_shot_1',
      'pick_up_1',
      'pistol_shot',
      'player_hit_1',
      'power_up_1',
      'power_up_2',
      'reload_rifle',
      'reload_shotgun',
      'reload-pistol',
      'rifle_shot-1',
      'shotgun_shot_1',
      'sniper_shot_1'
    ];

    soundFiles.forEach((sound) => {
      const soundElement = new Audio(`/Sounds/${sound}.mp3`);
      soundElement.defaultVolume = 0.2; // 20% base volume
      soundElement.volume = 0.2 * masterVolumeRef.current; // 20% volume scaled by master
      soundRefs.current[sound] = soundElement;
    });

    // Clean up on unmount
    return () => {
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current = null;
      }
      Object.values(soundRefs.current).forEach(sound => {
        sound.pause();
      });
    };
  }, []);

  const playMusic = useCallback((track: MusicType = 'Pixel Dreams') => {
    if (musicRef.current) {
      musicRef.current.src = `/Music/${track}.mp3`;
      musicRef.current.volume = (musicRef.current.defaultVolume || 0.1) * masterVolumeRef.current; // Apply master volume
      musicRef.current.loop = true;
      musicRef.current.play().catch(e => console.log("Audio play error:", e));
    }
  }, []);

  const stopMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
    }
  }, []);

  const playSound = useCallback((sound: SoundType) => {
    const soundElement = soundRefs.current[sound];
    if (soundElement) {
      soundElement.currentTime = 0; // Reset to beginning to allow overlap
      soundElement.volume = (soundElement.defaultVolume || 0.2) * masterVolumeRef.current; // Apply master volume
      soundElement.play().catch(e => console.log("Sound play error:", e));
    }
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    if (musicRef.current) {
      musicRef.current.volume = (musicRef.current.defaultVolume || 0.1) * masterVolumeRef.current * volume;
    }
  }, []);

  const setSoundVolume = useCallback((volume: number) => {
    // Update all sound volumes
    Object.values(soundRefs.current).forEach(sound => {
      sound.volume = (sound.defaultVolume || 0.2) * masterVolumeRef.current * volume;
    });
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    masterVolumeRef.current = volume;
    
    // Update music volume based on master volume
    if (musicRef.current) {
      musicRef.current.volume = (musicRef.current.defaultVolume || 0.1) * volume;
    }
    
    // Update all sound volumes based on master volume
    Object.values(soundRefs.current).forEach(sound => {
      sound.volume = (sound.defaultVolume || 0.2) * volume;
    });
  }, []);

  return {
    playMusic,
    stopMusic,
    playSound,
    setMusicVolume,
    setSoundVolume,
    setMasterVolume
  };
};