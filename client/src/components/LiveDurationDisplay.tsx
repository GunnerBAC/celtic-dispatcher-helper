import React, { useEffect, useState } from "react";
import type { DriverWithLocation } from "@shared/schema";

interface LiveDurationDisplayProps {
  driver: DriverWithLocation;
  className?: string;
  showDetentionStartTime?: boolean;
}

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

export function LiveDurationDisplay({ driver, className = "", showDetentionStartTime = true }: LiveDurationDisplayProps) {
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Calculate real-time seconds for active drivers - resistant to browser throttling
  useEffect(() => {
    if (!driver.currentLocation?.appointmentTime || driver.currentLocation?.departureTime) {
      setCurrentSeconds(0);
      return;
    }

    // Run seconds counter for all active drivers with appointments
    if (driver.status === 'detention' || driver.status === 'warning' ||
        driver.status === 'at-stop' || driver.status === 'active') {
      // Calculate the seconds offset based on appointment time
      const appointmentTime = new Date(driver.currentLocation.appointmentTime);
      const stopType = driver.currentLocation.stopType || 'regular';

      let detentionHours = 2; // Default for regular stops
      switch (stopType) {
        case 'multi-stop':
        case 'rail':
          detentionHours = 1;
          break;
        case 'no-billing':
          detentionHours = 0.25; // 15 minutes
          break;
        case 'drop-hook':
          detentionHours = 0.5; // 30 minutes
          break;
      }

      const detentionStartTime = new Date(appointmentTime.getTime() + (detentionHours * 60 * 60 * 1000));

      const updateSeconds = () => {
        const now = new Date();

        // Always calculate based on current time to avoid browser throttling issues
        if (driver.status === 'detention') {
          // Calculate seconds since detention started
          const timeSinceDetention = now.getTime() - detentionStartTime.getTime();
          const seconds = Math.floor((timeSinceDetention % (1000 * 60)) / 1000);
          setCurrentSeconds(seconds);
        } else if (driver.status === 'warning') {
          // Calculate seconds until detention
          const timeToDetention = detentionStartTime.getTime() - now.getTime();
          const seconds = Math.floor((timeToDetention % (1000 * 60)) / 1000);
          setCurrentSeconds(seconds);
        } else if (driver.status === 'active' || driver.status === 'at-stop') {
          // Calculate seconds until detention starts (for "on time" and "at-stop" status)
          const timeToDetention = detentionStartTime.getTime() - now.getTime();
          const seconds = Math.floor((timeToDetention % (1000 * 60)) / 1000);
          setCurrentSeconds(seconds);
        }

        setLastUpdateTime(now.getTime());
      };

      // Update immediately and then every second
      updateSeconds();
      const interval = setInterval(updateSeconds, 1000);

      // Also update on visibility change to handle tab switching
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          // Tab became visible again - immediately update to catch up
          updateSeconds();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', updateSeconds);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', updateSeconds);
      };
    } else {
      setCurrentSeconds(0);
    }
  }, [driver.status, driver.currentLocation?.appointmentTime, driver.currentLocation?.departureTime, driver.currentLocation?.stopType]);

  // Parse the backend duration to extract base values and add real-time seconds
  const formatDurationWithSeconds = () => {
    if (!driver.duration) return '-';

    // For completed drivers, return as-is (no real-time updates)
    if (driver.currentLocation?.departureTime) {
      return driver.duration;
    }

    const duration = driver.duration;

    // For detention status, add live seconds
    if (driver.status === 'detention' && duration.includes('detention')) {
      // Extract the time part before 'detention'
      const timePart = duration.split(' detention')[0];
      const detentionSuffix = ' detention';

      // If it already has seconds, replace them with live seconds
      if (timePart.includes('s')) {
        const withoutSeconds = timePart.replace(/\d+s/, '');
        return `${withoutSeconds}${currentSeconds}s${detentionSuffix}`;
      } else {
        // Add seconds to existing time
        return `${timePart} ${currentSeconds}s${detentionSuffix}`;
      }
    }

    // For warning status, add live seconds countdown
    if (driver.status === 'warning' && duration.includes('to detention')) {
      // Extract the time part before 'to detention'
      const timePart = duration.split(' to detention')[0];

      // If it already has seconds, replace them with live seconds
      if (timePart.includes('s')) {
        const withoutSeconds = timePart.replace(/\d+s/, '');
        return `${withoutSeconds}${currentSeconds}s to detention`;
      } else {
        // Add seconds to existing time
        return `${timePart} ${currentSeconds}s to detention`;
      }
    }

    // For active status (standby) and at-stop, add live seconds countdown
    if ((driver.status === 'active' || driver.status === 'at-stop') &&
        (duration.includes('to detention') || duration.includes('At stop'))) {
      // Extract the time part before 'to detention' or process "At stop" format
      if (duration.includes('At stop')) {
        const match = duration.match(/At stop \((\d+h )?(\d+m )?(\d+s )?to detention\)/);
        if (match) {
          const hours = match[1] || '';
          const minutes = match[2] || '';
          // Backend already sends "At stop (...)" - just replace the seconds part
          const result = `At stop (${hours}${minutes}${currentSeconds}s to detention)`;
          return result;
        }
      } else if (duration.includes('to detention')) {
        const timePart = duration.split(' to detention')[0];

        // If it already has seconds, replace them with live seconds
        if (timePart.includes('s')) {
          const withoutSeconds = timePart.replace(/\d+s/, '');
          return `${withoutSeconds}${currentSeconds}s to detention`;
        } else {
          // Add seconds to existing time
          return `${timePart} ${currentSeconds}s to detention`;
        }
      }
    }

    // For all other cases (safe periods, completed), return as-is
    return duration;
  };

  // Get detention start time for second line display
  const getDetentionStartTimeSecondLine = () => {
    if (!driver.currentLocation?.appointmentTime) return null;
    const appointmentTime = new Date(driver.currentLocation.appointmentTime);
    const stopType = driver.currentLocation.stopType || 'regular';
    const detentionStartTime = calculateDetentionStartTime(appointmentTime, stopType);

    // Change "starts" to "started" when in detention
    const label = driver.status === 'detention' ? 'started' : 'starts';
    return `Detention ${label}: ${detentionStartTime}`;
  };

  return (
    <div className={className}>
      <div>{formatDurationWithSeconds()}</div>
      {showDetentionStartTime && getDetentionStartTimeSecondLine() && (
        <div className="text-xs text-gray-500 mt-1">
          {getDetentionStartTimeSecondLine()}
        </div>
      )}
    </div>
  );
}