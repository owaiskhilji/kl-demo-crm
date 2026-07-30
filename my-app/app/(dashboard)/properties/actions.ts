"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const propertySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  area_sqft: z.coerce.number().nullable().optional(),
  category: z.enum(['residential', 'commercial']).nullable().optional(),
  property_type: z.enum(['home', 'plot', 'apartment']).nullable().optional(),
  status: z.enum(['available', 'sold', 'reserved']).default('available'),
  description: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
});

type PropertyInput = z.infer<typeof propertySchema>;

export async function createPropertyAction(input: PropertyInput) {
  try {
    const supabase = await createClient();
    
    // Check if user is owner or manager
    const { data: authData } = await supabase.auth.getClaims();
    if (!authData?.claims?.sub) {
      return { success: false, error: "Unauthorized" };
    }
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.claims.sub)
      .single();
      
    if (profile?.role !== "owner" && profile?.role !== "manager") {
      return { success: false, error: "Only owners and managers can create properties" };
    }

    const validatedData = propertySchema.safeParse(input);
    
    if (!validatedData.success) {
      return { 
        success: false, 
        error: "Validation failed", 
        details: validatedData.error.flatten().fieldErrors 
      };
    }

    const { data, error } = await supabase
      .from("properties")
      .insert({
        name: validatedData.data.name,
        price: validatedData.data.price,
        location: validatedData.data.location,
        area_sqft: validatedData.data.area_sqft || null,
        category: validatedData.data.category || null,
        property_type: validatedData.data.property_type || null,
        status: validatedData.data.status,
        description: validatedData.data.description || null,
        images: validatedData.data.images || [],
      })
      .select()
      .single();

    if (error) {
      console.error("[createPropertyAction] DB error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/properties");
    return { success: true, data };
  } catch (err: any) {
    console.error("[createPropertyAction] Unexpected error:", err);
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}

export async function updatePropertyStatusAction(id: string, status: 'available' | 'sold' | 'reserved') {
  try {
    const supabase = await createClient();
    
    // Auth and role check
    const { data: authData } = await supabase.auth.getClaims();
    if (!authData?.claims?.sub) {
      return { success: false, error: "Unauthorized" };
    }
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.claims.sub)
      .single();
      
    if (profile?.role !== "owner" && profile?.role !== "manager") {
      return { success: false, error: "Only owners and managers can update properties" };
    }
    
    if (!['available', 'sold', 'reserved'].includes(status)) {
      return { success: false, error: "Invalid status" };
    }

    const { error } = await supabase
      .from("properties")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("[updatePropertyStatusAction] DB error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/properties");
    revalidatePath(`/properties/${id}`);
    return { success: true };
  } catch (err: any) {
    console.error("[updatePropertyStatusAction] Unexpected error:", err);
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}

export async function deletePropertyAction(id: string) {
  try {
    const supabase = await createClient();
    
    // Auth and role check
    const { data: authData } = await supabase.auth.getClaims();
    if (!authData?.claims?.sub) {
      return { success: false, error: "Unauthorized" };
    }
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.claims.sub)
      .single();
      
    if (profile?.role !== "owner" && profile?.role !== "manager") {
      return { success: false, error: "Only owners and managers can delete properties" };
    }

    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[deletePropertyAction] DB error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/properties");
    return { success: true };
  } catch (err: any) {
    console.error("[deletePropertyAction] Unexpected error:", err);
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}
