"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function PropertySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [propertyType, setPropertyType] = useState(searchParams.get("property_type") || "all");
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");

  const updateFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (location) params.set("location", location);
    else params.delete("location");
    
    if (category && category !== "all") params.set("category", category);
    else params.delete("category");

    if (propertyType && propertyType !== "all") params.set("property_type", propertyType);
    else params.delete("property_type");
    
    if (status && status !== "all") params.set("status", status);
    else params.delete("status");
    
    if (minPrice) params.set("minPrice", minPrice);
    else params.delete("minPrice");
    
    if (maxPrice) params.set("maxPrice", maxPrice);
    else params.delete("maxPrice");

    router.push(`/properties?${params.toString()}`);
  }, [location, category, propertyType, status, minPrice, maxPrice, router, searchParams]);

  // Debounced search for location
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchParams.get("location") !== location && (location !== "" || searchParams.has("location"))) {
        updateFilters();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [location, updateFilters, searchParams]);

  const handleApplyFilters = () => {
    updateFilters();
  };

  const handleClear = () => {
    setLocation("");
    setCategory("all");
    setPropertyType("all");
    setStatus("all");
    setMinPrice("");
    setMaxPrice("");
    router.push("/properties");
  };

  return (
    <div className="bg-card border-border border rounded-lg p-4 space-y-4 shadow-sm mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Location</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder=""
              className="pl-8 bg-background"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select value={category} onValueChange={(val) => setCategory(val as string)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="">
                {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Property Type</Label>
          <Select value={propertyType} onValueChange={(val) => setPropertyType(val as string)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="">
                {propertyType === "all" ? "All Types" : propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="home">Home</SelectItem>
              <SelectItem value="plot">Plot</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={(val) => setStatus(val as string)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="">
                {status === "all" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 lg:col-span-2 xl:col-span-1">
          <Label className="text-xs text-muted-foreground">Price Range</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder=""
              className="bg-background"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder=""
              className="bg-background"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-end gap-2">
          <Button onClick={handleApplyFilters} className="w-full">
            Apply
          </Button>
          <Button variant="outline" onClick={handleClear} className="px-3" title="Clear Filters">
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
