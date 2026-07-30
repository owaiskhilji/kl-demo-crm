"use client";

import { useState } from "react";
import { updatePropertyStatusAction } from "@/app/(dashboard)/properties/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface StatusToggleProps {
  propertyId: string;
  initialStatus: 'available' | 'sold' | 'reserved';
  isEditable: boolean;
}

export function StatusToggle({ propertyId, initialStatus, isEditable }: StatusToggleProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, setIsPending] = useState(false);

  const getStatusColor = (s: string) => {
    switch (s) {
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

  if (!isEditable) {
    return (
      <Badge className={`uppercase text-xs tracking-wider font-semibold border-0 py-1.5 px-3 ${getStatusColor(status)}`}>
        {status}
      </Badge>
    );
  }

  const handleStatusChange = async (newStatus: 'available' | 'sold' | 'reserved') => {
    setIsPending(true);
    const oldStatus = status;
    setStatus(newStatus); // Optimistic UI update

    const result = await updatePropertyStatusAction(propertyId, newStatus);
    
    if (!result.success) {
      toast.error(result.error || "Failed to update status");
      setStatus(oldStatus); // Revert on error
    } else {
      toast.success("Property status updated");
    }
    setIsPending(false);
  };

  return (
    <Select value={status} onValueChange={(val) => handleStatusChange(val as 'available' | 'sold' | 'reserved')}>
      <SelectTrigger className={`w-[140px] uppercase text-xs font-semibold tracking-wider border-0 focus:ring-0 ${getStatusColor(status)}`}>
        <SelectValue placeholder="">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="available" className="uppercase text-xs font-semibold">Available</SelectItem>
        <SelectItem value="reserved" className="uppercase text-xs font-semibold">Reserved</SelectItem>
        <SelectItem value="sold" className="uppercase text-xs font-semibold">Sold</SelectItem>
      </SelectContent>
    </Select>
  );
}
