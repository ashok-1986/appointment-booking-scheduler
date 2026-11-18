import React from "react";
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClientOption,
  SessionItem,
  TIME_SLOTS,
  DURATION_PRESETS,
  SERVICE_TYPES,
} from "./types";

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  clients: ClientOption[];
  detectedConflict: SessionItem | null;
  allowOverlap: boolean;
  setAllowOverlap: (val: boolean) => void;
  isNewClient: boolean;
  setIsNewClient: (val: boolean) => void;
  selectedClientId: string;
  setSelectedClientId: (val: string) => void;
  newClientName: string;
  setNewClientName: (val: string) => void;
  newClientEmail: string;
  setNewClientEmail: (val: string) => void;
  newClientPhone: string;
  setNewClientPhone: (val: string) => void;
  newClientInstagram: string;
  setNewClientInstagram: (val: string) => void;
  appointmentDate: string;
  setAppointmentDate: (val: string) => void;
  appointmentTime: string;
  setAppointmentTime: (val: string) => void;
  appointmentDuration: number;
  setAppointmentDuration: (val: number) => void;
  serviceType: string;
  setServiceType: (val: string) => void;
  placement: string;
  setPlacement: (val: string) => void;
  designDescription: string;
  setDesignDescription: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function AppointmentModal({
  open,
  onOpenChange,
  isSubmitting,
  clients,
  detectedConflict,
  allowOverlap,
  setAllowOverlap,
  isNewClient,
  setIsNewClient,
  selectedClientId,
  setSelectedClientId,
  newClientName,
  setNewClientName,
  newClientEmail,
  setNewClientEmail,
  newClientPhone,
  setNewClientPhone,
  newClientInstagram,
  setNewClientInstagram,
  appointmentDate,
  setAppointmentDate,
  appointmentTime,
  setAppointmentTime,
  appointmentDuration,
  setAppointmentDuration,
  serviceType,
  setServiceType,
  placement,
  setPlacement,
  designDescription,
  setDesignDescription,
  notes,
  setNotes,
  onSubmit,
}: AppointmentModalProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-light text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-[#1A1A1A] dark:text-[#C4FF61]" />
            <span>Artist Appointment Booking</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5 pt-2">
          {/* Conflict Warning Box */}
          {detectedConflict && (
            <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>Scheduling Conflict Detected!</span>
              </div>
              <p className="text-xs font-light">
                This slot overlaps with an existing appointment for{" "}
                <strong>{detectedConflict.client.name}</strong> (
                {new Date(detectedConflict.scheduledStart).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                to{" "}
                {new Date(detectedConflict.scheduledEnd).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                ).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  id="allow-overlap"
                  checked={allowOverlap}
                  onCheckedChange={setAllowOverlap}
                />
                <Label htmlFor="allow-overlap" className="text-xs font-medium cursor-pointer">
                  Override conflict & schedule anyway (intentional overlap)
                </Label>
              </div>
            </div>
          )}

          {/* Client Selector (Existing vs New) */}
          <div className="space-y-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Client Selection
              </Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewClient(false)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                    !isNewClient
                      ? "bg-[#1A1A1A] text-white dark:bg-[#FDFFE9] dark:text-[#1A1A1A] font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Existing Client
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewClient(true)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                    isNewClient
                      ? "bg-[#1A1A1A] text-white dark:bg-[#FDFFE9] dark:text-[#1A1A1A] font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  + New Client
                </button>
              </div>
            </div>

            {!isNewClient ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Select Client</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Choose client from database" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    placeholder="e.g. Maya Rao"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    type="email"
                    placeholder="e.g. maya@example.com"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Instagram Handle (Optional)</Label>
                  <Input
                    placeholder="e.g. @maya.ink"
                    value={newClientInstagram}
                    onChange={(e) => setNewClientInstagram(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Date, Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Start Time <span className="text-red-500">*</span>
              </Label>
              <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pick start time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Duration</Label>
              <Select
                value={String(appointmentDuration)}
                onValueChange={(val) => setAppointmentDuration(Number(val))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Service & Placement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Anatomical Placement</Label>
              <Input
                placeholder="e.g. Left Inner Forearm, Ribcage, Collarbone"
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Tattoo Description & Design Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tattoo Description & Design Notes</Label>
            <Textarea
              placeholder="e.g. Fine line botanical floral branch with micro-shading. 2.5 inches."
              value={designDescription}
              onChange={(e) => setDesignDescription(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Studio / Session Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Studio Prep Notes (Internal)
            </Label>
            <Input
              placeholder="e.g. Client requested 15 min numbing cream before needle pass."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || (!!detectedConflict && !allowOverlap)}
              className="bg-[#C4FF61] text-[#1A1A1A] hover:bg-[#b2f04b] font-medium gap-2 min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Schedule Appointment</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
