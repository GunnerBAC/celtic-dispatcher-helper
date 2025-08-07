import { Truck, AlertTriangle, Clock, Bell, BellOff, RefreshCw, Users, FileText, Calculator, Settings, HelpCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import type { Alert, DriverWithLocation, Team } from "@shared/schema";
import { CostCalculatorDialog } from "./CostCalculatorDialog";
import { AccessorialGuideDialog } from "./AccessorialGuideDialog";
import { DetentionCalculatorDialog } from "./DetentionCalculatorDialog";
import { AnimatedAlertBadge } from "./AnimatedAlertBadge";
import { AudioControlPanel } from "./AudioControlPanel";
import { ManagementTabs } from "./ManagementTabs";
import { HelpDialog } from "./HelpDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useNotifications } from "@/hooks/useNotifications";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAudioAlerts } from "@/hooks/useAudioAlerts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Team color options with emojis and CSS classes
const TEAM_COLORS = {
  blue: { emoji: '🟦', label: 'Blue', bgClass: 'bg-blue-50', textClass: 'text-blue-700', borderClass: 'border-blue-200' },
  green: { emoji: '🟩', label: 'Green', bgClass: 'bg-green-50', textClass: 'text-green-700', borderClass: 'border-green-200' },
  red: { emoji: '🟥', label: 'Red', bgClass: 'bg-red-50', textClass: 'text-red-700', borderClass: 'border-red-200' },
  orange: { emoji: '🟧', label: 'Orange', bgClass: 'bg-orange-50', textClass: 'text-orange-700', borderClass: 'border-orange-200' },
  yellow: { emoji: '🟨', label: 'Yellow', bgClass: 'bg-yellow-50', textClass: 'text-yellow-700', borderClass: 'border-yellow-200' },
  purple: { emoji: '🟪', label: 'Purple', bgClass: 'bg-purple-50', textClass: 'text-purple-700', borderClass: 'border-purple-200' },
  pink: { emoji: '💗', label: 'Pink', bgClass: 'bg-pink-50', textClass: 'text-pink-700', borderClass: 'border-pink-200' },
  indigo: { emoji: '🟫', label: 'Indigo', bgClass: 'bg-indigo-50', textClass: 'text-indigo-700', borderClass: 'border-indigo-200' },
  gray: { emoji: '⬜', label: 'Gray', bgClass: 'bg-gray-50', textClass: 'text-gray-700', borderClass: 'border-gray-200' },
  teal: { emoji: '🔷', label: 'Teal', bgClass: 'bg-teal-50', textClass: 'text-teal-700', borderClass: 'border-teal-200' },
  emerald: { emoji: '💚', label: 'Emerald', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', borderClass: 'border-emerald-200' },
  cyan: { emoji: '💙', label: 'Cyan', bgClass: 'bg-cyan-50', textClass: 'text-cyan-700', borderClass: 'border-cyan-200' },
} as const;

type TeamColor = keyof typeof TEAM_COLORS;

function getTeamColorInfo(color: string) {
  return TEAM_COLORS[color as TeamColor] || TEAM_COLORS.gray;
}

interface AppHeaderProps {
  isConnected?: boolean;
  notificationPermission?: NotificationPermission | null;
  isNotificationSupported?: boolean;
  onRefresh?: () => void;
  selectedDispatcher?: string;
  onDispatcherChange?: (dispatcher: string) => void;
}

export function AppHeader({ 
  isConnected = true, 
  notificationPermission = null, 
  isNotificationSupported = false,
  onRefresh,
  selectedDispatcher = "All",
  onDispatcherChange = () => {}
}: AppHeaderProps = {}) {
  const notifications = useNotifications();
  const audioAlerts = useAudioAlerts();
  
  const { data: drivers = [] } = useQuery<DriverWithLocation[]>({
    queryKey: ['/api/drivers'],
  });

  const { data: allAlerts = [] } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
  });

  const { data: dispatchers = [] } = useQuery<string[]>({
    queryKey: ['/api/dispatchers'],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  // Filter alerts by selected dispatcher or team
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

  const markAllAlertsAsRead = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/alerts/mark-all-read');
      return response;
    },
    onSuccess: (data) => {
      // Add 0.5 second delay before updating the UI to show dimming transition
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      }, 500);
    },
    onError: (error) => {
      // Mutation failed
    },
  });



  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  const criticalAlerts = unreadAlerts.filter(alert => alert.type === 'critical');
  const warningAlerts = unreadAlerts.filter(alert => alert.type === 'warning');
  const reminderAlerts = unreadAlerts.filter(alert => alert.type === 'reminder');
  const totalAlerts = unreadAlerts.length; // Show count of filtered unread alerts
  

  
  // SIMPLIFIED GLOBAL FLASH MANAGER - Direct approach
  useEffect(() => {
    // Create global flash manager if it doesn't exist
    if (!(window as any).globalFlashManager) {
      (window as any).globalFlashManager = {
        isActive: false,
        currentAlertCount: 0,
        titleInterval: null,
        faviconInterval: null,
        titleTimeout: null,
        faviconTimeout: null,
        
        start: function(alertCount: number) {
          if (this.isActive && this.currentAlertCount === alertCount) {
            return; // Already running with same count
          }
          
          this.stop(); // Clean stop first
          this.isActive = true;
          this.currentAlertCount = alertCount;
          
          const baseTitle = 'Dispatcher Helper';
          const alertTitle = `(${alertCount}) ${baseTitle}`;
          const flashTitle = `🚨 ${alertCount} ALERT${alertCount > 1 ? 'S' : ''} 🚨`;
          
          // Completely separate title and favicon timing
          let titleState = true; // true = alert title, false = normal title
          let faviconState = true; // true = alert favicon, false = normal favicon
          
          // Start with alert title
          document.title = flashTitle;
          
          // Title changes every 1000ms (1 second)
          this.titleInterval = setInterval(() => {
            if (!this.isActive) return;
            titleState = !titleState;
            document.title = titleState ? flashTitle : alertTitle;
          }, 1000);
          
          // Favicon changes every 1000ms, but offset by 500ms (0.5 seconds)
          setTimeout(() => {
            if (!this.isActive) return;
            this.updateFavicon(true, alertCount);
            
            this.faviconInterval = setInterval(() => {
              if (!this.isActive) return;
              faviconState = !faviconState;
              this.updateFavicon(faviconState, alertCount);
            }, 1000);
          }, 500)
        },
        
        stop: function() {
          // Clear all timing mechanisms
          if (this.titleInterval) {
            clearInterval(this.titleInterval);
            this.titleInterval = null;
          }
          if (this.faviconInterval) {
            clearInterval(this.faviconInterval);
            this.faviconInterval = null;
          }
          if (this.titleTimeout) {
            clearTimeout(this.titleTimeout);
            this.titleTimeout = null;
          }
          if (this.faviconTimeout) {
            clearTimeout(this.faviconTimeout);
            this.faviconTimeout = null;
          }
          
          const flashFavicon = document.getElementById('flash-favicon');
          if (flashFavicon) flashFavicon.remove();
          
          this.isActive = false;
          this.currentAlertCount = 0;
          document.title = 'Dispatcher Helper';
        },
        
        updateFavicon: function(withAlert: boolean, alertCount: number) {
          const oldFlash = document.getElementById('flash-favicon');
          if (oldFlash) oldFlash.remove();
          
          const canvas = document.createElement('canvas');
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 32, 32);
            
            // Draw truck
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(4, 10, 8, 12);
            ctx.fillRect(12, 8, 16, 16);
            
            // Draw wheels
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(8, 26, 3, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(20, 26, 3, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add alert badge
            if (withAlert) {
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(26, 8, 6, 0, 2 * Math.PI);
              ctx.fill();
              
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 8px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(alertCount > 9 ? '9+' : alertCount.toString(), 26, 8);
            }
          }
          
          const flashFavicon = document.createElement('link');
          flashFavicon.rel = 'icon';
          flashFavicon.id = 'flash-favicon';
          flashFavicon.href = canvas.toDataURL();
          document.head.appendChild(flashFavicon);
          
          // Removed duplicate log - already logged in flashLoop
        }
      };
    }
    
    // Control flashing based on alerts
    if (totalAlerts > 0) {
      (window as any).globalFlashManager.start(totalAlerts);
    } else {
      (window as any).globalFlashManager.stop();
    }
  }, [totalAlerts]);
  const allRecentAlerts = alerts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10); // Show recent alerts (read + unread) in dropdown for reference



  const getDriverName = (driverId: number) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unknown Driver';
  };

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

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onMarkAllAlertsRead: () => {
      // Mark all alerts as read via keyboard shortcut
    },
    onRefreshData: () => {
      // Refresh data via keyboard shortcut
    },
    onToggleAudio: () => {
      audioAlerts.setMuted(!audioAlerts.isMuted);
    }
  });


  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Left Section */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="flex-shrink-0 flex items-center">
              <Truck className="text-blue-600 h-6 w-6 mr-1.5" />
              <h1 className="text-lg font-bold text-gray-800 hidden lg:block">Dispatcher Helper</h1>
              <h1 className="text-sm font-bold text-gray-800 lg:hidden">Dispatch</h1>
            </div>
            
            {/* Dispatcher Filter with Management */}
            <div className="flex items-center space-x-1.5">
              <Users className="h-3.5 w-3.5 text-gray-500" />
              <Select value={selectedDispatcher} onValueChange={onDispatcherChange}>
                <SelectTrigger className="w-36 lg:w-40 h-8 text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {/* Individual Dispatchers */}
                  {dispatchers.sort().map(dispatcher => (
                    <SelectItem key={dispatcher} value={dispatcher} className="text-gray-600">
                      {dispatcher}
                    </SelectItem>
                  ))}
                  {/* Separator */}
                  {teams.length > 0 && (
                    <div className="border-t border-gray-200 my-1"></div>
                  )}
                  {/* Team Options */}
                  {teams.map(team => {
                    const colorInfo = getTeamColorInfo(team.color);
                    return (
                      <SelectItem 
                        key={team.id} 
                        value={team.name} 
                        className={`font-semibold ${colorInfo.textClass} ${colorInfo.bgClass}`}
                      >
                        {colorInfo.emoji} {team.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {/* Management Settings */}
              <ManagementTabs 
                selectedDispatcher={selectedDispatcher}
                onDispatcherChange={onDispatcherChange}
              />
              
              {/* Help Button */}
              <HelpDialog />
            </div>
          </div>
          
          {/* Right Section */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Status Indicators - Compact */}
            <div className="hidden lg:flex items-center space-x-1">
              {/* Connection Status - Icon Only */}
              <div className={`flex items-center px-1.5 py-1 rounded-full ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`} title={isConnected ? 'Connected' : 'Disconnected'}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              
              {/* Notification Status - Icon Only */}
              {isNotificationSupported && (
                <div className={`flex items-center px-1.5 py-1 rounded-full ${
                  notificationPermission === 'granted' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`} title={notificationPermission === 'granted' ? 'Notifications On' : 'Notifications Off'}>
                  {notificationPermission === 'granted' ? (
                    <Bell className="w-3 h-3" />
                  ) : (
                    <BellOff className="w-3 h-3" />
                  )}
                </div>
              )}
              
              {/* Audio Control Panel */}
              <AudioControlPanel />
              

              
              {/* Refresh Button */}
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="h-8 w-8 p-0"
                  title="Refresh"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            
            {/* Calculator/Guide Buttons Group */}
            <div className="flex items-center space-x-1">
              {/* Accessorial Guide */}
              <AccessorialGuideDialog>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500 hover:border-blue-600 text-xs px-2"
                  title="Accessorial Guide"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  <span className="hidden lg:inline">Accessorial Guide</span>
                  <span className="lg:hidden">Guide</span>
                </Button>
              </AccessorialGuideDialog>
              
              {/* Cost Calculator */}
              <CostCalculatorDialog>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600 text-xs px-2"
                  title="Load Cost/Pay Calculator"
                >
                  <Calculator className="h-3 w-3 mr-1" />
                  <span className="hidden xl:inline">Load Cost/Pay Calc</span>
                  <span className="xl:hidden">Cost Calc</span>
                </Button>
              </CostCalculatorDialog>
              
              {/* Detention Calculator */}
              <DetentionCalculatorDialog>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 hover:border-yellow-600 text-xs px-2"
                  title="Detention Calculator"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  <span className="hidden xl:inline">Detention Time/Cost Calc</span>
                  <span className="xl:hidden">Detention Calc</span>
                </Button>
              </DetentionCalculatorDialog>
            </div>

            {/* Alert Summary - Always Visible */}
            <div className="flex items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <div>
                    <AnimatedAlertBadge
                      alertCount={totalAlerts}
                      criticalCount={criticalAlerts.length}
                      warningCount={warningAlerts.length}
                      reminderCount={reminderAlerts.length}
                      onClick={() => {
                        // Mark all alerts as read when user clicks on alert count
                        console.log('FINAL: Alert badge clicked, totalAlerts:', totalAlerts);
                        if (totalAlerts > 0) {
                          console.log('FINAL: Calling markAllAlertsAsRead mutation');
                          markAllAlertsAsRead.mutate();
                        }
                        // Let the click bubble up to open the popover
                      }}
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b">
                    <h4 className="text-sm font-semibold text-blue-600">Recent Alerts</h4>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {allRecentAlerts.length > 0 ? (
                      allRecentAlerts.map((alert) => (
                        <div 
                          key={alert.id} 
                          onClick={() => handleAlertClick(alert.driverId)}
                          className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                            alert.isRead ? 'opacity-60' : ''
                          }`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-medium text-gray-900">
                              {getDriverName(alert.driverId)}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded ${
                              alert.type === 'critical' ? 'bg-red-100 text-red-600' :
                              alert.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'
                            }`}>
                              {alert.type === 'critical' ? 'Critical' : alert.type === 'warning' ? 'Warning' : 'Reminder'}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {alert.message}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {getTimeAgo(alert.timestamp)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No recent alerts
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            

          </div>
        </div>
      </div>
    </header>
  );
}
