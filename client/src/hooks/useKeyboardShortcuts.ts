import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface KeyboardShortcutsOptions {
  onMarkAllAlertsRead?: () => void;
  onRefreshData?: () => void;
  onToggleAudio?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const markAllAlertsAsRead = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/alerts/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      if (options.onMarkAllAlertsRead) {
        options.onMarkAllAlertsRead();
      }
    },
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      // Ctrl/Cmd + A: Mark all alerts as read
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        markAllAlertsAsRead.mutate();
        return;
      }

      // A key: Mark all alerts as read (without modifier)
      if (event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        markAllAlertsAsRead.mutate();
        return;
      }

      // R key: Refresh data
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
        if (options.onRefreshData) {
          options.onRefreshData();
        }
        return;
      }

      // M key: Toggle audio mute
      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        if (options.onToggleAudio) {
          options.onToggleAudio();
        }
        return;
      }

      // Escape key: Close any open modals/popovers
      if (event.key === 'Escape') {
        // Let the default behavior handle closing modals
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [markAllAlertsAsRead, options]);

  return {
    markAllAlertsAsRead,
  };
}