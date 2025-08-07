import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { LiveDurationDisplay } from "./LiveDurationDisplay";
import type { DriverWithLocation } from "@shared/schema";

interface DetentionVisualizationProps {
  drivers: DriverWithLocation[];
}

export function DetentionVisualization({ drivers }: DetentionVisualizationProps) {
  const [animatedStats, setAnimatedStats] = useState({
    totalDetentionMinutes: 0,
    driversInDetention: 0,
    averageDetentionTime: 0,
  });

  // Calculate detention statistics
  const detentionStats = drivers.reduce(
    (stats, driver) => {
      if (driver.status === 'detention') {
        stats.totalDetentionMinutes += driver.detentionMinutes || 0;
        stats.driversInDetention += 1;
      }
      // Include completed loads with detention - only if they had both appointment and departure times
      if (driver.currentLocation?.departureTime &&
          driver.currentLocation?.appointmentTime &&
          driver.detentionMinutes &&
          driver.detentionMinutes > 0) {
        stats.totalDetentionMinutes += driver.detentionMinutes;
        stats.completedWithDetention += 1;
      }
      return stats;
    },
    { totalDetentionMinutes: 0, driversInDetention: 0, completedWithDetention: 0 }
  );

  const totalDetentionCases = detentionStats.driversInDetention + detentionStats.completedWithDetention;
  const averageDetentionTime = totalDetentionCases > 0
    ? Math.round(detentionStats.totalDetentionMinutes / totalDetentionCases)
    : 0;


  // Animate numbers - simplified to avoid stuck animations
  useEffect(() => {
    const targetStats = {
      totalDetentionMinutes: detentionStats.totalDetentionMinutes,
      driversInDetention: detentionStats.driversInDetention,
      averageDetentionTime,
    };

    // Use a timeout to simulate animation effect but ensure values update
    const timer = setTimeout(() => {
      setAnimatedStats(targetStats);
    }, 100);

    return () => clearTimeout(timer);
  }, [detentionStats.totalDetentionMinutes, detentionStats.driversInDetention, averageDetentionTime]);

  // Get drivers with active detention progress
  const driversWithProgress = drivers.filter(d =>
    d.currentLocation?.appointmentTime && !d.currentLocation?.departureTime
  );

  return (
    <Card className="border border-gray-200 h-[32rem] flex flex-col">
      <CardHeader className="pb-4 flex-shrink-0">
        <CardTitle className="flex items-center text-lg font-semibold text-gray-800">
          <TrendingUp className="h-5 w-5 mr-2 text-red-600" />
          Detention Analytics
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 flex-1 flex flex-col overflow-hidden">
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col items-center justify-center p-3 bg-red-50 rounded-lg min-h-[110px]">
            <div className="text-2xl font-bold text-red-700">
              {animatedStats.driversInDetention}
            </div>
            <div className="text-sm text-red-600 text-center mt-1">Detention</div>
          </div>

          <div className="flex flex-col items-center justify-center p-3 bg-orange-50 rounded-lg min-h-[110px]">
            <div className="text-2xl font-bold text-orange-700">
              {animatedStats.totalDetentionMinutes}
            </div>
            <div className="text-sm text-orange-600 text-center mt-1">Total Minutes</div>
          </div>

          <div className="flex flex-col items-center justify-center p-3 bg-blue-50 rounded-lg min-h-[110px]">
            <div className="text-2xl font-bold text-blue-700">
              {animatedStats.averageDetentionTime}
            </div>
            <div className="text-sm text-blue-600 text-center mt-1">Avg Minutes</div>
          </div>

          <div className="flex flex-col items-center justify-center p-2 bg-red-50 rounded-lg min-h-[110px]">
            <div className="text-lg font-bold text-red-700 leading-tight">
              ${(drivers.reduce((total, driver) => {
                const cost = driver.detentionCost || 0;
                return total + (typeof cost === 'number' && !isNaN(cost) ? cost : 0);
              }, 0)).toFixed(2)}
            </div>
            <div className="text-xs text-red-600 text-center mt-1">Total Cost</div>
          </div>
        </div>

        {/* Active Detention Progress */}
        {driversWithProgress.length > 0 && (
          <div className="space-y-3 flex-1 overflow-hidden">
            <h4 className="text-sm font-medium text-gray-700">Active Progress</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {driversWithProgress.map((driver) => (
                <DetentionMiniProgress key={driver.id} driver={driver} />
              ))}
            </div>
          </div>
        )}

        {/* Summary Message */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            {detentionStats.driversInDetention > 0 ? (
              <span className="text-red-600 font-medium">
                {detentionStats.driversInDetention} driver{detentionStats.driversInDetention !== 1 ? 's' : ''} currently in detention
              </span>
            ) : (
              <span className="text-green-600">
                All drivers within schedule limits
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini progress component for the dashboard
function DetentionMiniProgress({ driver }: { driver: DriverWithLocation }) {
  const [currentSeconds, setCurrentSeconds] = useState(0);

  if (!driver.currentLocation?.appointmentTime) return null;

  // Add seconds counter for all active drivers with appointments
  useEffect(() => {
    if ((driver.status === 'detention' || driver.status === 'warning' ||
         driver.status === 'at-stop' || driver.status === 'active') &&
        !driver.currentLocation?.departureTime) {
      const secondsInterval = setInterval(() => {
        setCurrentSeconds(prev => (prev + 1) % 60);
      }, 1000);

      return () => clearInterval(secondsInterval);
    } else {
      setCurrentSeconds(0);
    }
  }, [driver.status, driver.currentLocation?.departureTime]);

  // Use backend-calculated status instead of client-side logic
  let progress = 0;
  let progressColor = 'bg-green-500';

  // Calculate progress based on actual driver status
  if (driver.status === 'detention' && driver.detentionMinutes) {
    progressColor = 'bg-red-500';
    progress = Math.min((driver.detentionMinutes / 240) * 100, 100); // Max 4 hours display
  } else if (driver.status === 'warning') {
    progressColor = 'bg-orange-500';
    // For warning status, show progress based on time to detention
    if (driver.timeToDetention && driver.timeToDetention.includes('m to detention')) {
      const minutesLeft = parseInt(driver.timeToDetention);
      progress = Math.max(100 - (minutesLeft / 30) * 100, 0); // 30 minute warning period
    } else {
      progress = 50; // Default warning progress
    }
  } else if (driver.status === 'at-stop') {
    progressColor = 'bg-green-500';
    progress = 25; // Show some progress for at-stop status
  } else if (driver.status === 'active') {
    progressColor = 'bg-blue-500';
    progress = 0; // Safe, no progress needed
  }

  return (
    <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
      <div className="flex-shrink-0">
        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
          {driver.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">
          {driver.name}
        </div>
        <Progress
          value={progress}
          className="h-1 mt-1"
          indicatorClassName={progressColor}
        />
      </div>

      <div className="flex-shrink-0 text-xs text-gray-600">
        {driver.status === 'detention' ? (
          <span className="text-red-600 font-medium">
            <LiveDurationDisplay driver={driver} />
          </span>
        ) : driver.status === 'warning' ? (
          <span className="text-orange-600">Warning</span>
        ) : (
          <span className="text-green-600">On Time</span>
        )}
      </div>
    </div>
  );
}