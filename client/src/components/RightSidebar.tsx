import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Alert, Driver, Team } from "@shared/schema";

interface RightSidebarProps {
  selectedDispatcher: string;
}

export function RightSidebar({ selectedDispatcher }: RightSidebarProps) {
  const queryClient = useQueryClient();
  
  const { data: allAlerts = [] } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['/api/drivers'],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  // Filter alerts by selected dispatcher/team
  const alerts = (() => {
    if (selectedDispatcher === "All") return allAlerts;
    
    // Check if it's a team selection
    const team = teams.find(t => t.name === selectedDispatcher);
    if (team) {
      return allAlerts.filter(alert => {
        const driver = drivers.find(d => d.id === alert.driverId);
        return driver && team.dispatchers.includes(driver.dispatcher);
      });
    }
    
    // Individual dispatcher selection
    return allAlerts.filter(alert => {
      const driver = drivers.find(d => d.id === alert.driverId);
      return driver?.dispatcher === selectedDispatcher;
    });
  })();

  const clearHistoryMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/alerts/clear-history'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
    },
  });

  const getDriverName = (driverId: number) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || 'Unknown Driver';
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  const handleAlertClick = (driverId: number) => {
    // Scroll to the driver in the list and highlight them
    const driverElement = document.querySelector(`[data-driver-id="${driverId}"]`);
    if (driverElement) {
      driverElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a yellow background highlight effect that's more visible
      driverElement.classList.add('bg-yellow-100', 'border-yellow-500', 'border-2', 'animate-pulse');
      setTimeout(() => {
        driverElement.classList.remove('bg-yellow-100', 'border-yellow-500', 'border-2', 'animate-pulse');
      }, 4000);
    } else {
      // Fallback - scroll to driver list section
      const driverListElement = document.querySelector('[data-testid="driver-list"]');
      if (driverListElement) {
        driverListElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const alertHistory = alerts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Show all alerts in history

  return (
    <div className="space-y-6">
      {/* Alert History */}
      <Card className="border border-gray-200 h-[32rem] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Alert History</h3>
          {alertHistory.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearHistoryMutation.mutate()}
              disabled={clearHistoryMutation.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-3" 
            style={{
              scrollbarWidth: 'thin', 
              scrollbarColor: '#d1d5db #f3f4f6'
            }}
          >
            {alertHistory.length > 0 ? (
              alertHistory.map((alert) => (
              <div 
                key={alert.id}
                onClick={() => handleAlertClick(alert.driverId)}
                className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                  alert.isRead ? 'opacity-60' : ''
                } ${
                  alert.type === 'critical' ? 'bg-red-50 hover:bg-red-100' : 
                  alert.type === 'reminder' ? 'bg-yellow-50 hover:bg-yellow-100' : 'bg-orange-50 hover:bg-orange-100'
                }`}
              >
                {alert.type === 'critical' ? (
                  <AlertTriangle className="text-red-500 h-4 w-4 mt-0.5 flex-shrink-0" />
                ) : alert.type === 'reminder' ? (
                  <AlertTriangle className="text-yellow-500 h-4 w-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <Clock className="text-orange-500 h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {getDriverName(alert.driverId)}
                  </p>
                  <p className="text-xs text-gray-600">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {getTimeAgo(alert.timestamp)}
                  </p>
                </div>
              </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No alert history</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
