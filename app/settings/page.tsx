'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useAudioManager } from '@/hooks/useAudioManager';

export default function SettingsPage() {
  const router = useRouter();
  const { setMusicVolume, setSoundVolume, setMasterVolume } = useAudioManager();
  const [musicVolume, setMusic] = useState<number>(0.3);
  const [soundVolume, setSound] = useState<number>(0.5);
  const [masterVolume, setMaster] = useState<number>(1);

  const handleMusicVolumeChange = (value: number[]) => {
    const volume = value[0];
    setMusic(volume);
    setMusicVolume(volume);
  };

  const handleSoundVolumeChange = (value: number[]) => {
    const volume = value[0];
    setSound(volume);
    setSoundVolume(volume);
  };

  const handleMasterVolumeChange = (value: number[]) => {
    const volume = value[0];
    setMaster(volume);
    setMasterVolume(volume);
  };

  const handleBackToMenu = () => {
    router.push('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <div className="text-center space-y-2">
        <h1 className="font-mono text-4xl font-bold tracking-tighter text-foreground">POLICE STORIES</h1>
        <p className="text-muted-foreground font-mono text-sm">SETTINGS</p>
      </div>

      <Card className="p-8 space-y-6 max-w-md w-full bg-card border-border">
        <Tabs defaultValue="controls" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
          </TabsList>
          
          <TabsContent value="controls" className="space-y-4">
            <h3 className="text-xl font-semibold text-center">Controls</h3>
            <div className="space-y-2 text-sm text-muted-foreground font-mono">
              <p>• WASD to move</p>
              <p>• Mouse to aim</p>
              <p>• Click to shoot</p>
              <p>• Eliminate all hostiles</p>
              <p>• Use cover wisely</p>
            </div>
          </TabsContent>
          
          <TabsContent value="audio" className="space-y-4">
            <h3 className="text-xl font-semibold text-center">Audio Settings</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Music Volume</label>
                  <span className="text-sm text-muted-foreground">{Math.round(musicVolume * 100)}%</span>
                </div>
                <Slider
                  value={[musicVolume]}
                  onValueChange={handleMusicVolumeChange}
                  max={1}
                  step={0.01}
                  className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Sound Effects Volume</label>
                  <span className="text-sm text-muted-foreground">{Math.round(soundVolume * 100)}%</span>
                </div>
                <Slider
                  value={[soundVolume]}
                  onValueChange={handleSoundVolumeChange}
                  max={1}
                  step={0.01}
                  className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Master Volume</label>
                  <span className="text-sm text-muted-foreground">{Math.round(masterVolume * 100)}%</span>
                </div>
                <Slider
                  value={[masterVolume]}
                  onValueChange={handleMasterVolumeChange}
                  max={1}
                  step={0.01}
                  className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleBackToMenu}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono"
          size="lg"
        >
          BACK TO MENU
        </Button>
      </Card>
    </div>
  );
}