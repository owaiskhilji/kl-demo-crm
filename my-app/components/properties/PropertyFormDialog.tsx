"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadZone } from "@/components/ui/ImageUploadZone";
import { createPropertyAction } from "@/app/(dashboard)/properties/actions";

const propertySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  area_sqft: z.coerce.number().optional(),
  category: z.enum(["residential", "commercial"]).optional(),
  property_type: z.enum(["home", "plot", "apartment"]).optional(),
  status: z.enum(["available", "sold", "reserved"]).default("available"),
  description: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

export function PropertyFormDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema) as any,
    defaultValues: {
      name: "",
      price: 0,
      location: "",
      area_sqft: undefined,
      category: undefined,
      property_type: undefined,
      status: "available",
      description: "",
    },
  });

  async function onSubmit(data: PropertyFormValues) {
    setIsSubmitting(true);

    const result = await createPropertyAction({
      ...data,
      images: imageUrls,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success("Property created successfully");
      form.reset();
      setImageUrls([]);
      setOpen(false);
    } else {
      toast.error(result.error || "Failed to create property");
    }
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" /> Add Property
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Add New Property
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Property Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder=""
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (PKR)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Dropdown */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <select
                      className={selectClass}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value || undefined)
                      }
                    >
                      <option value="">Select category</option>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Property Type Dropdown */}
              <FormField
                control={form.control}
                name="property_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <select
                      className={selectClass}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value || undefined)
                      }
                    >
                      <option value="">Select type</option>
                      <option value="home">Home</option>
                      <option value="plot">Plot</option>
                      <option value="apartment">Apartment</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="area_sqft"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (sqft)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder=""
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <select
                      className={selectClass}
                      value={field.value || "available"}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="available">Available</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <FormLabel>Property Images</FormLabel>
              <ImageUploadZone
                value={imageUrls}
                onChange={setImageUrls}
                maxFiles={6}
                maxSizeMB={5}
                disabled={isSubmitting}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder=""
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Property"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
