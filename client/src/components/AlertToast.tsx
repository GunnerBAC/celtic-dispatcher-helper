import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, X } from "lucide-react";

interface AlertToastProps {
  lastMessage: any;
  selectedDispatcher?: string;
  drivers?: any[];
  teams?: any[];
}

export function AlertToast({ lastMessage, selectedDispatcher, drivers = [], teams = [] }: AlertToastProps) {
  const [alert, setAlert] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (lastMessage?.type === 'new_alert' && lastMessage.alert) {
      const newAlert = lastMessage.alert;
      
      // Apply team-based filtering for toast notifications
      if (selectedDispatcher && selectedDispatcher !== "All") {
        const driver = drivers.find(d => d.id === newAlert.driverId);
        if (!driver) return;
        
        // Check if it's a team selection
        const team = teams.find(t => t.name === selectedDispatcher);
        if (team) {
          // If it's a team, check if the driver's dispatcher is in the team
          if (!team.dispatchers.includes(driver.dispatcher)) {
            return; // Skip toast for drivers not in selected team
          }
        } else {
          // If it's an individual dispatcher, check if it matches
          if (driver.dispatcher !== selectedDispatcher) {
            return; // Skip toast for drivers not assigned to selected dispatcher
          }
        }
      }
      
      setAlert(newAlert);
      setIsVisible(true);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [lastMessage, selectedDispatcher, drivers, teams]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleView = () => {
    // Scroll to the driver in the list and highlight them
    const driverElement = document.querySelector(`[data-driver-id="${alert.driverId}"]`);
    if (driverElement) {
      driverElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a red pulsing highlight effect without scaling
      driverElement.classList.add('ring-4', 'ring-red-500', 'ring-offset-2', 'animate-pulse');
      setTimeout(() => {
        driverElement.classList.remove('ring-4', 'ring-red-500', 'ring-offset-2', 'animate-pulse');
      }, 4000);
    } else {
      // Fallback - scroll to driver list section
      const driverListElement = document.querySelector('[data-testid="driver-list"]');
      if (driverListElement) {
        driverListElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    setIsVisible(false);
  };

  if (!isVisible || !alert) return null;

  return (
    <div className="fixed top-20 right-6 max-w-sm w-full z-50">
      <Card className={`border-l-4 ${
        alert.type === 'critical' ? 'border-red-500' : 'border-orange-500'
      } shadow-lg`}>
        <div className="p-4">
          <div className="flex items-start">
            {alert.type === 'critical' ? (
              <AlertTriangle className="text-red-500 h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
            ) : (
              <Clock className="text-orange-500 h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-800">Driver Alert</h4>
              <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
              <div className="flex space-x-2 mt-3">
                <Button size="sm" onClick={handleView}>
                  View
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  Dismiss
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="ml-2 p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
