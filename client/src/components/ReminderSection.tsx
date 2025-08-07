import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DriverWithLocation, Alert } from "@shared/schema";

interface ReminderSectionProps {
  drivers: DriverWithLocation[];
  alerts: Alert[];
}

export function ReminderSection({ drivers, alerts }: ReminderSectionProps) {
  const standbyDrivers = drivers.filter(driver => driver.status === 'active');
  const atStopDrivers = drivers.filter(driver => driver.status === 'at-stop');
  const warningDrivers = drivers.filter(driver => driver.status === 'warning');
  const detentionDrivers = drivers.filter(driver => driver.status === 'detention');

  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  const warningAlerts = unreadAlerts.filter(alert => alert.type === 'warning');
  const reminderAlerts = unreadAlerts.filter(alert => alert.type === 'reminder');

  // Calculate reminder driver count (unique drivers with active reminders)
  const reminderDriverIds = new Set(reminderAlerts.map(alert => alert.driverId));
  const reminderDriverCount = reminderDriverIds.size;



  return (
    <Card className="border border-gray-200 h-[32rem] flex flex-col">
      <CardHeader className="pb-4 flex-shrink-0">
        <CardTitle className="flex items-center text-lg font-semibold text-gray-800">
          <Bell className="h-5 w-5 mr-2 text-blue-600" />
          Driver Status & Alerts
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 flex-1 overflow-hidden">
        {/* Driver Status Summary */}
        <div className="grid grid-cols-5 gap-3">
          <div className="flex flex-col items-center justify-center p-3 bg-blue-50 rounded-lg min-h-[110px]">
            <div className="text-2xl font-bold text-blue-700">
              {standbyDrivers.length}
            </div>
            <div className="text-sm text-blue-600 text-center mt-1">Standby</div>
          </div>

          <div className="flex flex-col items-center justify-center p-3 bg-green-50 rounded-lg min-h-[110px]">
            <div className="text-2xl font-bold text-green-700">
              {atStopDrivers.length}
            </div>
            <div className="text-sm text-green-600 text-center mt-1">At Stop</div>
          </div>

          <div className="flex flex-col items-center justify-center p-3 bg-orange-50 rounded-lg min-h-[110px]">
            <div className="text-2xl font-bold text-orange-700">
              {warningDrivers.length}
            </div>
            <div className="text-sm text-orange-600 text-center mt-1">Warnings</div>
          </div>

          <div className="flex flex-col items-center justify-center p-3 bg-red-50 rounded-lg min-h-[110px]">
            <div className="text-2xl font-bold text-red-700">
              {detentionDrivers.length}
            </div>
            <div className="text-sm text-red-600 text-center mt-1">Detention</div>
          </div>

          <div className="flex flex-col items-center justify-center p-3 bg-yellow-50 rounded-lg min-h-[110px]">
            <div className="text-2xl font-bold text-yellow-700">
              {reminderDriverCount}
            </div>
            <div className="text-sm text-yellow-600 text-center mt-1">Reminders</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}