import { useState } from 'react';
import { Volume2, VolumeX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAudioAlerts } from '@/hooks/useAudioAlerts';

export function AudioControlPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const audioAlerts = useAudioAlerts();

  const handleVolumeChange = (value: number[]) => {
    audioAlerts.setVolume(value[0]);
  };

  const testSound = (type: 'warning' | 'critical' | 'reminder') => {
    audioAlerts.playAlert(type);
  };

  if (!audioAlerts.isSupported) {
    return null; // Don't show if audio is not supported
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700"
          title={`Audio alerts ${audioAlerts.isMuted ? 'muted' : 'enabled'}`}
        >
          {audioAlerts.isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Audio Alerts</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => audioAlerts.setMuted(!audioAlerts.isMuted)}
              className="h-8 w-8 p-0"
            >
              {audioAlerts.isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Volume</label>
              <span className="text-xs text-gray-500">
                {Math.round(audioAlerts.volume * 100)}%
              </span>
            </div>
            <Slider
              value={[audioAlerts.volume]}
              onValueChange={handleVolumeChange}
              max={1}
              min={0}
              step={0.1}
              disabled={audioAlerts.isMuted}
              className="w-full"
            />
          </div>

          {/* Test Sounds */}
          <div className="space-y-2">
            <label className="text-xs text-gray-600">Test Sounds</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('warning')}
                disabled={audioAlerts.isMuted}
                className="text-xs"
              >
                Warning
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('critical')}
                disabled={audioAlerts.isMuted}
                className="text-xs"
              >
                Critical
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSound('reminder')}
                disabled={audioAlerts.isMuted}
                className="text-xs"
              >
                Reminder
              </Button>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="pt-2 border-t">
            <label className="text-xs text-gray-600 mb-2 block">Shortcuts</label>
            <div className="text-xs text-gray-500 space-y-1">
              <div><kbd className="px-1 py-0.5 bg-gray-100 rounded">A</kbd> Mark all alerts read</div>
              <div><kbd className="px-1 py-0.5 bg-gray-100 rounded">R</kbd> Refresh data</div>
              <div><kbd className="px-1 py-0.5 bg-gray-100 rounded">M</kbd> Toggle audio mute</div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}