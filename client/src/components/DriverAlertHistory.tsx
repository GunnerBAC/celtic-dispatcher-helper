import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Alert } from '@shared/schema';

interface DriverAlertHistoryProps {
  driverId: number;
  driverName: string;
}

export function DriverAlertHistory({ driverId, driverName }: DriverAlertHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: allAlerts = [] } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
  });

  // Filter alerts for this specific driver
  const driverAlerts = allAlerts
    .filter(alert => alert.driverId === driverId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15); // Show last 15 alerts

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="text-red-500 h-3 w-3" />;
      case 'warning':
        return <AlertTriangle className="text-orange-500 h-3 w-3" />;
      case 'reminder':
        return <AlertTriangle className="text-yellow-500 h-3 w-3" />;
      default:
        return <Clock className="text-gray-500 h-3 w-3" />;
    }
  };

  const getAlertBgColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'reminder':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="action-button h-8 w-8 p-0 relative text-gray-400 hover:text-gray-600 hover:bg-gray-100 border border-transparent"
        >
          <History className="h-4 w-4 animate-icon" />
          <div className="instant-tooltip">View Alert History</div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center">
            <History className="h-4 w-4 mr-2 text-gray-600" />
            Alert History - {driverName}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {driverAlerts.length} recent alerts
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {driverAlerts.length > 0 ? (
            <div className="p-2 space-y-2">
              {driverAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2 rounded-lg border transition-all duration-200 ${getAlertBgColor(alert.type)} ${
                    alert.isRead ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      {getAlertIcon(alert.type)}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        alert.type === 'critical' ? 'bg-red-100 text-red-700' :
                        alert.type === 'warning' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {alert.type === 'critical' ? 'Critical' :
                         alert.type === 'warning' ? 'Warning' : 'Reminder'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {getTimeAgo(alert.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {alert.message}
                  </p>
                  {!alert.isRead && (
                    <div className="mt-1">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" title="Unread" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              <History className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No alert history</p>
              <p className="text-xs mt-1">Alerts will appear here when generated</p>
            </div>
          )}
        </div>
        {driverAlerts.length > 0 && (
          <div className="p-2 border-t bg-gray-50 text-center">
            <span className="text-xs text-gray-500">
              Showing last {Math.min(driverAlerts.length, 15)} alerts
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}