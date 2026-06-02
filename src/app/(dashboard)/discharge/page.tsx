"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Medicine { id: string; name: string; unit: string; }
interface Visit {
  id: string;
  patient: { patientCode: string; firstName: string; lastName: string; };
  visitDate: string;
  status: string;
}

const FIELD_STYLE = "mt-1 flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export default function DischargePage() {
  const [visitSearch, setVisitSearch] = useState("");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    rightEyeVisionUncorrected: "", leftEyeVisionUncorrected: "",
    rightEyeVisionCorrected: "", leftEyeVisionCorrected: "",
    rightEyeIOP: "", leftEyeIOP: "",
    rightSphere: "", rightCylinder: "", rightAxis: "",
    leftSphere: "", leftCylinder: "", leftAxis: "",
    addPower: "",
    slitLampRightEye: "", slitLampLeftEye: "",
    fundusRightEye: "", fundusLeftEye: "",
    colorVision: "", fieldOfVision: "", ocularMotility: "",
    diagnosis: "", treatment: "", procedure: "", advice: "",
    followUpDate: "",
  });

  const [prescriptions, setPrescriptions] = useState([
    { medicineId: "", dosage: "", frequency: "", duration: "", route: "Topical (Eye Drops)", instructions: "" },
  ]);

  useEffect(() => {
    fetch("/api/pharmacy/medicines").then(r => r.json()).then(d => { if (d.success) setMedicines(d.data); });
  }, []);

  useEffect(() => {
    if (visitSearch.length < 2) { setVisits([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/visits?patientSearch=${encodeURIComponent(visitSearch)}`);
      const data = await res.json();
      if (data.success) setVisits(data.data.filter((v: Visit) => v.status !== "DISCHARGED").slice(0, 5));
    }, 300);
    return () => clearTimeout(timer);
  }, [visitSearch]);

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVisit) return;
    setSubmitting(true);

    const payload = {
      visitId: selectedVisit.id,
      patientId: "", // Will be resolved from visitId on server
      ...Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== "").map(([k, v]) =>
          ["rightEyeIOP","leftEyeIOP","rightSphere","rightCylinder","rightAxis","leftSphere","leftCylinder","leftAxis","addPower"].includes(k)
            ? [k, parseFloat(v)] : [k, v]
        )
      ),
      prescriptions: prescriptions.filter(p => p.medicineId),
    };

    const res = await fetch("/api/discharge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);
    if (res.ok) { setSuccess(true); setSelectedVisit(null); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Eye Discharge Summary</h1>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-md px-4 py-3 text-sm">
          Discharge summary saved successfully.
        </div>
      )}

      {/* Visit selection */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search patient by name or code..."
              value={selectedVisit ? `${selectedVisit.patient.firstName} ${selectedVisit.patient.lastName} (${selectedVisit.patient.patientCode})` : visitSearch}
              onChange={e => { setVisitSearch(e.target.value); setSelectedVisit(null); setSuccess(false); }}
              className="pl-9"
            />
            {visits.length > 0 && !selectedVisit && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                {visits.map(v => (
                  <button key={v.id} type="button" className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    onClick={() => { setSelectedVisit(v); setVisits([]); }}>
                    <span className="font-medium">{v.patient.firstName} {v.patient.lastName}</span>
                    <span className="text-gray-400 ml-2">{v.patient.patientCode}</span>
                    <span className="text-gray-400 ml-2">{new Date(v.visitDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedVisit && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Visual Acuity */}
          <Card>
            <CardHeader><CardTitle>Visual Acuity</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="font-medium text-sm text-gray-500 text-center">Right Eye (OD)</div>
                <div className="font-medium text-sm text-gray-500 text-center">Left Eye (OS)</div>
              </div>
              <div><label className="text-sm text-gray-600">Uncorrected (UCVA)</label><Input placeholder="e.g. 6/18" value={form.rightEyeVisionUncorrected} onChange={f("rightEyeVisionUncorrected")} className="mt-1" /></div>
              <div><label className="text-sm text-gray-600">Uncorrected (UCVA)</label><Input placeholder="e.g. 6/18" value={form.leftEyeVisionUncorrected} onChange={f("leftEyeVisionUncorrected")} className="mt-1" /></div>
              <div><label className="text-sm text-gray-600">Corrected (BCVA)</label><Input placeholder="e.g. 6/6" value={form.rightEyeVisionCorrected} onChange={f("rightEyeVisionCorrected")} className="mt-1" /></div>
              <div><label className="text-sm text-gray-600">Corrected (BCVA)</label><Input placeholder="e.g. 6/6" value={form.leftEyeVisionCorrected} onChange={f("leftEyeVisionCorrected")} className="mt-1" /></div>
            </CardContent>
          </Card>

          {/* IOP & Refraction */}
          <Card>
            <CardHeader><CardTitle>IOP & Refraction</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Intraocular Pressure (mmHg)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm text-gray-600">Right Eye</label><Input type="number" step="0.1" placeholder="e.g. 14" value={form.rightEyeIOP} onChange={f("rightEyeIOP")} className="mt-1" /></div>
                  <div><label className="text-sm text-gray-600">Left Eye</label><Input type="number" step="0.1" placeholder="e.g. 16" value={form.leftEyeIOP} onChange={f("leftEyeIOP")} className="mt-1" /></div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Add Power</p>
                <Input type="number" step="0.25" placeholder="e.g. +2.00" value={form.addPower} onChange={f("addPower")} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Right Eye Refraction</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-xs text-gray-500">Sphere (DS)</label><Input type="number" step="0.25" placeholder="-1.50" value={form.rightSphere} onChange={f("rightSphere")} className="mt-1" /></div>
                  <div><label className="text-xs text-gray-500">Cylinder (DC)</label><Input type="number" step="0.25" placeholder="-0.50" value={form.rightCylinder} onChange={f("rightCylinder")} className="mt-1" /></div>
                  <div><label className="text-xs text-gray-500">Axis (°)</label><Input type="number" min={0} max={180} placeholder="90" value={form.rightAxis} onChange={f("rightAxis")} className="mt-1" /></div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Left Eye Refraction</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-xs text-gray-500">Sphere (DS)</label><Input type="number" step="0.25" placeholder="-1.50" value={form.leftSphere} onChange={f("leftSphere")} className="mt-1" /></div>
                  <div><label className="text-xs text-gray-500">Cylinder (DC)</label><Input type="number" step="0.25" placeholder="-0.50" value={form.leftCylinder} onChange={f("leftCylinder")} className="mt-1" /></div>
                  <div><label className="text-xs text-gray-500">Axis (°)</label><Input type="number" min={0} max={180} placeholder="90" value={form.leftAxis} onChange={f("leftAxis")} className="mt-1" /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Slit Lamp & Fundus */}
          <Card>
            <CardHeader><CardTitle>Slit Lamp & Fundus Examination</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-gray-700">Slit Lamp — Right Eye</label><textarea value={form.slitLampRightEye} onChange={f("slitLampRightEye")} rows={3} placeholder="Cornea clear, AC deep, Lens clear..." className={`${FIELD_STYLE} h-auto resize-none py-2`} /></div>
              <div><label className="text-sm font-medium text-gray-700">Slit Lamp — Left Eye</label><textarea value={form.slitLampLeftEye} onChange={f("slitLampLeftEye")} rows={3} placeholder="Cornea clear, AC deep, Lens clear..." className={`${FIELD_STYLE} h-auto resize-none py-2`} /></div>
              <div><label className="text-sm font-medium text-gray-700">Fundus — Right Eye</label><textarea value={form.fundusRightEye} onChange={f("fundusRightEye")} rows={3} placeholder="Disc, vessels, macula, periphery..." className={`${FIELD_STYLE} h-auto resize-none py-2`} /></div>
              <div><label className="text-sm font-medium text-gray-700">Fundus — Left Eye</label><textarea value={form.fundusLeftEye} onChange={f("fundusLeftEye")} rows={3} placeholder="Disc, vessels, macula, periphery..." className={`${FIELD_STYLE} h-auto resize-none py-2`} /></div>
              <div><label className="text-sm font-medium text-gray-700">Color Vision</label><Input value={form.colorVision} onChange={f("colorVision")} placeholder="Normal / Defective" className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Ocular Motility</label><Input value={form.ocularMotility} onChange={f("ocularMotility")} placeholder="Full in all gazes" className="mt-1" /></div>
            </CardContent>
          </Card>

          {/* Diagnosis & Treatment */}
          <Card>
            <CardHeader><CardTitle>Diagnosis & Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-sm font-medium text-gray-700">Diagnosis *</label><textarea value={form.diagnosis} onChange={f("diagnosis")} rows={2} className={`${FIELD_STYLE} h-auto resize-none py-2`} /></div>
              <div><label className="text-sm font-medium text-gray-700">Treatment Plan</label><textarea value={form.treatment} onChange={f("treatment")} rows={2} className={`${FIELD_STYLE} h-auto resize-none py-2`} /></div>
              <div><label className="text-sm font-medium text-gray-700">Procedure Performed</label><Input value={form.procedure} onChange={f("procedure")} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Patient Advice</label><textarea value={form.advice} onChange={f("advice")} rows={2} className={`${FIELD_STYLE} h-auto resize-none py-2`} /></div>
              <div><label className="text-sm font-medium text-gray-700">Follow-up Date</label><Input type="date" value={form.followUpDate} onChange={f("followUpDate")} className="mt-1 max-w-xs" /></div>
            </CardContent>
          </Card>

          {/* Prescriptions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Prescription</CardTitle>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setPrescriptions([...prescriptions, { medicineId: "", dosage: "", frequency: "", duration: "", route: "Topical (Eye Drops)", instructions: "" }])}>
                  + Add Medicine
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {prescriptions.map((p, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-end">
                  <div className="col-span-2">
                    {i === 0 && <label className="text-sm text-gray-600">Medicine</label>}
                    <select value={p.medicineId} onChange={e => { const np = [...prescriptions]; np[i].medicineId = e.target.value; setPrescriptions(np); }} className={`${FIELD_STYLE} mt-1`}>
                      <option value="">Select medicine...</option>
                      {medicines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <label className="text-sm text-gray-600">Dosage</label>}
                    <Input placeholder="1 drop" value={p.dosage} onChange={e => { const np = [...prescriptions]; np[i].dosage = e.target.value; setPrescriptions(np); }} className="mt-1" />
                  </div>
                  <div>
                    {i === 0 && <label className="text-sm text-gray-600">Frequency</label>}
                    <Input placeholder="3 times/day" value={p.frequency} onChange={e => { const np = [...prescriptions]; np[i].frequency = e.target.value; setPrescriptions(np); }} className="mt-1" />
                  </div>
                  <div>
                    {i === 0 && <label className="text-sm text-gray-600">Duration</label>}
                    <Input placeholder="7 days" value={p.duration} onChange={e => { const np = [...prescriptions]; np[i].duration = e.target.value; setPrescriptions(np); }} className="mt-1" />
                  </div>
                  <div>
                    {i === 0 && <label className="text-sm text-gray-600 opacity-0">x</label>}
                    <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700 mt-1"
                      onClick={() => setPrescriptions(prescriptions.filter((_, j) => j !== i))}>Remove</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setSelectedVisit(null)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Discharge Summary"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
