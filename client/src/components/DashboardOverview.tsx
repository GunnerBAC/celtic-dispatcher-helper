import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, AlertTriangle, Truck, Bell, MapPin } from "lucide-react";
import type { DriverWithLocation, Alert } from "@shared/schema";

interface DashboardOverviewProps {
  drivers: DriverWithLocation[];
  alerts: Alert[];
}

export function DashboardOverview({ drivers, alerts }: DashboardOverviewProps) {

  const standbyDrivers = drivers.filter(d => d.status === 'active').length;
  const atStopDrivers = drivers.filter(d => d.status === 'at-stop').length;
  const warningDrivers = drivers.filter(d => d.status === 'warning').length;
  const overdueDrivers = drivers.filter(d => d.status === 'critical').length;
  const detentionDrivers = drivers.filter(d => d.status === 'detention').length;
  const totalDrivers = drivers.length;

  // Calculate reminder driver count (drivers who have active reminders)
  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  const reminderDriverIds = new Set(unreadAlerts.filter(alert => alert.type === 'reminder').map(alert => alert.driverId));
  const reminderDrivers = reminderDriverIds.size;

  const metrics = [
    {
      title: "Total Fleet",
      value: totalDrivers,
      icon: Truck,
      emoji: "🚛",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Drivers on Standby",
      value: standbyDrivers,
      icon: CheckCircle,
      emoji: "🔵",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "At Stop",
      value: atStopDrivers,
      icon: MapPin,
      emoji: "🟢",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Warnings",
      value: warningDrivers,
      icon: Clock,
      emoji: "⚠️",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      title: "Detention",
      value: detentionDrivers,
      icon: AlertTriangle,
      emoji: "🔴",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      title: "Reminders",
      value: reminderDrivers,
      icon: Bell,
      emoji: "⏰",
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
      {metrics.map((metric, index) => (
        <Card key={metric.title} className="metric-card border border-gray-200 shadow-sm hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className={`p-2 ${metric.bgColor} rounded-lg transition-all duration-300 hover:scale-110 animate-icon`}>
                <div className="flex items-center space-x-1">
                  <span className="text-lg animate-icon">{metric.emoji}</span>
                  <metric.icon className={`h-4 w-4 ${metric.iconColor} animate-icon`} />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs font-medium text-gray-500 transition-colors duration-200">{metric.title}</p>
                <p className={`text-xl font-bold text-gray-800 metric-value transition-all duration-300 ${
                  metric.value > 0 && (metric.title.includes('Warning') || metric.title.includes('Detention') || metric.title.includes('Reminder'))
                    ? 'animate-pulse'
                    : ''
                }`}>
                  {metric.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
