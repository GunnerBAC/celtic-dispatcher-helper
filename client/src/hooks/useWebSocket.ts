import { useEffect, useRef, useState } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useNotifications } from './useNotifications';
import { useAudioAlerts } from './useAudioAlerts';
import type { Driver, Team } from '@shared/schema';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(selectedDispatcher?: string, drivers?: Driver[], teams?: Team[]) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const notifications = useNotifications();
  const audioAlerts = useAudioAlerts();

  // Handle new alert notifications with team-based filtering
  const handleNewAlert = (alert: any) => {
    if (!alert) return;
    
    // Apply team-based filtering for notifications (only if data is available)
    if (selectedDispatcher && selectedDispatcher !== "All" && drivers && teams) {
      const driver = drivers.find(d => d.id === alert.driverId);
      if (!driver) return;
      
      // Check if it's a team selection
      const team = teams.find(t => t.name === selectedDispatcher);
      if (team) {
        // If it's a team, check if the driver's dispatcher is in the team
        if (!team.dispatchers.includes(driver.dispatcher)) {
          return; // Skip notification for drivers not in selected team
        }
      } else {
        // If it's an individual dispatcher, check if it matches
        if (driver.dispatcher !== selectedDispatcher) {
          return; // Skip notification for drivers not assigned to selected dispatcher
        }
      }
    }
    
    // Show desktop notifications and audio alerts for filtered alerts
    let alertTypeText = 'Alert';
    switch (alert.type) {
      case 'critical':
        alertTypeText = 'Critical Alert';
        break;
      case 'warning':
        alertTypeText = 'Warning Alert';
        break;
      case 'reminder':
        alertTypeText = 'Detention Reminder';
        break;
      default:
        alertTypeText = 'Alert';
    }
    
    const notificationTitle = `${alertTypeText} - Dispatcher Helper`;
    
    // Use alert ID if available, or create a unique tag
    const alertTag = alert.id ? `alert-${alert.id}` : `alert-${Date.now()}`;
    
    // Play audio alert
    audioAlerts.playAlert(alert.type as 'warning' | 'critical' | 'reminder');
    

    
    // Force immediate notification regardless of tab state
    notifications.showNotification(notificationTitle, {
      body: alert.message,
      icon: '/favicon.ico',
      tag: alertTag,
      requireInteraction: alert.type === 'critical' // Critical alerts stay until user interacts
    });
  };

  // Tab title is now managed by AppHeader component using database data



  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    
    // Handle Replit's proxy environment where port might be undefined
    let wsUrl: string;
    if (window.location.port) {
      wsUrl = `${protocol}//${host}:${window.location.port}/api/ws`;
    } else {
      // For Replit and environments without explicit ports, use host directly
      wsUrl = `${protocol}//${host}/api/ws`;
    }
    
    const connect = () => {
      try {
        ws.current = new WebSocket(wsUrl);
        
        ws.current.onopen = () => {
          setIsConnected(true);
        };
        
        ws.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            setLastMessage(message);
            
            // Handle different message types
            switch (message.type) {
              case 'drivers_update':
              case 'location_update':
              case 'driver_added':
              case 'driver_deleted':
              case 'appointment_update':
              case 'departure_update':
                queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
                break;
              case 'settings_update':
                queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
                break;
              case 'new_alert':
                queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
                // Handle new alert notification
                if (message.alert) {
                  handleNewAlert(message.alert);
                }
                break;
              case 'alert':
                // ALWAYS invalidate queries for new alerts regardless of filtering
                queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
                queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
                
                // Handle alert from WebSocket broadcast
                if (message.alert) {
                  handleNewAlert(message.alert);
                }
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.current.onclose = () => {
          setIsConnected(false);
          // Attempt to reconnect after 3 seconds
          setTimeout(connect, 3000);
        };
        
        ws.current.onerror = (error) => {
          // WebSocket error occurred
        };
      } catch (error) {
        setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []); // Remove dependencies to prevent unnecessary reconnections

  return { 
    isConnected, 
    lastMessage, 
    requestNotificationPermission: notifications.requestPermission,
    isNotificationSupported: notifications.isSupported
  };
}
