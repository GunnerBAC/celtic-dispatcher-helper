import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Plus, Eye, CheckCircle, Clock, AlertTriangle, Calendar, LogOut, RotateCcw, Filter, ArrowUpDown, MapPin, Train, DollarSign, Package } from "lucide-react";

import { AppointmentDialog } from "./AppointmentDialog";
import { DepartureDialog } from "./DepartureDialog";
import { DetentionProgressBar } from "./DetentionProgressBar";
import { LiveDurationDisplay } from "./LiveDurationDisplay";
import { DriverAlertHistory } from "./DriverAlertHistory";
import type { DriverWithLocation, Alert } from "@shared/schema";

interface DriverListProps {
  drivers: DriverWithLocation[];
}

export function DriverList({ drivers }: DriverListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("status");
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showDepartureDialog, setShowDepartureDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverWithLocation | null>(null);

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
  });

  const getDriverReminders = (driverId: number) => {
    return alerts.filter(alert =>
      alert.driverId === driverId &&
      alert.type === 'reminder' &&
      !alert.isRead
    );
  };

  const filteredDrivers = drivers
    .filter(driver => {
      // Text search filter
      const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (driver.truckNumber && driver.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      let matchesStatus = true;
      if (statusFilter === "all") {
        matchesStatus = true;
      } else if (statusFilter === "reminders") {
        // Show drivers past detention threshold (critical status) OR with unread reminder alerts
        matchesStatus = driver.status === "critical" || getDriverReminders(driver.id).length > 0;
      } else {
        matchesStatus = driver.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "truck":
          // Sort by truck number if both have truck numbers
          if (a.truckNumber && b.truckNumber) {
            // Handle numeric sorting properly for truck numbers
            const aNum = parseInt(a.truckNumber.replace(/\D/g, '')) || 0;
            const bNum = parseInt(b.truckNumber.replace(/\D/g, '')) || 0;
            if (aNum !== bNum) return aNum - bNum;
            // If numeric part is same, use string comparison
            return a.truckNumber.localeCompare(b.truckNumber);
          }
          // If only one has truck number, prioritize it
          if (a.truckNumber && !b.truckNumber) return -1;
          if (!a.truckNumber && b.truckNumber) return 1;
          // If neither has truck number, sort by name
          return a.name.localeCompare(b.name);
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          // Sort by status priority: detention > critical > warning > at-stop > completed > active (standby)
          const statusOrder = { detention: 0, critical: 1, warning: 2, 'at-stop': 3, completed: 4, active: 5 };
          const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 6;
          const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 6;
          if (aOrder !== bOrder) return aOrder - bOrder;
          // Secondary sort by detention time for detention status
          if (a.status === b.status && a.status === 'detention') {
            const aDetention = a.detentionMinutes || 0;
            const bDetention = b.detentionMinutes || 0;
            if (aDetention !== bDetention) return bDetention - aDetention;
          }
          // Secondary sort by time to detention for warning status (closest to detention first)
          if (a.status === b.status && a.status === 'warning') {
            // Parse timeToDetention strings like "1h 3m" to minutes for comparison
            const parseTimeToDetention = (timeStr: string): number => {
              if (!timeStr || timeStr === 'N/A') return 999999; // Large number for drivers with no time
              const hoursMatch = timeStr.match(/(\d+)h/);
              const minutesMatch = timeStr.match(/(\d+)m/);
              const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
              const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
              return hours * 60 + minutes;
            };

            const aTimeToDetention = parseTimeToDetention(a.timeToDetention || '');
            const bTimeToDetention = parseTimeToDetention(b.timeToDetention || '');
            if (aTimeToDetention !== bTimeToDetention) return aTimeToDetention - bTimeToDetention;
          }
          // Secondary sort by time to detention for at-stop status (closest to detention first)
          if (a.status === b.status && a.status === 'at-stop') {
            // Parse timeToDetention strings like "1h 3m" to minutes for comparison
            const parseTimeToDetention = (timeStr: string): number => {
              if (!timeStr || timeStr === 'N/A') return 999999; // Large number for drivers with no time
              const hoursMatch = timeStr.match(/(\d+)h/);
              const minutesMatch = timeStr.match(/(\d+)m/);
              const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
              const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
              return hours * 60 + minutes;
            };

            const aTimeToDetention = parseTimeToDetention(a.timeToDetention || '');
            const bTimeToDetention = parseTimeToDetention(b.timeToDetention || '');
            if (aTimeToDetention !== bTimeToDetention) return aTimeToDetention - bTimeToDetention;
          }
          // Tertiary sort by truck number for all statuses
          if (a.truckNumber && b.truckNumber) {
            const aNum = parseInt(a.truckNumber.replace(/\D/g, '')) || 0;
            const bNum = parseInt(b.truckNumber.replace(/\D/g, '')) || 0;
            if (aNum !== bNum) return aNum - bNum;
            return a.truckNumber.localeCompare(b.truckNumber);
          }
          if (a.truckNumber && !b.truckNumber) return -1;
          if (!a.truckNumber && b.truckNumber) return 1;
          return a.name.localeCompare(b.name);
        case "detention":
          // Sort by detention time (highest first)
          const aDetention = a.detentionMinutes || 0;
          const bDetention = b.detentionMinutes || 0;
          if (aDetention !== bDetention) return bDetention - aDetention;
          // Secondary sort by status for same detention time
          const statusOrder2 = { detention: 0, critical: 1, warning: 2, 'at-stop': 3, active: 4 };
          const aOrder2 = statusOrder2[a.status as keyof typeof statusOrder2] ?? 5;
          const bOrder2 = statusOrder2[b.status as keyof typeof statusOrder2] ?? 5;
          if (aOrder2 !== bOrder2) return aOrder2 - bOrder2;
          return a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="status-badge bg-blue-100 text-blue-800 hover:bg-blue-200 animate-pulse-subtle border border-blue-200">
            <span className="text-sm mr-1">🔵</span>
            <CheckCircle className="h-3 w-3 mr-1 animate-icon" />
            Standby
          </Badge>
        );
      case 'at-stop':
        return (
          <Badge className="status-badge bg-green-100 text-green-800 hover:bg-green-200 animate-pulse-subtle border border-green-200">
            <span className="text-sm mr-1">🟢</span>
            <MapPin className="h-3 w-3 mr-1 animate-icon" />
            At Stop
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="status-badge bg-orange-100 text-orange-800 hover:bg-orange-200 animate-pulse-gentle border border-orange-200">
            <span className="text-sm mr-1">⚠️</span>
            <Clock className="h-3 w-3 mr-1 animate-icon pulse-icon" />
            Warning
          </Badge>
        );
      case 'critical':
        return (
          <Badge className="status-badge bg-red-100 text-red-800 hover:bg-red-200 animate-pulse-urgent border border-red-200">
            <span className="text-sm mr-1">🔴</span>
            <AlertTriangle className="h-3 w-3 mr-1 animate-icon pulse-icon" />
            Overdue
          </Badge>
        );
      case 'detention':
        return (
          <Badge className="status-badge bg-red-100 text-red-800 hover:bg-red-200 animate-glow border border-red-200">
            <span className="text-sm mr-1">⏰</span>
            <Clock className="h-3 w-3 mr-1 animate-icon pulse-icon" />
            Detention
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="status-badge bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200">
            <span className="text-sm mr-1">✅</span>
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSetAppointment = (driver: DriverWithLocation) => {
    setSelectedDriver(driver);
    setShowAppointmentDialog(true);
  };

  const handleSetDeparture = (driver: DriverWithLocation) => {
    setSelectedDriver(driver);
    setShowDepartureDialog(true);
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();



  const resetDriverMutation = useMutation({
    mutationFn: async (driverId: number) => {
      return apiRequest("POST", `/api/drivers/${driverId}/reset`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({
        title: "Success",
        description: "Driver times reset successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset driver times",
        variant: "destructive",
      });
    },
  });



  const handleResetDriver = (driver: DriverWithLocation) => {
    resetDriverMutation.mutate(driver.id);
  };

  const updateStopTypeMutation = useMutation({
    mutationFn: async ({ driverId, stopType }: { driverId: number; stopType: string }) => {
      return apiRequest('PATCH', `/api/drivers/${driverId}/location`, {
        stopType: stopType
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "Stop Type Updated",
        description: "Stop type has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update stop type",
        variant: "destructive",
      });
    },
  });

  const handleSetStopType = (driver: DriverWithLocation, stopType: string) => {
    updateStopTypeMutation.mutate({ driverId: driver.id, stopType });
  };

  return (
    <Card className="border border-gray-200" data-testid="driver-list">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Driver Status</h2>
          <div className="flex items-center space-x-2">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <div className="flex items-center">
                  <Filter className="h-3 w-3 mr-1 text-gray-500" />
                  <SelectValue placeholder="All" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="detention">Detention</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="at-stop">At Stop</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="active">Standby</SelectItem>
                <SelectItem value="reminders">Reminders</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <div className="flex items-center">
                  <ArrowUpDown className="h-3 w-3 mr-1 text-gray-500" />
                  <SelectValue placeholder="Sort" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="truck">Truck #</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="detention">Detention</SelectItem>
              </SelectContent>
            </Select>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
              <Input
                type="text"
                placeholder="Search..."
                className="pl-7 pr-3 py-1 w-36 h-8 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>


          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="overflow-x-auto -m-4 p-4 relative">
          <table className="w-full min-w-[1100px] compact-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: "170px"}}>
                  Driver
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: "75px"}}>
                  Status
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: "120px"}}>
                  Duration
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: "280px"}}>
                  Detention Progress
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: "320px"}}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredDrivers.map((driver) => (
                <tr
                  key={driver.id}
                  data-driver-id={driver.id}
                  className="driver-row border-b border-gray-200 transition-all duration-200"
                >
                  <td className="px-2 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {getInitials(driver.name)}
                      </div>
                      <div className="ml-3 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {driver.truckNumber && (
                            <span className="text-blue-600 font-semibold mr-2">#{driver.truckNumber}</span>
                          )}
                          {driver.name}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          Truck: {driver.truckNumber} • Dispatcher: {driver.dispatcher}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap">
                    {getStatusBadge(driver.status)}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <LiveDurationDisplay driver={driver} />
                      {driver.currentLocation?.departureTime && driver.detentionMinutes !== undefined && driver.detentionMinutes > 0 && (
                        <div className="text-xs text-red-600 font-medium mt-1">
                          Total: {driver.detentionMinutes} min
                          <br />
                          Cost: ${driver.detentionCost?.toFixed(2) || '0.00'}
                          <br />
                          <span className="text-orange-600">
                            Started: {(() => {
                              // Calculate detention start time based on appointment + stop type threshold
                              const appointmentTime = driver.currentLocation.appointmentTime ? new Date(driver.currentLocation.appointmentTime) : new Date();
                              const stopType = driver.currentLocation.stopType || 'regular';

                              // Get detention threshold based on stop type
                              let detentionThresholdMinutes = 120; // Default for regular stops
                              switch (stopType) {
                                case 'multi-stop':
                                case 'rail':
                                  detentionThresholdMinutes = 60; // 1 hour
                                  break;
                                case 'no-billing':
                                  detentionThresholdMinutes = 15; // 15 minutes
                                  break;
                                case 'drop-hook':
                                  detentionThresholdMinutes = 30; // 30 minutes
                                  break;
                              }

                              // Calculate detention start time
                              const detentionStartTime = new Date(appointmentTime.getTime() + (detentionThresholdMinutes * 60 * 1000));

                              // Convert to local time for display
                              const now = new Date();
                              const timezoneOffsetMinutes = now.getTimezoneOffset();
                              const localHours = (detentionStartTime.getUTCHours() - (timezoneOffsetMinutes / 60) + 24) % 24;
                              const hour = String(localHours).padStart(2, '0');
                              const minute = String(detentionStartTime.getUTCMinutes()).padStart(2, '0');
                              return `${hour}:${minute} CST`;
                            })()}
                          </span>
                        </div>
                      )}
                      {driver.currentLocation?.stopType && driver.currentLocation?.appointmentTime && (
                        <div className="text-xs text-blue-600 font-medium mt-1">
                          {driver.currentLocation.stopType === 'multi-stop' ? 'Multi-Stop' :
                           driver.currentLocation.stopType === 'rail' ? 'Rail' :
                           driver.currentLocation.stopType === 'no-billing' ? 'No Billing' :
                           driver.currentLocation.stopType === 'drop-hook' ? 'Drop/Hook' :
                           driver.currentLocation.stopType === 'regular' ? 'Regular' :
                           driver.currentLocation.stopType}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <DetentionProgressBar driver={driver} className="max-w-full" />
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-1 mobile-stack">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetAppointment(driver)}
                          className="action-button action-button-calendar h-8 w-8 p-0 relative border border-transparent"
                        >
                          <Calendar className="h-4 w-4 animate-icon" />
                          <div className="instant-tooltip">Set Appointment</div>
                        </Button>
                        {driver.currentLocation?.appointmentTime && !driver.currentLocation?.departureTime && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDeparture(driver)}
                            className="action-button action-button-departure h-8 w-8 p-0 relative border border-transparent"
                          >
                            <LogOut className="h-4 w-4 animate-icon" />
                            <div className="instant-tooltip">Set Departure</div>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetDriver(driver)}
                          className="action-button h-8 w-8 p-0 relative text-orange-600 hover:text-orange-800 hover:bg-orange-100 border border-transparent"
                          disabled={resetDriverMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 animate-icon rotate-icon" />
                          <div className="instant-tooltip">Reset Driver</div>
                        </Button>
                        <DriverAlertHistory
                          driverId={driver.id}
                          driverName={driver.name}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-0.5 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetStopType(driver, 'regular')}
                            className={`stop-type-button action-button relative text-xs px-1 py-0.5 h-6 border border-transparent ${(driver.currentLocation?.stopType === 'regular' || !driver.currentLocation?.stopType) ? 'selected regular bg-gray-100 text-gray-800 border-gray-300' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                            disabled={updateStopTypeMutation.isPending}
                          >
                            <Clock className="h-3 w-3 mr-0.5 animate-icon" />
                            Regular
                            <div className="instant-tooltip">Regular (2hr detention)</div>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetStopType(driver, 'multi-stop')}
                            className={`stop-type-button action-button relative text-xs px-1 py-0.5 h-6 border border-transparent ${driver.currentLocation?.stopType === 'multi-stop' ? 'selected multi-stop bg-blue-100 text-blue-800 border-blue-300' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'}`}
                            disabled={updateStopTypeMutation.isPending}
                          >
                            <MapPin className="h-3 w-3 mr-0.5 animate-icon" />
                            Multi-Stop
                            <div className="instant-tooltip">Multi-Stop (1hr detention)</div>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetStopType(driver, 'rail')}
                            className={`stop-type-button action-button relative text-xs px-1 py-0.5 h-6 border border-transparent ${driver.currentLocation?.stopType === 'rail' ? 'selected rail bg-green-100 text-green-800 border-green-300' : 'text-green-600 hover:text-green-800 hover:bg-green-100'}`}
                            disabled={updateStopTypeMutation.isPending}
                          >
                            <Train className="h-3 w-3 mr-0.5 animate-icon" />
                            Rail
                            <div className="instant-tooltip">Rail (1hr detention)</div>
                          </Button>
                        </div>
                        <div className="flex items-center space-x-0.5 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetStopType(driver, 'drop-hook')}
                            className={`stop-type-button action-button relative text-xs px-1 py-0.5 h-6 border border-transparent ${driver.currentLocation?.stopType === 'drop-hook' ? 'selected drop-hook bg-orange-100 text-orange-800 border-orange-300' : 'text-orange-600 hover:text-orange-800 hover:bg-orange-100'}`}
                            disabled={updateStopTypeMutation.isPending}
                          >
                            <Package className="h-3 w-3 mr-0.5 animate-icon" />
                            Drop/Hook
                            <div className="instant-tooltip">Drop/Hook (30min detention)</div>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetStopType(driver, 'no-billing')}
                            className={`stop-type-button action-button relative text-xs px-1 py-0.5 h-6 border border-transparent ${driver.currentLocation?.stopType === 'no-billing' ? 'selected no-billing bg-purple-100 text-purple-800 border-purple-300' : 'text-purple-600 hover:text-purple-800 hover:bg-purple-100'}`}
                            disabled={updateStopTypeMutation.isPending}
                          >
                            <DollarSign className="h-3 w-3 mr-0.5 animate-icon" />
                            No Billing
                            <div className="instant-tooltip">No Billing (15min detention)</div>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>



      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        driver={selectedDriver}
      />

      <DepartureDialog
        open={showDepartureDialog}
        onOpenChange={setShowDepartureDialog}
        driver={selectedDriver}
      />
    </Card>
  );
}
