"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Patient {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
}

interface Visit {
  id: string;
  visitDate: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  paidAmount: string;
  patient: { patientCode: string; firstName: string; lastName: string; phone?: string };
  dischargeSummary?: { id: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  CHECKED_IN: "Checked In",
  WITH_DOCTOR: "With Doctor",
  DISCHARGED: "Discharged",
  CANCELLED: "Cancelled",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  CHECKED_IN: "default",
  WITH_DOCTOR: "warning",
  DISCHARGED: "success",
  CANCELLED: "destructive",
};

export default function FrontDeskPage() {
  const [tab, setTab] = useState<"queue" | "register">("queue");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [loading, setLoading] = useState(true);

  const [newPatient, setNewPatient] = useState({
    firstName: "", lastName: "", dateOfBirth: "", gender: "MALE",
    phone: "", email: "", address: "", bloodGroup: "", allergies: "",
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/visits?date=${todayStr}`);
    const data = await res.json();
    if (data.success) setVisits(data.data);
    setLoading(false);
  }, [todayStr]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  useEffect(() => {
    if (patientSearch.length < 2) { setPatients([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}&limit=10`);
      const data = await res.json();
      if (data.success) setPatients(data.data);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) return;
    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: selectedPatient.id, chiefComplaint }),
    });
    if (res.ok) {
      setSelectedPatient(null);
      setPatientSearch("");
      setChiefComplaint("");
      fetchVisits();
    }
  }

  async function handleRegisterPatient(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPatient),
    });
    if (res.ok) {
      const data = await res.json();
      setNewPatient({ firstName: "", lastName: "", dateOfBirth: "", gender: "MALE", phone: "", email: "", address: "", bloodGroup: "", allergies: "" });
      setSelectedPatient(data.data);
      setTab("queue");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Front Desk</h1>
        <div className="flex gap-2">
          <Button variant={tab === "queue" ? "default" : "outline"} onClick={() => setTab("queue")}>
            Today&apos;s Queue
          </Button>
          <Button variant={tab === "register" ? "default" : "outline"} onClick={() => setTab("register")}>
            <UserPlus className="h-4 w-4" />
            Register Patient
          </Button>
        </div>
      </div>

      {tab === "queue" && (
        <div className="space-y-6">
          {/* Check In Form */}
          <Card>
            <CardHeader><CardTitle>Check In Patient</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCheckIn} className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-48">
                  <label className="text-sm font-medium text-gray-700">Search Patient</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Name or patient code..."
                      value={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.patientCode})` : patientSearch}
                      onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatient(null); }}
                      className="pl-9"
                    />
                  </div>
                  {patients.length > 0 && !selectedPatient && (
                    <div className="absolute z-10 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg">
                      {patients.map((p) => (
                        <button key={p.id} type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                          onClick={() => { setSelectedPatient(p); setPatients([]); }}>
                          <span className="font-medium">{p.firstName} {p.lastName}</span>
                          <span className="text-gray-500 ml-2">{p.patientCode}</span>
                          {p.phone && <span className="text-gray-400 ml-2">{p.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-48">
                  <label className="text-sm font-medium text-gray-700">Chief Complaint</label>
                  <Input placeholder="Reason for visit..." value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} className="mt-1" />
                </div>
                <Button type="submit" disabled={!selectedPatient}>
                  <Plus className="h-4 w-4" />
                  Check In
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Today's Queue */}
          <Card>
            <CardHeader><CardTitle>Today&apos;s Queue ({visits.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : visits.length === 0 ? (
                <p className="text-sm text-gray-500">No patients today.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Patient</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Code</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Time</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Amount</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-500">Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visits.map((v) => (
                        <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium text-gray-900">
                            {v.patient.firstName} {v.patient.lastName}
                          </td>
                          <td className="py-3 px-2 text-gray-500">{v.patient.patientCode}</td>
                          <td className="py-3 px-2 text-gray-500">
                            {new Date(v.visitDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant={STATUS_VARIANTS[v.status] ?? "default"}>
                              {STATUS_LABELS[v.status] ?? v.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-gray-600">${v.totalAmount}</td>
                          <td className="py-3 px-2">
                            <Badge variant={v.paymentStatus === "PAID" ? "success" : v.paymentStatus === "PARTIAL" ? "warning" : "secondary"}>
                              {v.paymentStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "register" && (
        <Card>
          <CardHeader><CardTitle>Register New Patient</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleRegisterPatient} className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-gray-700">First Name *</label><Input value={newPatient.firstName} onChange={e => setNewPatient({...newPatient, firstName: e.target.value})} required className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Last Name *</label><Input value={newPatient.lastName} onChange={e => setNewPatient({...newPatient, lastName: e.target.value})} required className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Date of Birth *</label><Input type="date" value={newPatient.dateOfBirth} onChange={e => setNewPatient({...newPatient, dateOfBirth: e.target.value})} required className="mt-1" /></div>
              <div>
                <label className="text-sm font-medium text-gray-700">Gender *</label>
                <select value={newPatient.gender} onChange={e => setNewPatient({...newPatient, gender: e.target.value})} className="mt-1 flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div><label className="text-sm font-medium text-gray-700">Phone</label><Input type="tel" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Email</label><Input type="email" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} className="mt-1" /></div>
              <div className="col-span-2"><label className="text-sm font-medium text-gray-700">Address</label><Input value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Blood Group</label><Input placeholder="A+, B-, O+..." value={newPatient.bloodGroup} onChange={e => setNewPatient({...newPatient, bloodGroup: e.target.value})} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Known Allergies</label><Input value={newPatient.allergies} onChange={e => setNewPatient({...newPatient, allergies: e.target.value})} className="mt-1" /></div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setTab("queue")}>Cancel</Button>
                <Button type="submit">Register Patient</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
