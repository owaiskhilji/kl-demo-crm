import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Building2, MapPin, Maximize, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusToggle } from "@/components/properties/StatusToggle";
import { PropertyDeleteButton } from "@/components/properties/PropertyDeleteButton";

export const metadata = {
  title: "Property Details | KL Demo CRM",
};

interface PropertyDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // Auth and RBAC
  const { data: authData } = await supabase.auth.getClaims();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData?.claims?.sub)
    .single();

  const isEditable = profile?.role === "owner" || profile?.role === "manager";

  // Fetch property
  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", resolvedParams.id)
    .single();

  if (error || !property) {
    notFound();
  }

  // Find matching leads (area + budget)
  // Budget within ±15% margin
  const budgetMin = property.price * 0.85; // -15% stretch margin
  const budgetMax = property.price * 1.15; // +15% ceiling margin

  const { data: matchingLeads } = await supabase
    .from("leads")
    .select("id, name, budget, stage")
    .ilike("area", `%${property.location.split(',')[0]}%`)
    .gte("budget", budgetMin)
    .lte("budget", budgetMax)
    .limit(5);

  const images = property.images && property.images.length > 0 
    ? property.images 
    : ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80"];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/properties">
          <Button variant="ghost" className="-ml-4 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{property.name}</h1>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{property.location}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="text-3xl font-bold text-primary">
            PKR {Number(property.price).toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            <StatusToggle 
              propertyId={property.id} 
              initialStatus={property.status} 
              isEditable={isEditable} 
            />
            {isEditable && (
              <PropertyDeleteButton propertyId={property.id} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Image Gallery */}
          <div className="space-y-4">
            <div className="relative h-[400px] w-full rounded-xl overflow-hidden bg-muted border border-border">
              <Image
                src={images[0]}
                alt={property.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw"
                priority
              />
            </div>
            
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {images.slice(1, 5).map((img: string, i: number) => (
                  <div key={i} className="relative h-24 rounded-lg overflow-hidden bg-muted border border-border">
                    <Image
                      src={img}
                      alt={`${property.name} image ${i+2}`}
                      fill
                      className="object-cover"
                      sizes="25vw"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-6 text-sm">
                {property.category && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-md text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase">Category</p>
                      <p className="font-semibold capitalize text-foreground">{property.category}</p>
                    </div>
                  </div>
                )}

                {property.property_type && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-md text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase">Type</p>
                      <p className="font-semibold capitalize text-foreground">{property.property_type}</p>
                    </div>
                  </div>
                )}
                
                {property.area_sqft && (
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-md text-primary">
                      <Maximize className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase">Area</p>
                      <p className="font-semibold text-foreground">{property.area_sqft} sqft</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-md text-primary">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase">Listed on</p>
                    <p className="font-semibold text-foreground">
                      {new Date(property.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              {property.description && (
                <div className="pt-4 border-t border-border">
                  <h3 className="font-semibold mb-2 text-foreground">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {property.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border shadow-md border-l-[3px] border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="h-5 w-5 text-primary" />
                Matching Leads
              </CardTitle>
              <CardDescription>
                Leads looking for properties in {property.location.split(',')[0]} around PKR {Number(property.price).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matchingLeads && matchingLeads.length > 0 ? (
                <div className="space-y-4">
                  {matchingLeads.map((lead) => (
                    <div key={lead.id} className="flex flex-col p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-foreground line-clamp-1">{lead.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{lead.stage.replace('_', ' ')}</Badge>
                      </div>
                      <span className="text-sm text-primary font-medium">
                        Budget: PKR {Number(lead.budget).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  
                  <Link href={`/leads?area=${encodeURIComponent(property.location.split(',')[0])}`} className="block w-full mt-2">
                    <Button variant="outline" className="w-full">
                      View All Matches
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No matching leads found at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
