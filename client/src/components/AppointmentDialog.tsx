import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DriverWithLocation } from "@shared/schema";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverWithLocation | null;
}

export function AppointmentDialog({ open, onOpenChange, driver }: AppointmentDialogProps) {
  const { toast } = useToast();
  const [appointmentTime, setAppointmentTime] = useState("");

  useEffect(() => {
    if (driver?.currentLocation?.appointmentTime) {
      // Convert stored UTC time back to CST for display
      const utcDate = new Date(driver.currentLocation.appointmentTime);
      const now = new Date();
      const cstOffset = now.getTimezoneOffset() === 300 ? 5 : 6; // CST is UTC-6, CDT is UTC-5
      const cstHours = (utcDate.getUTCHours() - cstOffset + 24) % 24;
      const formatted = String(cstHours).padStart(2, '0') + ':' + 
        String(utcDate.getUTCMinutes()).padStart(2, '0');
      setAppointmentTime(formatted);
    } else {
      // Clear the field if no appointment exists
      setAppointmentTime("");
    }
  }, [driver, open]);

  const setAppointmentMutation = useMutation({
    mutationFn: async (data: { appointmentTime: string }) => {
      return apiRequest('POST', `/api/drivers/${driver?.id}/appointment`, { 
        appointmentTime: data.appointmentTime,
        timezoneOffsetMinutes: new Date().getTimezoneOffset()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "Appointment Set",
        description: "Driver appointment time has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set appointment time. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentTime) {
      toast({
        title: "Error",
        description: "Please select an appointment time.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(appointmentTime)) {
      toast({
        title: "Error",
        description: "Please enter a valid time in HH:MM format (24-hour).",
        variant: "destructive",
      });
      return;
    }
    
    setAppointmentMutation.mutate({ appointmentTime });
  };

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Appointment Time - {driver.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Current Location: <span className="font-medium">{driver.currentLocation?.location || 'Unknown'}</span>
            </p>
            {driver.currentLocation?.appointmentTime && (
              <p className="text-sm text-blue-600">
                Current appointment today: {(() => {
                  // Convert UTC appointment time to user's local time for display
                  const utcDate = new Date(driver.currentLocation.appointmentTime);
                  const now = new Date();
                  const timezoneOffsetMinutes = now.getTimezoneOffset(); // Positive for timezones west of UTC
                  const localHours = (utcDate.getUTCHours() - (timezoneOffsetMinutes / 60) + 24) % 24;
                  const hour = String(localHours).padStart(2, '0');
                  const minute = String(utcDate.getUTCMinutes()).padStart(2, '0');
                  return `${hour}:${minute} CST`;
                })()}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="appointment-time">Appointment Time Today (24-hour CST format)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="appointment-time"
                type="text"
                placeholder="HH:MM (e.g., 14:30)"
                value={appointmentTime}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9:]/g, '');
                  if (value.length === 2 && !value.includes(':')) {
                    value += ':';
                  }
                  if (value.length <= 5) {
                    setAppointmentTime(value);
                  }
                }}
                className="flex-1 font-mono"
                maxLength={5}
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter time in 24-hour CST format (15:00 = 3:00 PM CST). Same-day appointments only.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={setAppointmentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={setAppointmentMutation.isPending}
            >
              {setAppointmentMutation.isPending ? "Setting..." : "Set Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}