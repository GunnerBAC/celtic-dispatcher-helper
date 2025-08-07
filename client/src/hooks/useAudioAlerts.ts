import { useEffect, useRef, useState } from 'react';

interface AudioAlertsService {
  playAlert: (alertType: 'warning' | 'critical' | 'reminder') => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  isMuted: boolean;
  volume: number;
  isSupported: boolean;
}

export function useAudioAlerts(): AudioAlertsService {
  const [volume, setVolumeState] = useState(0.7);
  const [isMuted, setMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Check if Web Audio API is supported
    setIsSupported('AudioContext' in window || 'webkitAudioContext' in window);

    // Load volume preference from localStorage
    const savedVolume = localStorage.getItem('alertVolume');
    const savedMuted = localStorage.getItem('alertMuted');

    if (savedVolume) setVolumeState(parseFloat(savedVolume));
    if (savedMuted) setMuted(savedMuted === 'true');
  }, []);

  const initAudioContext = () => {
    if (!audioContextRef.current && isSupported) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  };

  const createTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    const audioContext = initAudioContext();
    if (!audioContext || isMuted) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  const playWarningChime = () => {
    // Gentle chime sound - ascending notes
    createTone(523.25, 0.2); // C5
    setTimeout(() => createTone(659.25, 0.2), 100); // E5
    setTimeout(() => createTone(783.99, 0.3), 200); // G5
  };

  const playCriticalAlarm = () => {
    // Urgent alarm sound - rapid beeps
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        createTone(880, 0.15, 'square'); // A5
        setTimeout(() => createTone(440, 0.15, 'square'), 75); // A4
      }, i * 200);
    }
  };

  const playReminderPing = () => {
    // Soft ping sound - single tone with echo
    createTone(698.46, 0.3); // F5
    setTimeout(() => createTone(698.46, 0.2), 400); // Echo
  };

  const playAlert = (alertType: 'warning' | 'critical' | 'reminder') => {
    if (!isSupported || isMuted) return;

    // Resume audio context if suspended (required by browser policies)
    const audioContext = initAudioContext();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }

    switch (alertType) {
      case 'warning':
        playWarningChime();
        break;
      case 'critical':
        playCriticalAlarm();
        break;
      case 'reminder':
        playReminderPing();
        break;
    }
  };

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    localStorage.setItem('alertVolume', clampedVolume.toString());
  };

  const setMutedState = (muted: boolean) => {
    setMuted(muted);
    localStorage.setItem('alertMuted', muted.toString());
  };

  return {
    playAlert,
    setVolume,
    setMuted: setMutedState,
    isMuted,
    volume,
    isSupported
  };
}