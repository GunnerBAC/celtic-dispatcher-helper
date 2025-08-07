import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator } from "lucide-react";

interface CostCalculatorDialogProps {
  children?: React.ReactNode;
}

export function CostCalculatorDialog({ children }: CostCalculatorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dry-run");
  
  // Shared fuel percentage for both tabs
  const [fuelPercentage, setFuelPercentage] = useState<string>("33");
  
  // Tab-specific state
  const [customerCost, setCustomerCost] = useState<string>("");
  const [driverPay, setDriverPay] = useState<string>("");
  
  // Refs for auto-focus
  const customerCostRef = useRef<HTMLInputElement>(null);
  const driverPayRef = useRef<HTMLInputElement>(null);

  // Load saved fuel percentage from localStorage on component mount
  useEffect(() => {
    const savedPercentage = localStorage.getItem("fuelPercentage");
    if (savedPercentage) {
      setFuelPercentage(savedPercentage);
    }
  }, []);

  // Save fuel percentage to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("fuelPercentage", fuelPercentage);
  }, [fuelPercentage]);

  // Clear all inputs when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCustomerCost("");
      setDriverPay("");
    }
  }, [isOpen]);

  // Auto-focus when dialog opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (activeTab === "dry-run" && customerCostRef.current) {
          customerCostRef.current.focus();
        } else if (activeTab === "no-empty" && driverPayRef.current) {
          driverPayRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  // Auto-focus when switching tabs
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setTimeout(() => {
      if (newTab === "dry-run" && customerCostRef.current) {
        customerCostRef.current.focus();
      } else if (newTab === "no-empty" && driverPayRef.current) {
        driverPayRef.current.focus();
      }
    }, 100);
  };

  // Generate percentage options from 20% to 40% in 0.5% increments
  const generatePercentageOptions = () => {
    const options = [];
    for (let i = 20; i <= 40; i += 0.5) {
      options.push(i.toString());
    }
    return options;
  };

  // Calculate values for Dry Run/Yard Pull tab
  const customerCostNum = parseFloat(customerCost) || 0;
  const payToDriver = customerCostNum * 0.75; // 75% of customer cost
  const fuelPercentageNum = parseFloat(fuelPercentage) || 0;
  const fuelCustomer = customerCostNum * (fuelPercentageNum / 100); // Fuel cost for customer
  const fuelDriver = payToDriver * ((fuelPercentageNum - 5) / 100); // Fuel pay to driver (5% less)

  // Calculate values for No Empty tab
  const driverPayNum = parseFloat(driverPay) || 0;
  const driverFuelAmount = driverPayNum * ((fuelPercentageNum - 5) / 100); // Calculate fuel amount using driver percentage

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button 
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white hover:scale-110 transition-all duration-150 px-2"
          >
            <Calculator className="h-4 w-4 mr-1" />
            <span className="hidden lg:inline">Load Cost/Pay Calc</span>
            <span className="lg:hidden">Calculator</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-4">
        <DialogHeader className="pb-2">
          <DialogTitle>Load Cost/Pay Calculator</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-0.5 rounded-lg border border-gray-300">
            <TabsTrigger 
              value="dry-run" 
              className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-blue-200 text-gray-600 transition-all duration-200"
            >Yard Pull / Dry Run</TabsTrigger>
            <TabsTrigger 
              value="no-empty"
              className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-blue-200 text-gray-600 transition-all duration-200"
            >
              Driver FSC / No Empty
            </TabsTrigger>
          </TabsList>

          <TabsContent value="no-empty" className="space-y-2">
            <div className="space-y-3 py-1">
              {/* FSC Percentage Selector for No Empty - TOP */}
              <div className="space-y-1">
                <Label htmlFor="noEmptyFuelPercentage" className="text-sm font-medium">
                  FSC Percentage
                </Label>
                <Select value={fuelPercentage} onValueChange={setFuelPercentage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel percentage" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {generatePercentageOptions().map((percentage) => (
                      <SelectItem key={percentage} value={percentage}>
                        {percentage}% (Driver: {(parseFloat(percentage) - 5).toFixed(1)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Driver Pay Input */}
              <div className="space-y-1">
                <Label htmlFor="driverPay" className="text-sm font-medium">
                  Pay to Driver
                </Label>
                <Input
                  id="driverPay"
                  ref={driverPayRef}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={driverPay}
                  onChange={(e) => setDriverPay(e.target.value)}
                  className="text-lg"
                />
              </div>
            </div>

            {/* Summary Section for No Empty */}
            <div className="border-t pt-2 space-y-3">
              {/* FSC Amount */}
              <div>
                <div className="font-medium mb-1 text-sm">FSC Amount ({(fuelPercentageNum - 5).toFixed(1)}%):</div>
                <div className="px-3 py-2 bg-purple-50 border-2 border-purple-200 rounded-lg text-lg font-mono font-bold shadow-lg text-purple-800 h-10 flex items-center">
                  {formatCurrency(driverFuelAmount)}
                </div>
              </div>
              
              {/* Total Driver Pay */}
              <div>
                <div className="font-medium mb-1 text-sm">Total Driver Pay:</div>
                <div className="px-3 py-2 bg-emerald-50 border-2 border-emerald-200 rounded-lg text-lg font-mono font-bold shadow-lg text-emerald-800 h-10 flex items-center">
                  {formatCurrency(driverPayNum + driverFuelAmount)}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDriverPay("");
                }}
              >
                Clear
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="dry-run" className="space-y-2">
            <div className="space-y-3 py-1">
              {/* FSC Percentage Selector - TOP */}
              <div className="space-y-1">
                <Label htmlFor="fuelPercentage" className="text-sm font-medium">
                  FSC Percentage
                </Label>
                <Select value={fuelPercentage} onValueChange={setFuelPercentage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel percentage" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {generatePercentageOptions().map((percentage) => (
                      <SelectItem key={percentage} value={percentage}>
                        {percentage}% (Driver: {(parseFloat(percentage) - 5).toFixed(1)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Cost and Driver Pay Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Customer Cost Input */}
                <div className="space-y-1">
                  <Label htmlFor="customerCost" className="text-sm font-medium">
                    Cost for Customer
                  </Label>
                  <Input
                    id="customerCost"
                    ref={customerCostRef}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={customerCost}
                    onChange={(e) => setCustomerCost(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Pay to Driver Output */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    Pay to Driver (75%)
                  </Label>
                  <div className="px-3 py-2 bg-green-50 border-2 border-green-200 rounded-lg text-lg font-mono font-bold shadow-lg text-green-800 h-10 flex items-center">
                    {formatCurrency(payToDriver)}
                  </div>
                </div>
              </div>

              {/* FSC Calculations Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* FSC Cost for Customer */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    FSC - Customer ({fuelPercentage}%)
                  </Label>
                  <div className="px-3 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg text-lg font-mono font-bold shadow-lg text-blue-800 h-10 flex items-center">
                    {formatCurrency(fuelCustomer)}
                  </div>
                </div>

                {/* FSC Pay to Driver */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    FSC - Driver ({(fuelPercentageNum - 5).toFixed(1)}%)
                  </Label>
                  <div className="px-3 py-2 bg-purple-50 border-2 border-purple-200 rounded-lg text-lg font-mono font-bold shadow-lg text-purple-800 h-10 flex items-center">
                    {formatCurrency(fuelDriver)}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Section for Dry Run */}
            <div className="border-t pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="font-medium mb-1">Total Customer Cost:</div>
                  <div className="px-3 py-2 bg-orange-50 border-2 border-orange-200 rounded-lg text-lg font-mono font-bold shadow-lg text-orange-800 h-10 flex items-center">
                    {formatCurrency(customerCostNum + fuelCustomer)}
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-1">Total Driver Pay:</div>
                  <div className="px-3 py-2 bg-emerald-50 border-2 border-emerald-200 rounded-lg text-lg font-mono font-bold shadow-lg text-emerald-800 h-10 flex items-center">
                    {formatCurrency(payToDriver + fuelDriver)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCustomerCost("");
                }}
              >
                Clear
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Color Guide */}
        <div className="border-t pt-1">
          <div className="text-xs font-medium mb-1 text-gray-600">Colors:</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-200 border border-green-300 rounded-sm"></div>
              <span>Driver</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-emerald-200 border border-emerald-300 rounded-sm"></div>
              <span>Total Driver</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-200 border border-blue-300 rounded-sm"></div>
              <span>Customer FSC</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-200 border border-orange-300 rounded-sm"></div>
              <span>Total Customer</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-200 border border-purple-300 rounded-sm"></div>
              <span>FSC</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-1 border-t">
          <Button onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}