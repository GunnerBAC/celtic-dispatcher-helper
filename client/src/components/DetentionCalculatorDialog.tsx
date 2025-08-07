import { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DetentionCalculatorDialogProps {
  children?: React.ReactNode;
}

export function DetentionCalculatorDialog({ children }: DetentionCalculatorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [stopType, setStopType] = useState("regular");

  // Clear all inputs when dialog opens
  useEffect(() => {
    if (isOpen) {
      setAppointmentTime("");
      setDepartureTime("");
      setStopType("regular");
    }
  }, [isOpen]);

  const calculateDetention = () => {
    if (!appointmentTime || !departureTime) return null;

    // Parse times as today's date with the given times
    const today = new Date().toISOString().split('T')[0];
    const appointment = new Date(`${today}T${appointmentTime}`);
    const departure = new Date(`${today}T${departureTime}`);

    // Validate times
    if (isNaN(appointment.getTime()) || isNaN(departure.getTime())) {
      return null;
    }

    // Calculate detention threshold based on stop type
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

    const detentionStartTime = new Date(appointment.getTime() + (detentionHours * 60 * 60 * 1000));

    if (departure > detentionStartTime) {
      const detentionMs = departure.getTime() - detentionStartTime.getTime();
      const detentionMinutes = Math.floor(detentionMs / (1000 * 60));
      const detentionCost = detentionMinutes * 1.25;

      return {
        detentionMinutes,
        detentionCost,
        detentionHours: Math.floor(detentionMinutes / 60),
        detentionRemainingMinutes: detentionMinutes % 60,
        detentionStartTime,
        hasDetention: true
      };
    }

    return {
      detentionMinutes: 0,
      detentionCost: 0,
      detentionHours: 0,
      detentionRemainingMinutes: 0,
      detentionStartTime,
      hasDetention: false
    };
  };

  const result = calculateDetention();

  const getStopTypeLabel = (type: string) => {
    switch (type) {
      case 'multi-stop': return 'Multi-Stop (1hr)';
      case 'rail': return 'Rail (1hr)';
      case 'no-billing': return 'No Billing (15min)';
      case 'drop-hook': return 'Drop/Hook (30min)';
      default: return 'Regular (2hr)';
    }
  };

  const formatTime = (date: Date) => {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            size="sm"
            className="action-button flex items-center space-x-1 h-9 px-3 bg-yellow-400 border-yellow-500 hover:bg-yellow-500 hover:border-yellow-600 text-yellow-900 hover:scale-110 transition-all duration-200 shadow-md hover:shadow-lg"
            title="Calculate detention time and cost"
          >
            <Calculator className="h-4 w-4" />
            <span className="hidden md:inline">Detention Time/Cost Calc</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-orange-600" />
            <span>Detention Time & Cost Calculator</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="appointment">Appointment Time (24hr format)</Label>
              <Input
                id="appointment"
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
                className="mt-1 font-mono"
                maxLength={5}
              />
            </div>
            <div>
              <Label htmlFor="departure">Departure Time (24hr format)</Label>
              <Input
                id="departure"
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
                className="mt-1 font-mono"
                maxLength={5}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="stopType">Stop Type</Label>
            <Select value={stopType} onValueChange={setStopType}>
              <SelectTrigger className={`mt-1 ${
                stopType === 'regular' ? 'bg-gray-50 text-gray-800 border-gray-200' :
                stopType === 'multi-stop' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                stopType === 'rail' ? 'bg-green-50 text-green-800 border-green-200' :
                stopType === 'no-billing' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                stopType === 'drop-hook' ? 'bg-orange-50 text-orange-800 border-orange-200' :
                ''
              }`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular" className="bg-gray-100 text-gray-800 hover:bg-gray-200 focus:bg-gray-200">
                  Regular (2hr detention)
                </SelectItem>
                <SelectItem value="multi-stop" className="bg-blue-50 text-blue-800 hover:bg-blue-100 focus:bg-blue-100">
                  Multi-Stop (1hr detention)
                </SelectItem>
                <SelectItem value="rail" className="bg-green-50 text-green-800 hover:bg-green-100 focus:bg-green-100">
                  Rail (1hr detention)
                </SelectItem>
                <SelectItem value="no-billing" className="bg-purple-50 text-purple-800 hover:bg-purple-100 focus:bg-purple-100">
                  No Billing (15min detention)
                </SelectItem>
                <SelectItem value="drop-hook" className="bg-orange-50 text-orange-800 hover:bg-orange-100 focus:bg-orange-100">
                  Drop/Hook (30min detention)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {result && appointmentTime && departureTime && (
            <Card className={result.hasDetention ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Stop Type:</span>
                    <span className="text-sm">{getStopTypeLabel(stopType)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Detention Starts:</span>
                    <span className="text-sm font-mono">{formatTime(result.detentionStartTime)}</span>
                  </div>

                  {result.hasDetention ? (
                    <div className="space-y-2 pt-2 border-t border-red-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-700">Detention Time:</span>
                        <span className="font-bold text-red-700">
                          {result.detentionHours}h {result.detentionRemainingMinutes}m
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-700">Total Minutes:</span>
                        <span className="font-bold text-red-700">{result.detentionMinutes} min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-700">Detention Cost:</span>
                        <span className="font-bold text-red-700 text-lg">
                          ${result.detentionCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-red-600 text-center mt-2">
                        Rate: $1.25 per minute
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-green-200">
                      <div className="text-center">
                        <span className="font-bold text-green-700">No Detention</span>
                        <div className="text-sm text-green-600 mt-1">
                          Departed before detention period
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {(!appointmentTime || !departureTime) && (
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="p-4">
                <div className="text-center text-gray-600">
                  <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Enter appointment and departure times to calculate detention</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAppointmentTime("");
                setDepartureTime("");
                setStopType("regular");
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              Clear All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}