import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { DriverWithLocation, InsertDriver } from "@shared/schema";

interface EditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverWithLocation | null;
}

export function EditDriverDialog({ open, onOpenChange, driver }: EditDriverDialogProps) {
  const [formData, setFormData] = useState({
    truckNumber: "",
    name: "",
    dispatcher: "Dean",
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update form when driver changes
  useEffect(() => {
    if (driver) {
      setFormData({
        truckNumber: driver.truckNumber || "",
        name: driver.name,
        dispatcher: driver.dispatcher || "Dean",
        isActive: driver.isActive,
      });
    }
  }, [driver]);

  const updateDriverMutation = useMutation({
    mutationFn: async (data: Partial<InsertDriver>) => {
      if (!driver) throw new Error("No driver selected");
      return apiRequest("PUT", `/api/drivers/${driver.id}`, {
        ...data,
        vehicle: data.truckNumber || driver.truckNumber, // Use truck number as vehicle
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({
        title: "Success",
        description: "Driver updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update driver",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) return;

    updateDriverMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Driver</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-truckNumber">Truck #</Label>
            <Input
              id="edit-truckNumber"
              type="text"
              value={formData.truckNumber}
              onChange={(e) => handleInputChange("truckNumber", e.target.value)}
              placeholder="Enter truck number (e.g., 1052)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-name">Driver Name</Label>
            <Input
              id="edit-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter driver name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-dispatcher">Dispatcher</Label>
            <Select value={formData.dispatcher} onValueChange={(value) => handleInputChange("dispatcher", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select dispatcher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dean">Dean</SelectItem>
                <SelectItem value="Matt">Matt</SelectItem>
                <SelectItem value="Taiwan">Taiwan</SelectItem>
                <SelectItem value="Alen">Alen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="edit-active"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleInputChange("isActive", e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="edit-active">Active Driver</Label>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateDriverMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateDriverMutation.isPending}
            >
              {updateDriverMutation.isPending ? "Updating..." : "Update Driver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}