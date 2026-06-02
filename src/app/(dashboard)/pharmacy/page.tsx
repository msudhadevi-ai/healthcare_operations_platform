"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  category?: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: string;
  expiryDate?: string;
  batchNumber?: string;
}

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", genericName: "", category: "", unit: "tablets",
    quantity: 0, reorderLevel: 10, unitPrice: 0,
    batchNumber: "", manufacturer: "", expiryDate: "",
  });

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/pharmacy/medicines?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    if (data.success) setMedicines(data.data);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  async function handleAddMedicine(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/pharmacy/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: "", genericName: "", category: "", unit: "tablets", quantity: 0, reorderLevel: 10, unitPrice: 0, batchNumber: "", manufacturer: "", expiryDate: "" });
      fetchMedicines();
    }
  }

  const lowStockCount = medicines.filter((m) => m.quantity <= m.reorderLevel).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Inventory</h1>
          {lowStockCount > 0 && (
            <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {lowStockCount} item{lowStockCount > 1 ? "s" : ""} below reorder level
            </p>
          )}
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Medicine
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Medicine</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMedicine} className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-gray-700">Name *</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Generic Name</label><Input value={form.genericName} onChange={e => setForm({...form, genericName: e.target.value})} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Category</label><Input placeholder="Eye Drops, Oral, Injection..." value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Unit *</label><Input placeholder="tablets, ml, drops" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} required className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Quantity *</label><Input type="number" min={0} value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value)})} required className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Reorder Level</label><Input type="number" min={0} value={form.reorderLevel} onChange={e => setForm({...form, reorderLevel: parseInt(e.target.value)})} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Unit Price ($)</label><Input type="number" min={0} step={0.01} value={form.unitPrice} onChange={e => setForm({...form, unitPrice: parseFloat(e.target.value)})} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Batch Number</label><Input value={form.batchNumber} onChange={e => setForm({...form, batchNumber: e.target.value})} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-gray-700">Expiry Date</label><Input type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} className="mt-1" /></div>
              <div className="col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Save Medicine</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search medicines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : medicines.length === 0 ? (
            <p className="text-sm text-gray-500">No medicines found. Add your first medicine.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Medicine</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Category</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Stock</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Unit Price</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Expiry</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="font-medium text-gray-900">{m.name}</div>
                        {m.genericName && <div className="text-xs text-gray-500">{m.genericName}</div>}
                      </td>
                      <td className="py-3 px-2 text-gray-600">{m.category ?? "—"}</td>
                      <td className="py-3 px-2">
                        <span className={m.quantity <= m.reorderLevel ? "text-red-600 font-medium" : "text-gray-900"}>
                          {m.quantity} {m.unit}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{formatCurrency(m.unitPrice)}</td>
                      <td className="py-3 px-2 text-gray-600">{m.expiryDate ? formatDate(m.expiryDate) : "—"}</td>
                      <td className="py-3 px-2">
                        {m.quantity === 0 ? (
                          <Badge variant="destructive">Out of stock</Badge>
                        ) : m.quantity <= m.reorderLevel ? (
                          <Badge variant="warning">Low stock</Badge>
                        ) : (
                          <Badge variant="success">In stock</Badge>
                        )}
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
  );
}
