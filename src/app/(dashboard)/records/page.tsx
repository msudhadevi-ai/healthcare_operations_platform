"use client";

import { useState, useEffect } from "react";
import { Upload, Search, FileImage, File } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Patient { id: string; patientCode: string; firstName: string; lastName: string; }
interface Record {
  id: string; recordType: string; title: string; fileType: string;
  fileSize: number; uploadedAt: string; downloadUrl: string;
}

const RECORD_TYPES = ["XRAY", "ULTRASOUND", "OCT", "FUNDUS_PHOTO", "REPORT", "PRESCRIPTION", "NOTE", "OTHER"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function RecordsPage() {
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ recordType: "XRAY", title: "", visitId: "" });
  const [file, setFile] = useState<File | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (patientSearch.length < 2) { setPatients([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}&limit=10`);
      const data = await res.json();
      if (data.success) setPatients(data.data);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  async function loadRecords(patientId: string) {
    const res = await fetch(`/api/records?patientId=${patientId}`);
    const data = await res.json();
    if (data.success) setRecords(data.data);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !selectedPatient) return;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop() ?? "bin";
      // 1. Get presigned URL
      const urlRes = await fetch("/api/records/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          fileType: file.type,
          fileExtension: ext,
          recordType: uploadForm.recordType,
          title: uploadForm.title || file.name,
          fileSize: file.size,
        }),
      });
      const urlData = await urlRes.json();
      if (!urlData.success) throw new Error("Failed to get upload URL");

      // 2. Upload directly to S3
      await fetch(urlData.data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // 3. Confirm upload
      await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          s3Key: urlData.data.s3Key,
          recordType: uploadForm.recordType,
          title: uploadForm.title || file.name,
          fileType: file.type,
          fileSize: file.size,
          visitId: uploadForm.visitId || undefined,
        }),
      });

      setShowUpload(false);
      setFile(null);
      loadRecords(selectedPatient.id);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Patient Records</h1>

      {/* Patient Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search patient..."
              value={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.patientCode})` : patientSearch}
              onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); setRecords([]); }}
              className="pl-9"
            />
            {patients.length > 0 && !selectedPatient && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                {patients.map(p => (
                  <button key={p.id} type="button" className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    onClick={() => { setSelectedPatient(p); setPatients([]); loadRecords(p.id); }}>
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    <span className="text-gray-400 ml-2">{p.patientCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedPatient && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Records for <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong> ({selectedPatient.patientCode})
            </p>
            <Button onClick={() => setShowUpload(!showUpload)}>
              <Upload className="h-4 w-4" />
              Upload Record
            </Button>
          </div>

          {showUpload && (
            <Card className="mb-6">
              <CardHeader><CardTitle>Upload New Record</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleUpload} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Record Type</label>
                    <select value={uploadForm.recordType} onChange={e => setUploadForm({...uploadForm, recordType: e.target.value})}
                      className="mt-1 flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                      {RECORD_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Title</label>
                    <Input placeholder="e.g. Right Eye X-Ray Jan 2025" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} className="mt-1" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700">File</label>
                    <input type="file" required onChange={e => setFile(e.target.files?.[0] ?? null)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-400 mt-1">Any format supported: DICOM, JPG, PNG, PDF, etc. Max 100MB.</p>
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
                    <Button type="submit" disabled={uploading || !file}>
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              {records.length === 0 ? (
                <p className="text-sm text-gray-500">No records uploaded yet for this patient.</p>
              ) : (
                <div className="space-y-2">
                  {records.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        {r.fileType.startsWith("image/") ? (
                          <FileImage className="h-5 w-5 text-blue-500" />
                        ) : (
                          <File className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.title}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(r.uploadedAt).toLocaleDateString()} · {formatBytes(r.fileSize)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{r.recordType.replace("_", " ")}</Badge>
                        <a href={r.downloadUrl} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline">View</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
