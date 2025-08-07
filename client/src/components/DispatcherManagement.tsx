import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

interface DispatcherManagementProps {
  selectedDispatcher: string;
  onDispatcherChange: (dispatcher: string) => void;
}

export function DispatcherManagement({ selectedDispatcher, onDispatcherChange }: DispatcherManagementProps) {
  const [newDispatcher, setNewDispatcher] = useState("");
  const { toast } = useToast();

  // Fetch current dispatchers
  const { data: dispatchers = [] } = useQuery<string[]>({
    queryKey: ['/api/dispatchers'],
  });

  // Add dispatcher mutation
  const addDispatcherMutation = useMutation({
    mutationFn: (name: string) => apiRequest('POST', '/api/dispatchers', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dispatchers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      setNewDispatcher("");
      toast({
        title: "Success",
        description: "Dispatcher added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to add dispatcher",
        variant: "destructive",
      });
    },
  });

  // Delete dispatcher mutation
  const deleteDispatcherMutation = useMutation({
    mutationFn: (name: string) => apiRequest('DELETE', `/api/dispatchers/${encodeURIComponent(name)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dispatchers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "Success",
        description: "Dispatcher removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to remove dispatcher",
        variant: "destructive",
      });
    },
  });

  const handleAddDispatcher = () => {
    if (newDispatcher.trim().length === 0) {
      toast({
        title: "Error",
        description: "Dispatcher name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    addDispatcherMutation.mutate(newDispatcher.trim());
  };

  const handleDeleteDispatcher = (name: string) => {
    if (name === selectedDispatcher) {
      onDispatcherChange("All");
    }
    deleteDispatcherMutation.mutate(name);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddDispatcher();
    }
  };

  // Sort dispatchers alphabetically
  const sortedDispatchers = dispatchers.sort();

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">Manage Dispatchers</h4>

      <div className="space-y-2">
        <div className="text-xs text-gray-600">Current dispatchers:</div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {sortedDispatchers.map(dispatcher => (
            <div key={dispatcher} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded">
              <span>{dispatcher}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDeleteDispatcher(dispatcher)}
                disabled={deleteDispatcherMutation.isPending}
                title={`Remove ${dispatcher}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {sortedDispatchers.length === 0 && (
            <div className="text-xs text-gray-500 italic">No dispatchers found</div>
          )}
        </div>

        <div className="pt-2 border-t">
          <div className="flex space-x-1">
            <Input
              type="text"
              placeholder="Add dispatcher..."
              value={newDispatcher}
              onChange={(e) => setNewDispatcher(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 h-7 text-xs"
              disabled={addDispatcherMutation.isPending}
            />
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleAddDispatcher}
              disabled={addDispatcherMutation.isPending || newDispatcher.trim().length === 0}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}