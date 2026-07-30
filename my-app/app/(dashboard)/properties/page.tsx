import { createClient } from "@/lib/supabase/server";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertySearch } from "@/components/properties/PropertySearch";
import { PropertyFormDialog } from "@/components/properties/PropertyFormDialog";
import { Building2 } from "lucide-react";

export const metadata = {
  title: "Properties | KL Demo CRM",
  description: "Manage property inventory",
};

interface PropertiesPageProps {
  searchParams: Promise<{
    location?: string;
    category?: string;
    property_type?: string;
    status?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();

  // Get user role for RBAC
  const { data: authData } = await supabase.auth.getClaims();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData?.claims?.sub)
    .single();

  const isManagerOrOwner = profile?.role === "owner" || profile?.role === "manager";

  // Build query based on searchParams
  let query = supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (resolvedParams.location) {
    query = query.ilike("location", `%${resolvedParams.location}%`);
  }
  
  if (resolvedParams.category && resolvedParams.category !== "all") {
    query = query.eq("category", resolvedParams.category);
  }
  
  if (resolvedParams.property_type && resolvedParams.property_type !== "all") {
    query = query.eq("property_type", resolvedParams.property_type);
  }
  
  if (resolvedParams.status && resolvedParams.status !== "all") {
    query = query.eq("status", resolvedParams.status);
  }
  
  if (resolvedParams.minPrice) {
    query = query.gte("price", parseInt(resolvedParams.minPrice));
  }
  
  if (resolvedParams.maxPrice) {
    query = query.lte("price", parseInt(resolvedParams.maxPrice));
  }

  const { data: properties, error } = await query;

  if (error) {
    console.error("Error fetching properties:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Property Inventory
          </h1>
          <p className="text-muted-foreground">
            Manage your listings and match them with leads.
          </p>
        </div>
        
        {isManagerOrOwner && (
          <div className="shrink-0">
            <PropertyFormDialog />
          </div>
        )}
      </div>

      <PropertySearch />

      {properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg border-dashed bg-card/50">
          <Building2 className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No properties found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {resolvedParams.location || resolvedParams.category || resolvedParams.property_type || resolvedParams.minPrice 
              ? "Try adjusting your filters to see more results." 
              : "You haven't added any properties yet."}
          </p>
        </div>
      )}
    </div>
  );
}
