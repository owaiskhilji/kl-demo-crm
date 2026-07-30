"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface ImageUploadZoneProps {
  /** Current image URLs already stored */
  value: string[];
  /** Callback with updated array of public URLs */
  onChange: (urls: string[]) => void;
  /** Max number of images allowed */
  maxFiles?: number;
  /** Max file size in MB */
  maxSizeMB?: number;
  disabled?: boolean;
}

const BUCKET_NAME = "property-images";

export function ImageUploadZone({
  value = [],
  onChange,
  maxFiles = 6,
  maxSizeMB = 5,
  disabled = false,
}: ImageUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = maxFiles - value.length;

      if (remaining <= 0) {
        toast.error(`Maximum ${maxFiles} images allowed`);
        return;
      }

      const filesToUpload = fileArray.slice(0, remaining);
      const maxBytes = maxSizeMB * 1024 * 1024;

      // Validate files
      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          return;
        }
        if (file.size > maxBytes) {
          toast.error(`${file.name} exceeds ${maxSizeMB}MB limit`);
          return;
        }
      }

      setUploading(true);
      const newUrls: string[] = [];

      try {
        for (const file of filesToUpload) {
          // Generate a unique path: property-images/<timestamp>_<randomId>_<filename>
          const fileExt = file.name.split(".").pop();
          const filePath = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            console.error("[ImageUploadZone] Upload error:", uploadError);
            toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

          if (urlData?.publicUrl) {
            newUrls.push(urlData.publicUrl);
          }
        }

        if (newUrls.length > 0) {
          onChange([...value, ...newUrls]);
          toast.success(
            `${newUrls.length} image${newUrls.length > 1 ? "s" : ""} uploaded`
          );
        }
      } catch (err: any) {
        console.error("[ImageUploadZone] Unexpected error:", err);
        toast.error("Upload failed. Please try again.");
      } finally {
        setUploading(false);
        // Reset file input so same file can be selected again
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [value, onChange, maxFiles, maxSizeMB, supabase]
  );

  const removeImage = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3">
      {/* Preview Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {value.map((url, i) => (
            <div
              key={i}
              className="relative group h-24 rounded-lg overflow-hidden border border-border bg-muted"
            >
              <Image
                src={url}
                alt={`Property image ${i + 1}`}
                fill
                className="object-cover"
                sizes="150px"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      {value.length < maxFiles && !disabled && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors
            ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            }
            ${uploading ? "opacity-60 pointer-events-none" : ""}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                uploadFiles(e.target.files);
              }
            }}
            disabled={disabled || uploading}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="p-3 bg-muted rounded-full">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">
                  Click to upload
                </span>
                <span className="text-sm"> or drag and drop</span>
              </div>
              <span className="text-xs">
                PNG, JPG, WEBP up to {maxSizeMB}MB · Max {maxFiles} images
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
