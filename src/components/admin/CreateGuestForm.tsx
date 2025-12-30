"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createGuestAndRegister } from "@/app/actions/tournament";

export default function CreateGuestForm({ categories, users }: { categories: any[], users: any[] }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [partners, setPartners] = useState<Record<string, string>>({});
  const [partnerModes, setPartnerModes] = useState<Record<string, 'existing' | 'new'>>({});
  const [newPartnerNames, setNewPartnerNames] = useState<Record<string, string>>({});
  const [guestDetails, setGuestDetails] = useState({ name: "", email: "", phone: "" });

  const handleCategoryChange = (checked: boolean, catId: string) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, catId]);
      setPartnerModes(prev => ({ ...prev, [catId]: 'existing' }));
    } else {
      setSelectedCategories(selectedCategories.filter(id => id !== catId));
      const newPartners = { ...partners };
      delete newPartners[catId];
      setPartners(newPartners);
      
      const newModes = { ...partnerModes };
      delete newModes[catId];
      setPartnerModes(newModes);

      const newNames = { ...newPartnerNames };
      delete newNames[catId];
      setNewPartnerNames(newNames);
    }
  };

  const handlePartnerChange = (catId: string, partnerId: string) => {
    setPartners({ ...partners, [catId]: partnerId });
  };

  const togglePartnerMode = (catId: string) => {
    setPartnerModes(prev => ({
      ...prev,
      [catId]: prev[catId] === 'new' ? 'existing' : 'new'
    }));
  };

  const isFormValid = () => {
    if (!guestDetails.name || selectedCategories.length === 0) return false;

    return selectedCategories.every(catId => {
      const cat = categories.find(c => c.id.toString() === catId);
      if (cat?.type === "doubles") {
        const mode = partnerModes[catId];
        if (mode === 'new') return !!newPartnerNames[catId];
        return !!partners[catId];
      }
      return true;
    });
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    const registrations = selectedCategories.map(catId => {
      const mode = partnerModes[catId];
      return {
        categoryId: parseInt(catId),
        partnerId: mode === 'existing' && partners[catId] ? parseInt(partners[catId]) : null,
        newPartnerName: mode === 'new' ? newPartnerNames[catId] : undefined
      };
    });

    await createGuestAndRegister(guestDetails, registrations);
    
    // Reset form
    setGuestDetails({ name: "", email: "", phone: "" });
    setSelectedCategories([]);
    setPartners({});
    setPartnerModes({});
    setNewPartnerNames({});
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Full Name</Label>
        <Input 
          value={guestDetails.name} 
          onChange={(e) => setGuestDetails({ ...guestDetails, name: e.target.value })} 
          placeholder="John Doe" 
        />
      </div>

      <div className="space-y-2">
        <Label>Email (Optional)</Label>
        <Input 
          value={guestDetails.email} 
          onChange={(e) => setGuestDetails({ ...guestDetails, email: e.target.value })} 
          type="email" 
          placeholder="john@example.com" 
        />
      </div>

      <div className="space-y-2">
        <Label>Phone (Optional)</Label>
        <Input 
          value={guestDetails.phone} 
          onChange={(e) => setGuestDetails({ ...guestDetails, phone: e.target.value })} 
          type="tel" 
          placeholder="+1234567890" 
        />
      </div>

      <div className="space-y-2">
        <Label>Select Categories</Label>
        <div className="grid gap-2 border p-3 rounded-md">
          {categories.map((cat) => {
            const isDoubles = cat.type === "doubles";
            const isChecked = selectedCategories.includes(cat.id.toString());
            const mode = partnerModes[cat.id.toString()];
            const isPartnerMissing = isChecked && isDoubles && (
              (mode === 'new' && !newPartnerNames[cat.id.toString()]) ||
              ((!mode || mode === 'existing') && !partners[cat.id.toString()])
            );

            return (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`guest-cat-${cat.id}`} 
                    checked={isChecked}
                    onCheckedChange={(checked) => handleCategoryChange(checked as boolean, cat.id.toString())}
                  />
                  <Label htmlFor={`guest-cat-${cat.id}`} className="text-sm font-normal cursor-pointer">
                    {cat.name}
                  </Label>
                </div>
                
                {isChecked && isDoubles && (
                  <div className="ml-6 mt-2">
                    {partnerModes[cat.id.toString()] === 'new' ? (
                       <div className="flex flex-col gap-1">
                         <div className="flex gap-2 items-center">
                           <Input 
                              placeholder="Partner Name" 
                              value={newPartnerNames[cat.id.toString()] || ""}
                              onChange={(e) => setNewPartnerNames({...newPartnerNames, [cat.id.toString()]: e.target.value})}
                              className={`h-8 text-xs flex-1 ${isPartnerMissing ? "border-red-500" : ""}`}
                           />
                           <Button variant="outline" size="sm" onClick={() => togglePartnerMode(cat.id.toString())} className="h-8 px-2 text-xs whitespace-nowrap">
                             Select Existing
                           </Button>
                         </div>
                         {isPartnerMissing && <p className="text-[10px] text-red-500">Partner name is required</p>}
                       </div>
                    ) : (
                       <div className="flex flex-col gap-1">
                         <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <Select value={partners[cat.id.toString()] || ""} onValueChange={(val) => handlePartnerChange(cat.id.toString(), val)}>
                              <SelectTrigger className={`h-8 text-xs ${isPartnerMissing ? "border-red-500" : ""}`}>
                                <SelectValue placeholder="Select Partner" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map((u) => (
                                  <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                           <Button variant="outline" size="sm" onClick={() => togglePartnerMode(cat.id.toString())} className="h-8 px-2 text-xs whitespace-nowrap">
                             New Guest
                           </Button>
                         </div>
                         {isPartnerMissing && <p className="text-[10px] text-red-500">Partner is required</p>}
                       </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories available.</p>}
        </div>
      </div>

      <Button onClick={handleSubmit} variant="secondary" className="w-full" disabled={!isFormValid()}>
        Create & Add
      </Button>
    </div>
  );
}
