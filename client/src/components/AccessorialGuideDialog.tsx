import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

interface AccessorialGuideDialogProps {
  children?: React.ReactNode;
}

export function AccessorialGuideDialog({ children }: AccessorialGuideDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const riverdaleRates = [
    { from: "UP G1", rate: "$102" },
    { from: "UP CANAL", rate: "$102" },
    { from: "CSX 59TH", rate: "$102" },
    { from: "CSX BEDFORD", rate: "$102" },
    { from: "NS LANDERS", rate: "$102" },
    { from: "NS 47TH", rate: "$102" },
    { from: "NS 63RD", rate: "$102" },
    { from: "BNSF 26TH", rate: "$102" },
    { from: "BNSF WILLOW", rate: "$102" },
    { from: "BNSF CORWITH", rate: "$102" },
    { from: "NS CALUMET", rate: "$139" },
    { from: "UP DOLTON YC", rate: "$139" },
    { from: "UP G2", rate: "$139" },
    { from: "CP BENSENVILLE", rate: "$139" },
    { from: "CN HARVEY", rate: "$139" },
    { from: "UP G4", rate: "$203" },
    { from: "BNSF LPC", rate: "$203" }
  ];

  const accessorialChargesATab = [
    { service: "Flip", customerCost: "$80", driverPay: "$50" },
    { service: "Driver Count", customerCost: "$50", driverPay: "$40" }
  ];

  const chassisCharges = [
    { service: "Chassis Position (Lift On or Lift Off)", customerCost: "$100", driverPay: "$75" },
    { service: "Chassis Rental", customerCost: "$35 per day", driverPay: "N/A" }
  ];

  const accessorialCharges = [
    { service: "HazMat", rate: "$75" },
    { service: "Overweight", rate: "$100" },
    { service: "Scale Light/Heavy", rate: "$50 Stop Off + Scale Tickets Cost" }
  ];

  const wernerCharges = [
    { service: "Stop Off", rate: "$50.00" },
    { service: "Hazmat Fee", rate: "$75.00" },
    { service: "Yard Pull", rate: "$75.00" },
    { service: "Detention", rate: "$50.00 per hour after 2 hours" },
    { service: "Dry Run", rate: "Cost of Linehaul + FSC" },
    { service: "Diversion/Reconsignment", rate: "$1.50 per OOR mile cap of $150.00 Flat" },
    { service: "Scale Tickets", rate: "Preapproval cost of scale ticket + $1.50 per OOR mile cap of $50.00 flat" },
    { service: "Lumper Charge", rate: "Preapproval (Admin fees do not apply if carrier pays)" },
    { service: "Long Island Surcharge", rate: "$100 Flat" },
    { service: "Layover", rate: "$350 Flat W/ Preapproval" },
    { service: "Load Straps/Bars", rate: "Preapproval" }
  ];

  const yardStorageFees = [
    { yard: "Riverdale Yard", customerType: "All customers (except Uber Freight)", rate: "$30 per day", note: "" },
    { yard: "Joliet Yard", customerType: "All customers (except Uber Freight)", rate: "$30 per day", note: "Uber only charged if over allotted spots" },
    { yard: "Joliet Yard", customerType: "Our cost when over allotted spots", rate: "$25 per day", note: "Internal cost reference" }
  ];

  const wernerPolicies = [
    { service: "Ramp Detention", policy: "N/A" },
    { service: "Com-check/Comdata/EFS Check Fees", policy: "N/A" },
    { service: "C.O.D. Deliveries", policy: "N/A" },
    { service: "Tolls", policy: "N/A" },
    { service: "Chassis Flips", policy: "N/A" },
    { service: "Reservation Expirations", policy: "Pass thru" },
    { service: "Ramp Storage", policy: "Pass thru should carrier fail to yard/pull before LFD" },
    { service: "Reschedule/Missed appt fee", policy: "Pass thru" },
    { service: "Per Diem from Late Delivery", policy: "Pass thru" },
    { service: "Damages", policy: "Pass thru" },
    { service: "Net Crossover Charges/penalties", policy: "Pass thru" },
    { service: "Gate Reservation Expirations", policy: "Pass thru" },
    { service: "Off Ramp Parking", policy: "Pre-approval" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white hover:scale-110 transition-all duration-150 px-2"
          >
            <BookOpen className="h-4 w-4 mr-1" />
            <span className="hidden lg:inline">Accessorial Guide</span>
            <span className="lg:hidden">Guide</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">Dispatcher Reference Guide</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Accessorial Charges A Tab Section */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">Accessorial Charges - A Tab</h3>
            <div className="bg-white rounded-lg border border-indigo-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-indigo-100">
                <div className="px-4 py-3 font-bold text-indigo-900 border-r border-indigo-200 text-base">SERVICE:</div>
                <div className="px-4 py-3 font-bold text-indigo-900 border-r border-indigo-200 text-base">CUSTOMER COST:</div>
                <div className="px-4 py-3 font-bold text-indigo-900 text-base">DRIVER PAY:</div>
              </div>

              {accessorialChargesATab.map((charge, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-3 ${index % 2 === 0 ? 'bg-white' : 'bg-indigo-25'} border-b border-indigo-100 last:border-b-0`}
                >
                  <div className="px-4 py-3 text-gray-700 border-r border-indigo-100 text-base">{charge.service}</div>
                  <div className="px-4 py-3 font-bold text-indigo-700 border-r border-indigo-100 text-base">{charge.customerCost}</div>
                  <div className="px-4 py-3 font-bold text-green-700 text-base">{charge.driverPay}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Accessorial Charges Section */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-900 mb-3">Accessorial Charges - C Tab</h3>
            <div className="grid grid-cols-1 gap-2">
              {accessorialCharges.map((charge, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-white rounded border border-orange-100"
                >
                  <span className="font-medium text-gray-700 text-base">{charge.service}</span>
                  <span className="font-bold text-orange-700 text-base">{charge.rate}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chassis Charges Section */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-teal-900 mb-3">40' & 45' Chassis Charges</h3>
            <div className="bg-white rounded-lg border border-teal-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-teal-100">
                <div className="px-4 py-3 font-bold text-teal-900 border-r border-teal-200 text-base">SERVICE:</div>
                <div className="px-4 py-3 font-bold text-teal-900 border-r border-teal-200 text-base">CUSTOMER COST:</div>
                <div className="px-4 py-3 font-bold text-teal-900 text-base">DRIVER PAY:</div>
              </div>

              {chassisCharges.map((charge, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-3 ${index % 2 === 0 ? 'bg-white' : 'bg-teal-25'} border-b border-teal-100 last:border-b-0`}
                >
                  <div className="px-4 py-3 text-gray-700 border-r border-teal-100 text-base">{charge.service}</div>
                  <div className="px-4 py-3 font-bold text-teal-700 border-r border-teal-100 text-base">{charge.customerCost}</div>
                  <div className="px-4 py-3 font-bold text-green-700 text-base">{charge.driverPay}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Riverdale Yard Rates Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 text-center">Riverdale Yard Pulls</h3>

            <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
              <div className="grid grid-cols-2 bg-blue-100">
                <div className="px-6 py-3 font-bold text-blue-900 border-r border-blue-200 text-base">FROM:</div>
                <div className="px-6 py-3 font-bold text-blue-900 text-base">RATE:</div>
              </div>

              {riverdaleRates.map((rate, index) => {
                const getRateColor = (rateValue: string) => {
                  if (rateValue === "$102") return "text-green-700 bg-green-50";
                  if (rateValue === "$139") return "text-yellow-700 bg-yellow-50";
                  if (rateValue === "$203") return "text-red-700 bg-red-50";
                  return "text-blue-700";
                };

                return (
                  <div
                    key={index}
                    className={`grid grid-cols-2 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-25'} border-b border-blue-100 last:border-b-0`}
                  >
                    <div className="px-6 py-3 text-gray-700 border-r border-blue-100 text-base">{rate.from}</div>
                    <div className={`px-6 py-3 font-bold rounded-md mx-2 my-1 text-center text-base ${getRateColor(rate.rate)}`}>
                      {rate.rate}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 text-center">
              <p className="text-sm font-bold text-red-600 bg-red-50 p-2 rounded border border-red-200">
                **PLEASE NOTE ABOVE RATES DO NOT INCLUDE FUEL**
              </p>
            </div>
          </div>

          {/* Joliet Yard Pulls Section */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 mb-3 text-center">Joliet Yard Pulls</h3>

            <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
              <div className="grid grid-cols-2 bg-purple-100">
                <div className="px-6 py-3 font-bold text-purple-900 border-r border-purple-200 text-base">SERVICE:</div>
                <div className="px-6 py-3 font-bold text-purple-900 text-base">RATE:</div>
              </div>

              <div className="grid grid-cols-2 bg-white border-b border-purple-100">
                <div className="px-6 py-3 text-gray-700 border-r border-purple-100 text-base">Joliet Yard Pulls</div>
                <div className="px-6 py-3 font-bold rounded-md mx-2 my-1 text-center text-red-700 bg-red-50 text-base">
                  $203
                </div>
              </div>
            </div>

            <div className="mt-3 text-center">
              <p className="text-sm font-bold text-red-600 bg-red-50 p-2 rounded border border-red-200">
                **PLEASE NOTE ABOVE RATES DO NOT INCLUDE FUEL**
              </p>
            </div>
          </div>

          {/* Yard Pulls - Color Coded Quick Reference Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Yard Pulls - Color Coded Quick Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">$102</div>
                <div className="text-gray-600">Standard Rate</div>
                <div className="text-xs text-gray-500">Most common locations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">$139</div>
                <div className="text-gray-600">Mid-tier Rate</div>
                <div className="text-xs text-gray-500">5 locations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">$203</div>
                <div className="text-gray-600">Premium Rate</div>
                <div className="text-xs text-gray-500">UP G4, BNSF LPC & Joliet</div>
              </div>
            </div>
          </div>

          {/* Yard Storage Fees Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-amber-900 mb-3 text-center">Yard Storage Fees</h3>

            <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-amber-100">
                <div className="px-4 py-3 font-bold text-amber-900 border-r border-amber-200 text-sm">YARD:</div>
                <div className="px-4 py-3 font-bold text-amber-900 border-r border-amber-200 text-sm">CUSTOMER TYPE:</div>
                <div className="px-4 py-3 font-bold text-amber-900 text-sm">STORAGE FEE:</div>
              </div>

              {yardStorageFees.map((fee, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-3 ${index % 2 === 0 ? 'bg-white' : 'bg-amber-25'} border-b border-amber-100 last:border-b-0`}
                >
                  <div className="px-4 py-3 text-gray-700 border-r border-amber-100 text-sm font-medium">{fee.yard}</div>
                  <div className="px-4 py-3 text-gray-700 border-r border-amber-100 text-sm">{fee.customerType}</div>
                  <div className="px-4 py-3 font-bold text-amber-700 text-sm">{fee.rate}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-xs text-amber-700 bg-amber-100 p-2 rounded border border-amber-300">
                <strong>Note:</strong> Uber Freight gets charged storage only when we exceed our allotted number of spots at Joliet yard
              </p>
              <p className="text-xs text-gray-600 bg-gray-100 p-2 rounded border border-gray-300">
                <strong>Internal Reference:</strong> Our cost for Joliet storage is $25/day when over capacity
              </p>
            </div>
          </div>

          {/* Werner Accessorials Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-3 text-center">Werner Accessorials</h3>

            {/* Werner Charges */}
            <div className="bg-white rounded-lg border border-green-200 overflow-hidden mb-4">
              <div className="grid grid-cols-2 bg-green-100">
                <div className="px-4 py-3 font-bold text-green-900 border-r border-green-200 text-sm">SERVICE:</div>
                <div className="px-4 py-3 font-bold text-green-900 text-sm">RATE:</div>
              </div>

              {wernerCharges.map((charge, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-2 ${index % 2 === 0 ? 'bg-white' : 'bg-green-25'} border-b border-green-100 last:border-b-0`}
                >
                  <div className="px-4 py-2 text-gray-700 border-r border-green-100 text-sm">{charge.service}</div>
                  <div className="px-4 py-2 font-medium text-green-700 text-sm">{charge.rate}</div>
                </div>
              ))}
            </div>

            {/* Werner Policies */}
            <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
              <div className="grid grid-cols-2 bg-green-100">
                <div className="px-4 py-3 font-bold text-green-900 border-r border-green-200 text-sm">POLICY:</div>
                <div className="px-4 py-3 font-bold text-green-900 text-sm">STATUS:</div>
              </div>

              {wernerPolicies.map((policy, index) => {
                const getStatusColor = (status: string) => {
                  if (status === "N/A") return "text-gray-500 bg-gray-50";
                  if (status.includes("Pass thru")) return "text-blue-700 bg-blue-50";
                  if (status.includes("Pre-approval")) return "text-orange-700 bg-orange-50";
                  return "text-green-700";
                };

                return (
                  <div
                    key={index}
                    className={`grid grid-cols-2 ${index % 2 === 0 ? 'bg-white' : 'bg-green-25'} border-b border-green-100 last:border-b-0`}
                  >
                    <div className="px-4 py-2 text-gray-700 border-r border-green-100 text-sm">{policy.service}</div>
                    <div className={`px-4 py-2 font-medium rounded-md mx-1 my-1 text-center text-sm ${getStatusColor(policy.policy)}`}>
                      {policy.policy}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}