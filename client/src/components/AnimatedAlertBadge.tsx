import { forwardRef } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnimatedAlertBadgeProps {
  alertCount: number;
  criticalCount: number;
  warningCount: number;
  reminderCount: number;
  onClick: () => void;
  className?: string;
}

export const AnimatedAlertBadge = forwardRef<HTMLButtonElement, AnimatedAlertBadgeProps>(({
  alertCount,
  criticalCount,
  warningCount,
  reminderCount,
  onClick,
  className = ""
}, ref) => {

  // Determine badge color based on alert severity
  const getBadgeColor = () => {
    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    if (reminderCount > 0) return 'reminder';
    return 'normal';
  };

  const badgeColor = getBadgeColor();

  const colorClasses = {
    critical: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200',
    warning: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200',
    reminder: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border-yellow-200',
    normal: 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
  };

  return (
    <Button
      ref={ref}
      variant="ghost"
      onClick={onClick}
      className={`
        flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 border
        ${colorClasses[badgeColor]}
        ${alertCount > 0 ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      <span className="text-sm mr-1">
        {badgeColor === 'critical' ? '🔴' : badgeColor === 'warning' ? '⚠️' : badgeColor === 'reminder' ? '⏰' : '🔔'}
      </span>
      <Clock className="h-4 w-4 mr-1" />
      <span className="transition-all duration-200">
        {alertCount} Alert{alertCount !== 1 ? 's' : ''}
      </span>

      {/* Severity indicators */}
      {alertCount > 0 && (
        <div className="ml-2 flex space-x-1">
          {criticalCount > 0 && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title={`${criticalCount} Critical`} />
          )}
          {warningCount > 0 && (
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title={`${warningCount} Warning`} />
          )}
          {reminderCount > 0 && (
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title={`${reminderCount} Reminder`} />
          )}
        </div>
      )}
    </Button>
  );
});

AnimatedAlertBadge.displayName = 'AnimatedAlertBadge';