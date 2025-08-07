import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertDriverSchema } from "@shared/schema";
import { z } from "zod";

interface AddDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDriverDialog({ open, onOpenChange }: AddDriverDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    truckNumber: "",
    name: "",
    dispatcher: "Dean",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addDriverMutation = useMutation({
    mutationFn: async (driverData: typeof formData) => {
      return apiRequest('POST', '/api/drivers', {
        ...driverData,
        vehicle: driverData.truckNumber, // Use truck number as vehicle
        dispatcher: driverData.dispatcher,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "Driver Added",
        description: "New driver has been added successfully.",
      });
      onOpenChange(false);
      setFormData({ truckNumber: "", name: "", dispatcher: "Dean" });
      setErrors({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to add driver. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Transform the form data to match the schema before validation
      const driverData = {
        ...formData,
        vehicle: formData.truckNumber, // Use truck number as vehicle
        dispatcher: formData.dispatcher,
        isActive: true,
      };

      insertDriverSchema.parse(driverData);
      setErrors({});
      addDriverMutation.mutate(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            // Map 'vehicle' errors back to 'truckNumber' field
            const fieldName = err.path[0] === 'vehicle' ? 'truckNumber' : err.path[0] as string;
            newErrors[fieldName] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Driver</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="truckNumber">Truck #</Label>
            <Input
              id="truckNumber"
              value={formData.truckNumber}
              onChange={(e) => handleInputChange("truckNumber", e.target.value)}
              placeholder="Enter truck number (e.g., 1052)"
              className={errors.truckNumber ? "border-red-500" : ""}
            />
            {errors.truckNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.truckNumber}</p>
            )}
          </div>

          <div>
            <Label htmlFor="name">Driver Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter driver name"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="dispatcher">Dispatcher</Label>
            <Select value={formData.dispatcher} onValueChange={(value) => handleInputChange("dispatcher", value)}>
              <SelectTrigger className={errors.dispatcher ? "border-red-500" : ""}>
                <SelectValue placeholder="Select dispatcher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dean">Dean</SelectItem>
                <SelectItem value="Matt">Matt</SelectItem>
                <SelectItem value="Taiwan">Taiwan</SelectItem>
                <SelectItem value="Alen">Alen</SelectItem>
              </SelectContent>
            </Select>
            {errors.dispatcher && (
              <p className="text-sm text-red-500 mt-1">{errors.dispatcher}</p>
            )}
          </div>


          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addDriverMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addDriverMutation.isPending}
            >
              {addDriverMutation.isPending ? "Adding..." : "Add Driver"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
