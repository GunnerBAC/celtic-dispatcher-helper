import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DriverWithLocation } from "@shared/schema";

interface DepartureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverWithLocation | null;
}

export function DepartureDialog({ open, onOpenChange, driver }: DepartureDialogProps) {
  const { toast } = useToast();
  const [departureTime, setDepartureTime] = useState("");

  useEffect(() => {
    if (open) {
      // Clear the field when dialog opens
      setDepartureTime("");
    }
  }, [open]);

  const setDepartureMutation = useMutation({
    mutationFn: async (data: { departureTime: string }) => {
      return apiRequest('POST', `/api/drivers/${driver?.id}/departure`, {
        departureTime: data.departureTime,
        timezoneOffsetMinutes: new Date().getTimezoneOffset()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "Departure Time Set",
        description: "Driver departure time has been recorded successfully.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set departure time. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!departureTime) {
      toast({
        title: "Error",
        description: "Please select a departure time.",
        variant: "destructive",
      });
      return;
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(departureTime)) {
      toast({
        title: "Error",
        description: "Please enter a valid time in HH:MM format (24-hour).",
        variant: "destructive",
      });
      return;
    }

    setDepartureMutation.mutate({ departureTime });
  };

  const calculateDetentionMinutes = () => {
    if (!driver?.currentLocation?.appointmentTime || !departureTime) return null;

    const appointmentTime = new Date(driver.currentLocation.appointmentTime);
    const stopType = driver.currentLocation.stopType || 'regular';

    // Set detention timing based on stop type
    let detentionHours = 2; // Default for regular stops
    switch (stopType) {
      case 'multi-stop':
        detentionHours = 1; // 1 hour detention
        break;
      case 'rail':
        detentionHours = 1; // 1 hour detention
        break;
      case 'no-billing':
        detentionHours = 0.25; // 15 minutes detention
        break;
      case 'drop-hook':
        detentionHours = 0.5; // 30 minutes detention
        break;
      default: // 'regular'
        detentionHours = 2; // 2 hours detention
    }

    const detentionStartTime = new Date(appointmentTime.getTime() + (detentionHours * 60 * 60 * 1000));

    // Create today's date with the provided time in CST
    const timeOnly = departureTime.includes('T') ? departureTime.split('T')[1] : departureTime;
    const [hours, minutes] = timeOnly.split(':').map(Number);

    // Convert user timezone to UTC - add timezone offset to get UTC time
    const now = new Date();
    const timezoneOffsetMinutes = now.getTimezoneOffset(); // Positive for timezones west of UTC
    const utcHours = (hours + (timezoneOffsetMinutes / 60) + 24) % 24;

    // Create date in UTC for calculation
    const departureDate = new Date();
    departureDate.setUTCHours(utcHours, minutes, 0, 0);

    if (departureDate > detentionStartTime) {
      const detentionMs = departureDate.getTime() - detentionStartTime.getTime();
      const detentionMinutes = Math.floor(detentionMs / (1000 * 60));
      return detentionMinutes;
    }
    return 0;
  };

  const detentionMinutes = calculateDetentionMinutes();
  const detentionCost = detentionMinutes && detentionMinutes > 0 ? detentionMinutes * 1.25 : 0;

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Departure Time - {driver.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Current Location: <span className="font-medium">{driver.currentLocation?.location || 'Unknown'}</span>
            </p>
            {driver.currentLocation?.appointmentTime && (
              <div className="space-y-1">
                <p className="text-sm text-blue-600">
                  Appointment: {(() => {
                    // Convert UTC appointment time to user's local time for display
                    const utcDate = new Date(driver.currentLocation.appointmentTime);
                    const now = new Date();
                    const timezoneOffsetMinutes = now.getTimezoneOffset(); // Positive for timezones west of UTC
                    const localHours = (utcDate.getUTCHours() - (timezoneOffsetMinutes / 60) + 24) % 24;
                    const year = utcDate.getFullYear();
                    const month = String(utcDate.getMonth() + 1).padStart(2, '0');
                    const day = String(utcDate.getDate()).padStart(2, '0');
                    const hour = String(localHours).padStart(2, '0');
                    const minute = String(utcDate.getUTCMinutes()).padStart(2, '0');
                    return `${month}/${day}/${year}, ${hour}:${minute} CST`;
                  })()}
                </p>
                <p className="text-sm text-orange-600">
                  Detention started: {(() => {
                    // Calculate detention start time based on stop type and convert to CST
                    const utcDate = new Date(driver.currentLocation.appointmentTime);
                    const stopType = driver.currentLocation.stopType || 'regular';

                    // Set detention timing based on stop type
                    let detentionHours = 2; // Default for regular stops
                    switch (stopType) {
                      case 'multi-stop':
                        detentionHours = 1; // 1 hour detention
                        break;
                      case 'rail':
                        detentionHours = 1; // 1 hour detention
                        break;
                      case 'no-billing':
                        detentionHours = 0.25; // 15 minutes detention
                        break;
                      case 'drop-hook':
                        detentionHours = 0.5; // 30 minutes detention
                        break;
                      default: // 'regular'
                        detentionHours = 2; // 2 hours detention
                    }

                    const detentionStart = new Date(utcDate.getTime() + (detentionHours * 60 * 60 * 1000));
                    const now = new Date();
                    const timezoneOffsetMinutes = now.getTimezoneOffset(); // Positive for timezones west of UTC
                    const detentionLocalHours = (detentionStart.getUTCHours() - (timezoneOffsetMinutes / 60) + 24) % 24;
                    const year = detentionStart.getFullYear();
                    const month = String(detentionStart.getMonth() + 1).padStart(2, '0');
                    const day = String(detentionStart.getDate()).padStart(2, '0');
                    const hour = String(detentionLocalHours).padStart(2, '0');
                    const minute = String(detentionStart.getUTCMinutes()).padStart(2, '0');
                    return `${month}/${day}/${year}, ${hour}:${minute} CST`;
                  })()}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="departure-time">Departure Time Today (24-hour CST format)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="departure-time"
                type="text"
                placeholder="HH:MM (e.g., 16:45)"
                value={departureTime}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9:]/g, '');
                  if (value.length === 2 && !value.includes(':')) {
                    value += ':';
                  }
                  if (value.length <= 5) {
                    setDepartureTime(value);
                  }
                }}
                className="flex-1 font-mono"
                maxLength={5}
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter time in 24-hour CST format (16:45 = 4:45 PM CST). Same-day departures only.
            </p>
          </div>

          {detentionMinutes !== null && departureTime && (
            <Card className={detentionMinutes > 0 ? "border-orange-200" : "border-green-200"}>
              <CardContent className="p-3">
                <div className="text-sm">
                  <p className="font-medium">Detention Summary:</p>
                  {detentionMinutes > 0 ? (
                    <div className="text-orange-700">
                      <p>
                        <span className="font-bold">{detentionMinutes} total minutes</span> in detention
                        <br />
                        ({Math.floor(detentionMinutes / 60)}h {detentionMinutes % 60}m)
                      </p>
                      <p className="font-bold text-red-700 mt-2">
                        Detention Cost: ${detentionCost.toFixed(2)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-green-700">No detention time - departed before detention limit</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={setDepartureMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={setDepartureMutation.isPending}
            >
              {setDepartureMutation.isPending ? "Recording..." : "Record Departure"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}