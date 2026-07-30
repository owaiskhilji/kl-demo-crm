"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Maximize } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Property {
  id: string;
  name: string;
  price: number;
  location: string;
  area_sqft?: number | null;
  category?: string | null;
  property_type?: string | null;
  status: 'available' | 'sold' | 'reserved';
  images?: string[] | null;
}

export function PropertyCard({ property }: { property: Property }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/15 text-green-700 dark:text-green-400";
      case "reserved":
        return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
      case "sold":
        return "bg-red-500/15 text-red-700 dark:text-red-400";
      default:
        return "bg-slate-500/15 text-slate-700 dark:text-slate-400";
    }
  };

  const imageSrc = property.images && property.images.length > 0 
    ? property.images[0] 
    : "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"; // Fallback image

  return (
    <Link href={`/properties/${property.id}`} className="block transition-transform hover:-translate-y-1">
      <Card className="h-full overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-card border-border">
        <div className="relative h-48 w-full bg-muted">
          <Image
            src={imageSrc}
            alt={property.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className={`uppercase text-[10px] tracking-wider font-semibold border-0 ${getStatusColor(property.status)}`}>
              {property.status}
            </Badge>
          </div>
          {property.category && (
            <div className="absolute top-3 right-3 flex flex-col gap-1">
              <Badge variant="secondary" className="uppercase text-[10px] tracking-wider bg-background/80 backdrop-blur-sm border-0 shadow-sm text-foreground">
                {property.category}
              </Badge>
              {property.property_type && (
                <Badge variant="secondary" className="uppercase text-[10px] tracking-wider bg-background/80 backdrop-blur-sm border-0 shadow-sm text-foreground">
                  {property.property_type}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start gap-4">
            <h3 className="font-semibold text-lg text-foreground line-clamp-1">{property.name}</h3>
          </div>
          <p className="text-xl font-bold text-primary mt-1">
            PKR {Number(property.price).toLocaleString()}
          </p>
        </CardHeader>
        
        <CardContent className="p-4 pt-0 text-muted-foreground text-sm">
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="line-clamp-1">{property.location}</span>
            </div>
            
            {(property.area_sqft || property.category || property.property_type) && (
              <div className="flex items-center gap-4 mt-1">
                {property.area_sqft && (
                  <div className="flex items-center gap-1.5">
                    <Maximize className="h-3.5 w-3.5" />
                    <span>{property.area_sqft} sqft</span>
                  </div>
                )}
                {property.category && (
                  <div className="flex items-center gap-1.5 capitalize">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{property.category}{property.property_type ? ` · ${property.property_type}` : ""}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
