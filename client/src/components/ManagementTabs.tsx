import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Edit2, Settings, Power, PowerOff, Filter, ArrowUpDown, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { DriverWithLocation, Team, InsertTeam } from "@shared/schema";

// Team color options with emojis and CSS classes
const TEAM_COLORS = {
  blue: { emoji: '🟦', label: 'Blue', bgClass: 'bg-blue-50', textClass: 'text-blue-700', borderClass: 'border-blue-200' },
  green: { emoji: '🟩', label: 'Green', bgClass: 'bg-green-50', textClass: 'text-green-700', borderClass: 'border-green-200' },
  red: { emoji: '🟥', label: 'Red', bgClass: 'bg-red-50', textClass: 'text-red-700', borderClass: 'border-red-200' },
  orange: { emoji: '🟧', label: 'Orange', bgClass: 'bg-orange-50', textClass: 'text-orange-700', borderClass: 'border-orange-200' },
  yellow: { emoji: '🟨', label: 'Yellow', bgClass: 'bg-yellow-50', textClass: 'text-yellow-700', borderClass: 'border-yellow-200' },
  purple: { emoji: '🟪', label: 'Purple', bgClass: 'bg-purple-50', textClass: 'text-purple-700', borderClass: 'border-purple-200' },
  pink: { emoji: '💗', label: 'Pink', bgClass: 'bg-pink-50', textClass: 'text-pink-700', borderClass: 'border-pink-200' },
  indigo: { emoji: '🟫', label: 'Indigo', bgClass: 'bg-indigo-50', textClass: 'text-indigo-700', borderClass: 'border-indigo-200' },
  gray: { emoji: '⬜', label: 'Gray', bgClass: 'bg-gray-50', textClass: 'text-gray-700', borderClass: 'border-gray-200' },
  teal: { emoji: '🔷', label: 'Teal', bgClass: 'bg-teal-50', textClass: 'text-teal-700', borderClass: 'border-teal-200' },
  emerald: { emoji: '💚', label: 'Emerald', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', borderClass: 'border-emerald-200' },
  cyan: { emoji: '💙', label: 'Cyan', bgClass: 'bg-cyan-50', textClass: 'text-cyan-700', borderClass: 'border-cyan-200' },
} as const;

type TeamColor = keyof typeof TEAM_COLORS;

function getTeamColorInfo(color: string) {
  return TEAM_COLORS[color as TeamColor] || TEAM_COLORS.gray;
}

interface ManagementTabsProps {
  selectedDispatcher: string;
  onDispatcherChange: (dispatcher: string) => void;
}

export function ManagementTabs({ selectedDispatcher, onDispatcherChange }: ManagementTabsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverWithLocation | null>(null);
  const [newDriver, setNewDriver] = useState({
    name: "",
    truckNumber: "",
    dispatcher: "Dean"
  });
  const [newDispatcher, setNewDispatcher] = useState("");
  const [filterDispatcher, setFilterDispatcher] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("truckNumber");
  const [newTeam, setNewTeam] = useState<InsertTeam>({
    name: "",
    color: "blue" as TeamColor,
    dispatchers: []
  });
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const { toast } = useToast();

  // Fetch ALL drivers (including inactive ones) and dispatchers - management section needs to see everything
  const { data: allDrivers = [] } = useQuery<DriverWithLocation[]>({
    queryKey: ['/api/drivers'],
  });

  const { data: dispatchers = [] } = useQuery<string[]>({
    queryKey: ['/api/dispatchers'],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  // Driver mutations
  const addDriverMutation = useMutation({
    mutationFn: (driver: typeof newDriver) => apiRequest('POST', '/api/drivers', driver),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dispatchers'] });
      setNewDriver({ name: "", truckNumber: "", dispatcher: "Dean" });
      toast({
        title: "Success",
        description: "Driver added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to add driver",
        variant: "destructive",
      });
    },
  });

  const updateDriverMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof newDriver> }) =>
      apiRequest('PATCH', `/api/drivers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dispatchers'] });
      setEditingDriver(null);
      toast({
        title: "Success",
        description: "Driver updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to update driver",
        variant: "destructive",
      });
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/drivers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dispatchers'] });
      toast({
        title: "Success",
        description: "Driver removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to remove driver",
        variant: "destructive",
      });
    },
  });

  const toggleDriverActivationMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest('PATCH', `/api/drivers/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "Success",
        description: "Driver status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to update driver status",
        variant: "destructive",
      });
    },
  });

  // Team mutations
  const addTeamMutation = useMutation({
    mutationFn: (team: InsertTeam) => apiRequest('POST', '/api/teams', team),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      setNewTeam({ name: "", color: "blue", dispatchers: [] });
      toast({
        title: "Success",
        description: "Team created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to create team",
        variant: "destructive",
      });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertTeam> }) =>
      apiRequest('PATCH', `/api/teams/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      setEditingTeam(null);
      toast({
        title: "Success",
        description: "Team updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to update team",
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Success",
        description: "Team deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.error || "Failed to delete team",
        variant: "destructive",
      });
    },
  });

  // Dispatcher mutations
  const addDispatcherMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/dispatchers', { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dispatchers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      setNewDispatcher("");
      toast({
        title: "Info",
        description: "To use this dispatcher, assign it to a driver first.",
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

  // Driver handlers
  const handleAddDriver = () => {
    if (!newDriver.name.trim() || !newDriver.truckNumber.trim()) {
      toast({
        title: "Error",
        description: "Name and truck number are required",
        variant: "destructive",
      });
      return;
    }
    addDriverMutation.mutate(newDriver);
  };

  const handleEditDriver = (driver: DriverWithLocation) => {
    setEditingDriver(driver);
  };

  const handleUpdateDriver = () => {
    if (!editingDriver) return;

    updateDriverMutation.mutate({
      id: editingDriver.id,
      data: {
        name: editingDriver.name,
        truckNumber: editingDriver.truckNumber || "",
        dispatcher: editingDriver.dispatcher
      }
    });
  };

  const handleDeleteDriver = (id: number) => {
    if (confirm("Are you sure you want to delete this driver? This action cannot be undone.")) {
      deleteDriverMutation.mutate(id);
    }
  };

  // Dispatcher handlers
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

  const handleToggleDriverActivation = (driverId: number, isActive: boolean) => {
    const actionText = isActive ? "deactivate" : "reactivate";
    const confirmMessage = isActive
      ? "Are you sure you want to deactivate this driver? They will be removed from the main dashboard until reactivated."
      : "Are you sure you want to reactivate this driver? They will appear back on the main dashboard.";

    if (confirm(confirmMessage)) {
      toggleDriverActivationMutation.mutate({ id: driverId, isActive: !isActive });
    }
  };

  // Team handlers
  const handleAddTeam = () => {
    if (!newTeam.name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }
    addTeamMutation.mutate(newTeam);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
  };

  const handleUpdateTeam = () => {
    if (!editingTeam) return;

    updateTeamMutation.mutate({
      id: editingTeam.id,
      data: {
        name: editingTeam.name,
        color: editingTeam.color,
        dispatchers: editingTeam.dispatchers
      }
    });
  };

  const handleDeleteTeam = (id: number) => {
    if (confirm("Are you sure you want to delete this team? This action cannot be undone.")) {
      deleteTeamMutation.mutate(id);
    }
  };

  const handleDispatcherToggle = (dispatcherName: string, teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const updatedDispatchers = team.dispatchers.includes(dispatcherName)
      ? team.dispatchers.filter(d => d !== dispatcherName)
      : [...team.dispatchers, dispatcherName];

    updateTeamMutation.mutate({
      id: teamId,
      data: { dispatchers: updatedDispatchers }
    });
  };

  // Filter and sort drivers based on selected dispatcher - management section shows ALL drivers (including inactive)
  const filteredAndSortedDrivers = (filterDispatcher === "All"
    ? allDrivers
    : allDrivers.filter(driver => driver.dispatcher === filterDispatcher)
  ).sort((a, b) => {
    switch (sortBy) {
      case "truckNumber":
        return a.truckNumber.localeCompare(b.truckNumber);
      case "name":
        return a.name.localeCompare(b.name);
      case "dispatcher":
        return a.dispatcher.localeCompare(b.dispatcher);
      default:
        return a.truckNumber.localeCompare(b.truckNumber);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="Management Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Management Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="drivers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="drivers">Driver Management</TabsTrigger>
            <TabsTrigger value="dispatchers">Dispatcher Management</TabsTrigger>
            <TabsTrigger value="teams">Team Management</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Add New Driver */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Add New Driver</h3>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Driver Name *"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  className="text-sm"
                />
                <Input
                  placeholder="Truck Number *"
                  value={newDriver.truckNumber}
                  onChange={(e) => setNewDriver({ ...newDriver, truckNumber: e.target.value })}
                  className="text-sm"
                />
                <Select value={newDriver.dispatcher} onValueChange={(value) => setNewDriver({ ...newDriver, dispatcher: value })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select Dispatcher" />
                  </SelectTrigger>
                  <SelectContent>
                    {dispatchers.sort().map(dispatcher => (
                      <SelectItem key={dispatcher} value={dispatcher}>{dispatcher}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddDriver}
                disabled={addDriverMutation.isPending}
                className="mt-3 text-sm"
                size="sm"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Driver
              </Button>
            </div>

            {/* Edit Driver Form (when editing) */}
            {editingDriver && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="text-sm font-medium mb-3">Edit Driver: {editingDriver.name}</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Driver Name *"
                    value={editingDriver.name}
                    onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Truck Number *"
                    value={editingDriver.truckNumber || ""}
                    onChange={(e) => setEditingDriver({ ...editingDriver, truckNumber: e.target.value })}
                    className="text-sm"
                  />
                  <Select value={editingDriver.dispatcher} onValueChange={(value) => setEditingDriver({ ...editingDriver, dispatcher: value })}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select Dispatcher" />
                    </SelectTrigger>
                    <SelectContent>
                      {dispatchers.sort().map(dispatcher => (
                        <SelectItem key={dispatcher} value={dispatcher}>{dispatcher}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-3 space-x-2">
                  <Button
                    onClick={handleUpdateDriver}
                    disabled={updateDriverMutation.isPending}
                    className="text-sm"
                    size="sm"
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => setEditingDriver(null)}
                    variant="outline"
                    className="text-sm"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Current Drivers List */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Current Drivers ({filteredAndSortedDrivers.length})</h3>
                <div className="flex items-center gap-2">
                  <Filter className="h-3 w-3 text-gray-500" />
                  <Select value={filterDispatcher} onValueChange={setFilterDispatcher}>
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      {dispatchers.sort().map(dispatcher => (
                        <SelectItem key={dispatcher} value={dispatcher}>
                          {dispatcher}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ArrowUpDown className="h-3 w-3 text-gray-500" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="truckNumber">Truck #</SelectItem>
                      <SelectItem value="name">Driver Name</SelectItem>
                      <SelectItem value="dispatcher">Dispatcher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredAndSortedDrivers.map(driver => (
                  <div key={driver.id} className={`flex items-center justify-between px-3 py-2 rounded text-sm ${
                    driver.isActive
                      ? 'bg-gray-50'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        driver.isActive ? 'text-black' : 'text-red-700'
                      }`}>
                        {driver.name}
                        {!driver.isActive && (
                          <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${
                        driver.isActive ? 'text-gray-600' : 'text-red-600'
                      }`}>
                        Truck: {driver.truckNumber} • Dispatcher: {driver.dispatcher}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 ${
                          driver.isActive
                            ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50'
                            : 'text-green-500 hover:text-green-700 hover:bg-green-50'
                        }`}
                        onClick={() => handleToggleDriverActivation(driver.id, driver.isActive)}
                        disabled={toggleDriverActivationMutation.isPending}
                        title={driver.isActive ? "Deactivate Driver" : "Reactivate Driver"}
                      >
                        {driver.isActive ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleEditDriver(driver)}
                        title="Edit Driver"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteDriver(driver.id)}
                        disabled={deleteDriverMutation.isPending}
                        title="Delete Driver"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredAndSortedDrivers.length === 0 && (
                  <div className="text-xs text-gray-500 italic text-center py-4">
                    {filterDispatcher === "All" ? "No drivers found" : `No drivers found for ${filterDispatcher}`}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dispatchers" className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Team Management Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Team Assignments</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Dispatch 1 Team */}
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm font-medium text-blue-800">🟦 Dispatch 1 Team</div>
                  </div>
                  <div className="space-y-1">
                    {(['Alen', 'Dean'] as const).map(dispatcher => (
                      <div key={dispatcher} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1">
                        <span className="text-blue-700">{dispatcher}</span>
                        <div className="text-xs text-blue-600">
                          {allDrivers.filter(d => d.dispatcher === dispatcher).length} drivers
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dispatch 2 Team */}
                <div className="border border-green-200 rounded-lg p-3 bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-sm font-medium text-green-800">🟩 Dispatch 2 Team</div>
                  </div>
                  <div className="space-y-1">
                    {(['Matt', 'Taiwan'] as const).map(dispatcher => (
                      <div key={dispatcher} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1">
                        <span className="text-green-700">{dispatcher}</span>
                        <div className="text-xs text-green-600">
                          {allDrivers.filter(d => d.dispatcher === dispatcher).length} drivers
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Unassigned Dispatchers */}
              {(() => {
                const teamDispatchers = ['Alen', 'Dean', 'Matt', 'Taiwan'];
                const unassignedDispatchers = dispatchers.filter(d => !teamDispatchers.includes(d));

                if (unassignedDispatchers.length > 0) {
                  return (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="text-sm font-medium text-gray-800 mb-2">⚪ Unassigned Dispatchers</div>
                      <div className="space-y-1">
                        {unassignedDispatchers.map(dispatcher => (
                          <div key={dispatcher} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1">
                            <span className="text-gray-700">{dispatcher}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600">
                                {allDrivers.filter(d => d.dispatcher === dispatcher).length} drivers
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-blue-500 hover:text-blue-700"
                                title={`Move ${dispatcher} to Dispatch 1 Team`}
                                onClick={() => {
                                  toast({
                                    title: "Team Assignment",
                                    description: `${dispatcher} would be moved to Dispatch 1 Team. This feature will be fully implemented in the next update.`,
                                  });
                                }}
                              >
                                🟦
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-green-500 hover:text-green-700"
                                title={`Move ${dispatcher} to Dispatch 2 Team`}
                                onClick={() => {
                                  toast({
                                    title: "Team Assignment",
                                    description: `${dispatcher} would be moved to Dispatch 2 Team. This feature will be fully implemented in the next update.`,
                                  });
                                }}
                              >
                                🟩
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="text-xs text-gray-500 italic">
                Team filtering allows viewing all drivers from either Dispatch 1 Team (Alen + Dean) or Dispatch 2 Team (Matt + Taiwan) together.
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200"></div>

            {/* Original Dispatcher Management */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Manage Individual Dispatchers</h3>

              <div className="space-y-3">
                <div className="text-xs text-gray-600">Current dispatchers (from driver assignments):</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {dispatchers.map(dispatcher => (
                    <div key={dispatcher} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded">
                      <span>{dispatcher}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteDispatcher(dispatcher)}
                        disabled={deleteDispatcherMutation.isPending}
                        title={`Remove ${dispatcher} (must have no assigned drivers)`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  {dispatchers.length === 0 && (
                    <div className="text-xs text-gray-500 italic">No dispatchers found. Dispatchers appear when drivers are assigned to them.</div>
                  )}
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-gray-600 mb-2">Add new dispatcher name:</div>
                  <div className="flex space-x-1">
                    <Input
                      type="text"
                      placeholder="Add dispatcher..."
                      value={newDispatcher}
                      onChange={(e) => setNewDispatcher(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddDispatcher()}
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
                  <div className="text-xs text-gray-500 mt-1">Note: Assign the dispatcher to a driver to make it active</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Add New Team */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Create New Team</h3>
              <div className="space-y-3">
                <Input
                  placeholder="Team Name *"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="text-sm"
                />
                <Select value={newTeam.color} onValueChange={(value: TeamColor) => setNewTeam({ ...newTeam, color: value })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select Color" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEAM_COLORS).map(([color, info]) => (
                      <SelectItem key={color} value={color}>
                        {info.emoji} {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <label className="text-xs text-muted-foreground">Assign Dispatchers:</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {dispatchers.map(dispatcher => (
                      <div key={dispatcher} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`new-${dispatcher}`}
                          checked={newTeam.dispatchers?.includes(dispatcher) || false}
                          onChange={(e) => {
                            const currentDispatchers = newTeam.dispatchers || [];
                            const updatedDispatchers = e.target.checked
                              ? [...currentDispatchers, dispatcher]
                              : currentDispatchers.filter(d => d !== dispatcher);
                            setNewTeam({ ...newTeam, dispatchers: updatedDispatchers });
                          }}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor={`new-${dispatcher}`} className="text-sm cursor-pointer">
                          {dispatcher}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleAddTeam}
                  disabled={addTeamMutation.isPending}
                  className="text-sm"
                  size="sm"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create Team
                </Button>
              </div>
            </div>

            {/* Existing Teams */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Existing Teams ({teams.length})</h3>
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getTeamColorInfo(team.color).emoji}</span>
                        <span className="font-medium text-sm">{team.name}</span>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTeam(team)}
                          className="h-6 w-6 p-0"
                          title="Edit Team"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTeam(team.id)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          title="Delete Team"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Dispatchers: {team.dispatchers.length > 0 ? team.dispatchers.join(', ') : 'None assigned'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {dispatchers.map(dispatcher => (
                        <div key={dispatcher} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`${team.id}-${dispatcher}`}
                            checked={team.dispatchers.includes(dispatcher)}
                            onChange={() => handleDispatcherToggle(dispatcher, team.id)}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`${team.id}-${dispatcher}`} className="text-xs cursor-pointer">
                            {dispatcher}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {teams.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No teams created yet</p>
                    <p className="text-xs">Create your first team above</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Team Dialog */}
        {editingTeam && (
          <Dialog open={!!editingTeam} onOpenChange={() => setEditingTeam(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Team Name"
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                />
                <Select value={editingTeam.color} onValueChange={(value: TeamColor) => setEditingTeam({ ...editingTeam, color: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Color" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEAM_COLORS).map(([color, info]) => (
                      <SelectItem key={color} value={color}>
                        {info.emoji} {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <label className="text-sm text-muted-foreground">Assign Dispatchers:</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {dispatchers.map(dispatcher => (
                      <div key={dispatcher} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-${dispatcher}`}
                          checked={editingTeam.dispatchers.includes(dispatcher)}
                          onChange={(e) => {
                            const updatedDispatchers = e.target.checked
                              ? [...editingTeam.dispatchers, dispatcher]
                              : editingTeam.dispatchers.filter(d => d !== dispatcher);
                            setEditingTeam({ ...editingTeam, dispatchers: updatedDispatchers });
                          }}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor={`edit-${dispatcher}`} className="text-sm cursor-pointer">
                          {dispatcher}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditingTeam(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateTeam} disabled={updateTeamMutation.isPending}>
                    Update Team
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}