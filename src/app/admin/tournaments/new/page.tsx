"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTournamentWithCategories, CategoryInput } from "@/app/actions/tournament";
import { Trash2 } from "lucide-react";

const CATEGORY_OPTIONS = [
  "Men's Singles",
  "40+ Men",
  "Men's Doubles",
  "Boys Singles",
  "Boys Doubles",
  "Mixed Doubles",
  "Ladies Singles",
  "Ladies Doubles"
];

export default function CreateTournamentPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1 Data
  const [details, setDetails] = useState({
    name: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
  });

  // Step 2 Data
  const [categoriesList, setCategoriesList] = useState<CategoryInput[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Partial<CategoryInput>>({
    name: "",
    format: "",
  });

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDetails({ ...details, [e.target.name]: e.target.value });
  };

  const handleAddCategory = () => {
    if (currentCategory.name && currentCategory.format) {
      const type = currentCategory.name.toLowerCase().includes("doubles") ? "doubles" : "singles";
      setCategoriesList([
        ...categoriesList,
        { name: currentCategory.name, format: currentCategory.format, type } as CategoryInput
      ]);
      setCurrentCategory({ name: "", format: "" });
    }
  };

  const removeCategory = (index: number) => {
    setCategoriesList(categoriesList.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createTournamentWithCategories({
        ...details,
        startDate: new Date(details.startDate),
        endDate: new Date(details.endDate),
        categories: categoriesList,
      });
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <div className="mb-8 flex items-center justify-center space-x-4">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>1</div>
        <div className="h-1 w-16 bg-muted">
          <div className={`h-full bg-primary transition-all ${step > 1 ? "w-full" : "w-0"}`} />
        </div>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>2</div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Tournament Details</CardTitle>
            <CardDescription>Enter the basic information for the tournament.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name</Label>
              <Input id="name" name="name" value={details.name} onChange={handleDetailChange} placeholder="e.g., Summer Open 2024" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" value={details.description} onChange={handleDetailChange} placeholder="Brief details about the event" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" value={details.location} onChange={handleDetailChange} placeholder="e.g., Central Park Courts" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="date" value={details.startDate} onChange={handleDetailChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" name="endDate" type="date" value={details.endDate} onChange={handleDetailChange} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button 
              onClick={() => setStep(2)} 
              disabled={!details.name || !details.location || !details.startDate || !details.endDate}
            >
              Next: Categories
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Categories & Formats</CardTitle>
            <CardDescription>Add the categories to be played in this tournament.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
              <h3 className="font-medium text-sm">Add New Category</h3>
              <div className="grid gap-4 md:grid-cols-3 items-end">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={currentCategory.name} 
                    onValueChange={(val) => setCurrentCategory(prev => ({ ...prev, name: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select 
                    value={currentCategory.format} 
                    onValueChange={(val) => setCurrentCategory(prev => ({ ...prev, format: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-set">Full Set</SelectItem>
                      <SelectItem value="mini-set">Mini Set</SelectItem>
                      <SelectItem value="pro-set">Pro Set</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddCategory} disabled={!currentCategory.name || !currentCategory.format} variant="secondary">
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Added Categories ({categoriesList.length})</Label>
              {categoriesList.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No categories added yet.</p>
              ) : (
                <div className="grid gap-2">
                  {categoriesList.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-md bg-card">
                      <div>
                        <span className="font-medium">{cat.name}</span>
                        <span className="mx-2 text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{cat.format}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeCategory(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || categoriesList.length === 0}>
              {isSubmitting ? "Creating..." : "Save & Finish"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
