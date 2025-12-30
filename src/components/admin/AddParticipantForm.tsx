"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { registerPlayer } from "@/app/actions/tournament";

export default function AddParticipantForm({ categories, users }: { categories: any[], users: any[] }) {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [partners, setPartners] = useState<Record<string, string>>({});

  const handleCategoryChange = (checked: boolean, catId: string) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, catId]);
    } else {
      setSelectedCategories(selectedCategories.filter(id => id !== catId));
      const newPartners = { ...partners };
      delete newPartners[catId];
      setPartners(newPartners);
    }
  };

  const handlePartnerChange = (catId: string, partnerId: string) => {
    setPartners({ ...partners, [catId]: partnerId });
  };

  const isFormValid = () => {
    if (!selectedUser || selectedCategories.length === 0) return false;
    
    return selectedCategories.every(catId => {
      const cat = categories.find(c => c.id.toString() === catId);
      if (cat?.type === "doubles") {
        return !!partners[catId];
      }
      return true;
    });
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    const registrations = selectedCategories.map(catId => ({
      categoryId: parseInt(catId),
      partnerId: partners[catId] ? parseInt(partners[catId]) : null
    }));

    await registerPlayer(parseInt(selectedUser), registrations);
    
    // Reset form
    setSelectedUser("");
    setSelectedCategories([]);
    setPartners({});
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Player</Label>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger>
            <SelectValue placeholder="Select Player" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUser && (
        <div className="space-y-2">
          <Label>Select Categories</Label>
          <div className="grid gap-2 border p-3 rounded-md">
            {categories.map((cat) => {
              const isDoubles = cat.type === "doubles";
              const isChecked = selectedCategories.includes(cat.id.toString());
              const isPartnerMissing = isChecked && isDoubles && !partners[cat.id.toString()];

              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`cat-${cat.id}`} 
                      checked={isChecked}
                      onCheckedChange={(checked) => handleCategoryChange(checked as boolean, cat.id.toString())}
                    />
                    <Label htmlFor={`cat-${cat.id}`} className="text-sm font-normal cursor-pointer">
                      {cat.name}
                    </Label>
                  </div>
                  
                  {isChecked && isDoubles && (
                    <div className="ml-6">
                      <Select value={partners[cat.id.toString()] || ""} onValueChange={(val) => handlePartnerChange(cat.id.toString(), val)}>
                        <SelectTrigger className={`h-8 text-xs ${isPartnerMissing ? "border-red-500" : ""}`}>
                          <SelectValue placeholder="Select Partner (Required)" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter(u => u.id.toString() !== selectedUser).map((u) => (
                            <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isPartnerMissing && <p className="text-[10px] text-red-500 mt-1">Partner is required for doubles</p>}
                    </div>
                  )}
                </div>
              );
            })}
            {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories available.</p>}
          </div>
        </div>
      )}

      <Button onClick={handleSubmit} variant="secondary" className="w-full" disabled={!isFormValid()}>
        Add Participant
      </Button>
    </div>
  );
}
