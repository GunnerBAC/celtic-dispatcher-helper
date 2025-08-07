import { AppHeader } from "@/components/AppHeader";
import { DashboardOverview } from "@/components/DashboardOverview";
import { DriverList } from "@/components/DriverList";
import { RightSidebar } from "@/components/RightSidebar";
import { ReminderSection } from "@/components/ReminderSection";
import { AlertToast } from "@/components/AlertToast";
import { DetentionVisualization } from "@/components/DetentionVisualization";
import { AlertAcknowledgementPanel } from "@/components/AlertAcknowledgementPanel";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import type { DriverWithLocation, Alert, Team } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(
    'Notification' in window ? Notification.permission : null
  );
  const [selectedDispatcher, setSelectedDispatcher] = useState<string>("All");

  // Set document title
  useEffect(() => {
    document.title = "Dispatcher Helper";
  }, []);

  const { data: allDrivers = [], refetch } = useQuery<DriverWithLocation[]>({
    queryKey: ['/api/drivers'],
    refetchInterval: 10000, // Refresh every 10 seconds for time-sensitive data
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });
  
  const { isConnected, lastMessage, requestNotificationPermission, isNotificationSupported } = useWebSocket(selectedDispatcher, allDrivers, teams);

  // Filter drivers by selected dispatcher/team and exclude inactive drivers from main view
  const drivers = (() => {
    let filteredDrivers;
    
    if (selectedDispatcher === "All") {
      filteredDrivers = allDrivers;
    } else {
      // Check if it's a team selection
      const team = teams.find(t => t.name === selectedDispatcher);
      if (team) {
        // Team selection - show all drivers from dispatchers in the team
        filteredDrivers = allDrivers.filter(driver => team.dispatchers.includes(driver.dispatcher));
      } else {
        // Individual dispatcher selection
        filteredDrivers = allDrivers.filter(driver => driver.dispatcher === selectedDispatcher);
      }
    }
    
    return filteredDrivers.filter(driver => driver.isActive);
  })();

  const { data: allAlerts = [] } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
    refetchInterval: 10000, // Refresh every 10 seconds for time-sensitive data
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });

  // Filter alerts by selected dispatcher/team
  const alerts = (() => {
    if (selectedDispatcher === "All") return allAlerts;
    
    // Check if it's a team selection
    const team = teams.find(t => t.name === selectedDispatcher);
    if (team) {
      return allAlerts.filter(alert => {
        const driver = allDrivers.find(d => d.id === alert.driverId);
        return driver && team.dispatchers.includes(driver.dispatcher);
      });
    }
    
    // Individual dispatcher selection
    return allAlerts.filter(alert => {
      const driver = allDrivers.find(d => d.id === alert.driverId);
      return driver?.dispatcher === selectedDispatcher;
    });
  })();

  const handleRefresh = async () => {
    try {
      // Refresh all data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/drivers'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/settings'] })
      ]);
      
      toast({
        title: "Data Refreshed",
        description: "All fleet data has been updated",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNotificationPermission = async () => {
    try {
      const granted = await requestNotificationPermission();
      setNotificationPermission(granted ? 'granted' : 'denied');
      
      if (granted) {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive push notifications for critical fleet alerts, even when the tab is inactive.",
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "You can enable notifications in your browser settings later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request notification permission.",
        variant: "destructive",
      });
    }
  };



  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        isConnected={isConnected}
        notificationPermission={notificationPermission}
        isNotificationSupported={isNotificationSupported}
        onRefresh={handleRefresh}
        selectedDispatcher={selectedDispatcher}
        onDispatcherChange={setSelectedDispatcher}
      />
      
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3">
        <DashboardOverview drivers={drivers} alerts={alerts} />
        
        <div className="space-y-4">
          <DriverList drivers={drivers} />
          
          {/* Alert Acknowledgement Panel */}
          <AlertAcknowledgementPanel alerts={alerts} />
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <DetentionVisualization drivers={drivers} />
            <ReminderSection drivers={drivers} alerts={alerts} />
            <RightSidebar selectedDispatcher={selectedDispatcher} />
          </div>
          
          {/* Detention, Warning & Reminder Guide */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detention Alert System Guide</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 font-medium mb-1">Critical alerts sent when detention starts (ALL stop types)</p>
              <p className="text-sm text-blue-700">Reminder alerts sent every 30 minutes during ongoing detention</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Regular</h4>
                <p className="text-gray-600 mb-1">Detention: After 2 hours</p>
                <p className="text-gray-600 mb-1">Warning: 30 min before detention</p>
                <p className="text-red-600 mb-1 font-medium">Critical: When detention starts</p>
                <p className="text-gray-600">Reminders: Every 30 min during detention</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Multi-Stop</h4>
                <p className="text-blue-700 mb-1">Detention: After 1 hour</p>
                <p className="text-blue-700 mb-1">Warning: 15 min before detention</p>
                <p className="text-red-600 mb-1 font-medium">Critical: When detention starts</p>
                <p className="text-blue-700">Reminders: Every 30 min during detention</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Rail</h4>
                <p className="text-green-700 mb-1">Detention: After 1 hour</p>
                <p className="text-red-600 mb-1 font-medium">Critical: When detention starts</p>
                <p className="text-green-700">Reminders: Every 30 min during detention</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">No Billing</h4>
                <p className="text-purple-700 mb-1">Detention: After 15 minutes</p>
                <p className="text-red-600 mb-1 font-medium">Critical: When detention starts</p>
                <p className="text-purple-700">Reminders: Every 30 min during detention</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-medium text-orange-900 mb-2">Drop/Hook</h4>
                <p className="text-orange-700 mb-1">Detention: After 30 minutes</p>
                <p className="text-red-600 mb-1 font-medium">Critical: When detention starts</p>
                <p className="text-orange-700">Reminders: Every 30 min during detention</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        {/* Notification Permission Button */}
        {isNotificationSupported && notificationPermission !== 'granted' && (
          <Button
            size="lg"
            className="w-14 h-14 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl"
            onClick={handleNotificationPermission}
            title="Enable Push Notifications"
          >
            <Bell className="h-6 w-6" />
          </Button>
        )}
      </div>



      <AlertToast 
        lastMessage={lastMessage} 
        selectedDispatcher={selectedDispatcher}
        drivers={allDrivers}
        teams={teams}
      />
      <Toaster />
    </div>
  );
}
