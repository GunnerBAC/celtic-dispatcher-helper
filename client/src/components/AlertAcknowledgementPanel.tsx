import { useState } from 'react';
import { CheckCircle2, X, Undo, AlertTriangle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SwipeGestureHandler } from './SwipeGestureHandler';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Alert } from '@shared/schema';

interface AlertAcknowledgementPanelProps {
  alerts: Alert[];
  className?: string;
}

export function AlertAcknowledgementPanel({ alerts, className = "" }: AlertAcknowledgementPanelProps) {
  const [recentlyDismissed, setRecentlyDismissed] = useState<number[]>([]);
  const { toast } = useToast();

  const markAlertAsRead = useMutation({
    mutationFn: async (alertId: number) => {
      await apiRequest('POST', `/api/alerts/${alertId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
    },
  });

  const markAllAlertsAsRead = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/alerts/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({
        title: "All alerts acknowledged",
        description: "All alerts have been marked as read",
      });
    },
  });

  const unreadAlerts = alerts.filter(alert => !alert.isRead && !recentlyDismissed.includes(alert.id));

  const handleSwipeToAcknowledge = (alertId: number) => {
    setRecentlyDismissed(prev => [...prev, alertId]);
    markAlertAsRead.mutate(alertId);
    toast({
      title: "Alert acknowledged",
      description: "Alert has been marked as read",
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleUndo(alertId)}
          className="ml-2"
        >
          <Undo className="h-3 w-3 mr-1" />
          Undo
        </Button>
      ),
    });
  };

  const handleUndo = (alertId: number) => {
    setRecentlyDismissed(prev => prev.filter(id => id !== alertId));
    // Note: In a real app, you'd need an "unread" API endpoint
    queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
  };

  const handleBulkAcknowledge = () => {
    markAllAlertsAsRead.mutate();
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'reminder':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (unreadAlerts.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
            Pending Alerts ({unreadAlerts.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkAcknowledge}
            disabled={markAllAlertsAsRead.isPending}
            className="text-xs"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Acknowledge All
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Swipe right to acknowledge alerts, or use bulk actions
        </p>
      </div>
      
      <div className="max-h-40 overflow-y-auto">
        {unreadAlerts.slice(0, 5).map((alert) => (
          <SwipeGestureHandler
            key={alert.id}
            onSwipeRight={() => handleSwipeToAcknowledge(alert.id)}
            className="border-b border-gray-100 last:border-b-0"
          >
            <div className="p-3 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge variant={getAlertTypeColor(alert.type)} className="text-xs">
                      {alert.type === 'critical' ? 'Critical' : 
                       alert.type === 'warning' ? 'Warning' : 'Reminder'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 truncate">
                    {alert.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSwipeToAcknowledge(alert.id)}
                  className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                  disabled={markAlertAsRead.isPending}
                >
                  <CheckCircle2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </SwipeGestureHandler>
        ))}
        
        {unreadAlerts.length > 5 && (
          <div className="p-2 text-center bg-gray-50">
            <span className="text-xs text-gray-500">
              +{unreadAlerts.length - 5} more alerts
            </span>
          </div>
        )}
      </div>
    </div>
  );
}