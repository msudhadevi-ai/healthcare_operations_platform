import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Pill, ClipboardList, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Today&apos;s Patients</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">—</div>
            <p className="text-xs text-gray-500 mt-1">Checked in today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Discharge</CardTitle>
            <ClipboardList className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">—</div>
            <p className="text-xs text-gray-500 mt-1">With doctor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Medicines</CardTitle>
            <Pill className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">—</div>
            <p className="text-xs text-gray-500 mt-1">Total SKUs in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">—</div>
            <p className="text-xs text-gray-500 mt-1">Below reorder level</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No patients checked in today.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No medicines expiring in the next 30 days.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
