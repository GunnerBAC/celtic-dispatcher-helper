import React, { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle } from "lucide-react";
import { LiveDurationDisplay } from "./LiveDurationDisplay";
import type { DriverWithLocation } from "@shared/schema";

// Utility function to calculate detention start time
const calculateDetentionStartTime = (appointmentTime: Date, stopType: string): string => {
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

  const detentionStartTime = new Date(appointmentTime.getTime() + (detentionThresholdMinutes * 60 * 1000));

  // Convert to local time for display
  const now = new Date();
  const timezoneOffsetMinutes = now.getTimezoneOffset();
  const localHours = (detentionStartTime.getUTCHours() - (timezoneOffsetMinutes / 60) + 24) % 24;
  const hour = String(localHours).padStart(2, '0');
  const minute = String(detentionStartTime.getUTCMinutes()).padStart(2, '0');
  return `${hour}:${minute} CST`;
};

interface DetentionProgressBarProps {
  driver: DriverWithLocation;
  className?: string;
}

export function DetentionProgressBar({ driver, className = "" }: DetentionProgressBarProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [animatedMinutes, setAnimatedMinutes] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [previousMinutes, setPreviousMinutes] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const calculateProgress = () => {
    if (!driver.currentLocation?.appointmentTime) return null;

    // If driver has departed, use the stored final detention values
    if (driver.currentLocation?.departureTime) {
      // For completed drivers, check both sources for detention data
      const finalDetentionMinutes = driver.currentLocation.finalDetentionMinutes || driver.detentionMinutes || 0;
      const finalDetentionCost = driver.currentLocation.finalDetentionCost || driver.detentionCost || (finalDetentionMinutes * 1.25);
      const maxDetentionDisplay = 240; // 4 hours max display
      const progress = Math.min((finalDetentionMinutes / maxDetentionDisplay) * 100, 100);

      return {
        progress: finalDetentionMinutes > 0 ? Math.max(progress, 10) : 0, // Show at least 10% if there was detention
        phase: finalDetentionMinutes > 0 ? 'detention' as const : 'safe' as const,
        timeToDetention: 0,
        detentionMinutes: finalDetentionMinutes,
        message: finalDetentionMinutes > 0
          ? `Completed (${finalDetentionMinutes} min detention)`
          : 'Completed (No detention)',
        detentionCost: finalDetentionCost
      };
    }

    // For active drivers, use the backend-calculated values instead of client-side calculations
    const maxDetentionDisplay = 240; // 4 hours max display
    const detentionMinutes = driver.detentionMinutes || 0;
    const isInDetention = driver.isInDetention || false;

    // Determine phase based on driver status from backend with improved progress calculation
    let phase: 'safe' | 'warning' | 'detention' = 'safe';
    let message = 'On time';
    let progress = 0;

    const appointmentTime = new Date(driver.currentLocation.appointmentTime);
    const now = new Date();
    const stopType = driver.currentLocation.stopType || 'regular';

    // Calculate detention threshold based on stop type for progress calculation
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

    const detentionStartTime = new Date(appointmentTime.getTime() + (detentionThresholdMinutes * 60 * 1000));
    const timeSinceAppointment = (now.getTime() - appointmentTime.getTime()) / (1000 * 60); // minutes

    if (driver.status === 'detention' || isInDetention) {
      phase = 'detention';
      // Show increasing progress based on detention time
      if (detentionMinutes > 0) {
        progress = Math.min((detentionMinutes / maxDetentionDisplay) * 100, 100);
        progress = Math.max(progress, 15); // Minimum 15% for visibility
      } else {
        progress = 15; // Just entered detention
      }
      message = driver.duration || `${detentionMinutes} min detention`;
    } else if (driver.status === 'warning') {
      phase = 'warning';
      // Calculate progress through warning period based on actual time
      const timeToDetention = detentionStartTime.getTime() - now.getTime();
      const minutesToDetention = Math.max(0, timeToDetention / (1000 * 60));

      // Warning period progress (50-85% range)
      if (minutesToDetention <= 30 && minutesToDetention > 0) {
        progress = 50 + ((30 - minutesToDetention) / 30) * 35; // 50% to 85%
      } else {
        progress = 50;
      }
      message = driver.duration || 'Warning period';
    } else if (driver.status === 'at-stop') {
      phase = 'safe';
      // Calculate progress toward warning/detention period for at-stop drivers
      if (timeSinceAppointment > 0) {
        const progressTowardsDetention = (timeSinceAppointment / detentionThresholdMinutes) * 50; // Max 50% until warning
        progress = Math.min(Math.max(progressTowardsDetention, 0), 45); // Cap at 45% for safe period
      } else {
        progress = 0;
      }
      message = driver.duration || 'At stop';
    } else {
      phase = 'safe';
      // Calculate progress toward warning/detention period
      if (timeSinceAppointment > 0) {
        const progressTowardsDetention = (timeSinceAppointment / detentionThresholdMinutes) * 50; // Max 50% until warning
        progress = Math.min(Math.max(progressTowardsDetention, 0), 45); // Cap at 45% for safe period
      } else {
        progress = 0;
      }
      message = driver.duration || 'On time';
    }

    return {
      progress,
      phase,
      timeToDetention: 0,
      detentionMinutes,
      message,
      detentionCost: driver.detentionCost || 0
    };
  };

  const progressData = calculateProgress();

  // Animate progress bar and numbers - only for active drivers
  useEffect(() => {
    if (!progressData) return;

    const targetProgress = progressData.progress;
    const targetMinutes = progressData.detentionMinutes;
    const isCompleted = driver.currentLocation?.departureTime;

    // For completed drivers, set values immediately without animation
    if (isCompleted) {
      setAnimatedProgress(targetProgress);
      setAnimatedMinutes(targetMinutes);
      setCurrentSeconds(0);
      return;
    }

    // Trigger update animation when minutes change
    if (targetMinutes !== previousMinutes && targetMinutes > 0) {
      setIsUpdating(true);
      setPreviousMinutes(targetMinutes);
      setTimeout(() => setIsUpdating(false), 300);
    }

    // Use requestAnimationFrame for better performance and resistance to throttling
    let progressRaf: number;
    let minutesRaf: number;

    const animateProgress = () => {
      setAnimatedProgress(prev => {
        if (Math.abs(prev - targetProgress) < 1) {
          return targetProgress;
        }
        const newProgress = prev + (targetProgress - prev) * 0.15;
        progressRaf = requestAnimationFrame(animateProgress);
        return newProgress;
      });
    };

    const animateMinutes = () => {
      setAnimatedMinutes(prev => {
        if (Math.abs(prev - targetMinutes) < 1) {
          return targetMinutes;
        }
        const newMinutes = Math.round(prev + (targetMinutes - prev) * 0.2);
        minutesRaf = requestAnimationFrame(animateMinutes);
        return newMinutes;
      });
    };

    progressRaf = requestAnimationFrame(animateProgress);
    minutesRaf = requestAnimationFrame(animateMinutes);

    return () => {
      if (progressRaf) cancelAnimationFrame(progressRaf);
      if (minutesRaf) cancelAnimationFrame(minutesRaf);
    };
  }, [progressData?.progress, progressData?.detentionMinutes, driver.currentLocation?.departureTime]);

  // Add seconds counter for all active drivers with appointments
  useEffect(() => {
    if (!progressData || driver.currentLocation?.departureTime) return;

    // Run seconds counter for all active drivers with appointments
    if (driver.status === 'detention' || driver.status === 'warning' ||
        driver.status === 'at-stop' || driver.status === 'active' || driver.isInDetention) {
      const secondsInterval = setInterval(() => {
        setCurrentSeconds(prev => (prev + 1) % 60);
      }, 1000);

      return () => clearInterval(secondsInterval);
    } else {
      setCurrentSeconds(0);
    }
  }, [driver.status, driver.isInDetention, driver.currentLocation?.departureTime, progressData]);

  if (!progressData) {
    return (
      <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center text-gray-500">
          <Clock className="h-4 w-4 mr-2" />
          <span className="text-sm">No appointment set</span>
        </div>
      </div>
    );
  }

  const getPhaseStyles = () => {
    switch (progressData.phase) {
      case 'safe':
        return {
          bg: 'bg-green-50 border-green-200',
          progress: 'bg-green-500',
          text: 'text-green-800',
          icon: Clock,
          iconColor: 'text-green-600'
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 border-orange-200',
          progress: 'bg-orange-500',
          text: 'text-orange-800',
          icon: Clock,
          iconColor: 'text-orange-600'
        };
      case 'detention':
        return {
          bg: 'bg-red-50 border-red-200',
          progress: 'bg-red-500',
          text: 'text-red-800',
          icon: AlertTriangle,
          iconColor: 'text-red-600'
        };
    }
  };

  const styles = getPhaseStyles();
  const IconComponent = styles.icon;

  const containerClasses = [
    "detention-progress-container p-3 border rounded-lg",
    styles.bg,
    'hover:scale-[1.02] transition-transform duration-200',
    className
  ].filter(Boolean).join(' ');

  const progressBarClasses = [
    "h-2 bg-white/50 rounded-full overflow-hidden"
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <IconComponent className={`h-4 w-4 mr-2 ${styles.iconColor} transition-all duration-300`} />
            <span className={`text-sm font-medium ${styles.text}`}>
              {progressData.phase === 'detention' ? 'Detention Time' :
               progressData.phase === 'warning' ? 'Warning Period' : 'On Schedule'}
            </span>
          </div>
          <span className={`text-sm font-bold ${styles.text} transition-all duration-300`}>
            <LiveDurationDisplay driver={driver} showDetentionStartTime={false} />
          </span>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="space-y-1">
          <Progress
            value={animatedProgress}
            className={progressBarClasses}
            indicatorClassName={`${
              progressData.phase === 'detention' ? 'detention-progress-bar' :
              progressData.phase === 'warning' ? 'warning-progress-bar' :
              'bg-green-500'
            } transition-all duration-700 ease-out`}
          />

          {/* Enhanced Progress Labels */}
          <div className="flex justify-between text-xs text-gray-600">
            <span className="transition-colors duration-200">
              {progressData.phase === 'detention' ? 'Start' : 'Safe'}
            </span>
            <span className={`transition-all duration-300 ${isUpdating ? 'progress-number updating' : 'progress-number'}`}>
              {progressData.phase === 'detention' ?
                `${Math.round(animatedMinutes)} min` :
               progressData.phase === 'warning' ? 'Detention starts' : 'Warning'}
            </span>
          </div>
        </div>

        {/* Detention Cost */}
        {progressData.phase === 'detention' && (
          <div className="text-xs font-medium text-red-700 mt-2 bg-red-100 px-2 py-1 rounded">
            Cost: ${progressData.detentionCost.toFixed(2)}
          </div>
        )}

        {/* Timing Info */}
        <div className="space-y-1">
          {driver.currentLocation?.appointmentTime && (
            <div className="text-xs text-gray-600 opacity-80">
              Appointment: {(() => {
                // Convert UTC appointment time to user's local time for display
                const utcDate = new Date(driver.currentLocation.appointmentTime);
                const now = new Date();
                const timezoneOffsetMinutes = now.getTimezoneOffset(); // Positive for timezones west of UTC
                const localHours = (utcDate.getUTCHours() - (timezoneOffsetMinutes / 60) + 24) % 24;
                const hour = String(localHours).padStart(2, '0');
                const minute = String(utcDate.getUTCMinutes()).padStart(2, '0');
                return `${hour}:${minute} CST`;
              })()}
            </div>
          )}

          {driver.currentLocation?.appointmentTime && (
            <div className="text-xs text-orange-700 font-medium opacity-90">
              {driver.status === 'detention' || driver.isInDetention ? 'Detention Started:' : 'Detention Starts:'} {(() => {
                const appointmentTime = new Date(driver.currentLocation.appointmentTime);
                const stopType = driver.currentLocation.stopType || 'regular';
                return calculateDetentionStartTime(appointmentTime, stopType);
              })()}
            </div>
          )}

          {driver.currentLocation?.departureTime && (
            <div className="text-xs text-green-700 font-medium opacity-90">
              Departed: {(() => {
                // Convert UTC departure time to user's local time for display
                const utcDate = new Date(driver.currentLocation.departureTime);
                const now = new Date();
                const timezoneOffsetMinutes = now.getTimezoneOffset(); // Positive for timezones west of UTC
                const localHours = (utcDate.getUTCHours() - (timezoneOffsetMinutes / 60) + 24) % 24;
                const hour = String(localHours).padStart(2, '0');
                const minute = String(utcDate.getUTCMinutes()).padStart(2, '0');
                return `${hour}:${minute} CST`;
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}