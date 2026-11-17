"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Download,
  AlertCircle,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  initialProfile: {
    customer: {
      id: string;
      name: string;
      email: string;
      phone: string;
      instagramHandle: string | null;
      dateOfBirth: string | null;
      city: string | null;
      notes: string | null;
      createdAt: string;
      updatedAt: string;
    };
    formattedTotalSpend: string;
    totalSpendNumber: number;
    bookings: Array<{
      id: string;
      serviceType: string;
      stage: string;
      designDescription: string | null;
      placement: string | null;
      approximateSize: string | null;
      style: string | null;
      quotedAmount: string | null;
      depositAmount: string | null;
      balanceAmount: string | null;
      referenceImages: string[] | null;
      createdAt: string;
      sessions: Array<{
        id: string;
        sessionNumber: number;
        scheduledStart: string;
        scheduledEnd: string;
        durationMinutes: number;
        status: string;
        consentStatus: string;
        notes: string | null;
      }>;
      payments: Array<{
        id: string;
        type: string;
        amount: string;
        status: string;
        providerRef: string;
        paidAt: string | null;
      }>;
    }>;
    mediaAssets: Array<{
      id: string;
      url: string;
      category: string;
      caption: string | null;
      consentForMarketing: boolean;
      createdAt: string;
    }>;
    consentRecords: Array<{
      id: string;
      legalName: string;
      dateOfBirth: string;
      procedureConsent: boolean;
      photographyConsent: boolean;
      marketingConsent: boolean;
      signatureImageUrl: string;
      pdfUrl: string | null;
      signedAt: string;
    }>;
  };
};

export default function CustomerDossierClient({ initialProfile }: Props) {
  const { customer, formattedTotalSpend, bookings, mediaAssets, consentRecords } = initialProfile;
  const [notes, setNotes] = useState(customer.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(
        customer.name
      )},%20this%20is%20Prerna%20from%20MeetPrerna%20Studio.`
    : null;

  async function handleSaveNotes() {
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      toast.success("Client notes updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save notes");
    } finally {
      setIsSavingNotes(false);
    }
  }

  const allSessions = bookings.flatMap((b) =>
    b.sessions.map((s) => ({ ...s, bookingId: b.id, serviceType: b.serviceType }))
  );

  return (
    <div className="space-y-8 font-sans">
      {/* Top Nav Back Link */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to All Clients</span>
        </Link>
      </div>

      {/* Customer Hero Card */}
      <Card className="border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full bg-[#C4FF61] text-[#1A1A1A]">
                  Customer Dossier
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  ID: {customer.id.slice(0, 8)}
                </span>
                {bookings.length > 1 ? (
                  <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 text-xs">
                    Repeat Collector ({bookings.length} projects)
                  </Badge>
                ) : (
                  <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 text-xs">
                    New Client
                  </Badge>
                )}
              </div>

              <h1 className="font-heading font-cormorant text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
                {customer.name}
              </h1>

              {/* Contact Information Chips */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {customer.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" />
                  {customer.email}
                </span>
                {customer.instagramHandle && (
                  <a
                    href={`https://instagram.com/${customer.instagramHandle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-pink-600 hover:underline font-medium"
                  >
                    <Instagram className="size-3.5" />
                    @{customer.instagramHandle.replace("@", "")}
                  </a>
                )}
                {customer.city && (
                  <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                    <MapPin className="size-3.5 text-rose-500" />
                    {customer.city}
                  </span>
                )}
                {customer.dateOfBirth && (
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Calendar className="size-3.5 text-zinc-400" />
                    DOB: {customer.dateOfBirth}
                  </span>
                )}
              </div>

              {/* Submission Timestamps (CD-06) */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 pt-1">
                <Clock className="size-3.5 text-zinc-400" />
                <span>Client since {format(new Date(customer.createdAt), "d MMM yyyy, h:mm a")} IST</span>
                <span>·</span>
                <span>({formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true })})</span>
              </div>
            </div>

            {/* Quick Action Buttons & Lifetime Spend */}
            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-4 border-t md:border-t-0 md:border-l border-border/80 pt-4 md:pt-0 md:pl-8 shrink-0">
              <div className="text-left md:text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Lifetime Revenue
                </p>
                <p className="font-mono text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formattedTotalSpend}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 transition-colors"
                  >
                    <MessageCircle className="size-4" />
                    <span>WhatsApp</span>
                  </a>
                )}
                <a
                  href={`mailto:${customer.email}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Mail className="size-3.5" />
                  <span>Email</span>
                </a>
                <a
                  href={`tel:${customer.phone}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Phone className="size-3.5" />
                  <span>Call</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Artist Private Notes */}
      <Card className="border border-border/80 bg-card shadow-xs">
        <CardHeader className="py-4 px-6 border-b">
          <CardTitle className="font-heading font-cormorant text-xl font-medium">
            Artist Consultation &amp; Private Notes
          </CardTitle>
          <CardDescription className="text-xs">
            Private studio notes regarding design preferences, skin sensitivities, or sizing discussions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <Textarea
            rows={3}
            placeholder="Record private consultation notes, tattoo placement considerations, or follow-up milestones..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-sm bg-muted/20"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={isSavingNotes}
              onClick={handleSaveNotes}
              className="bg-[#1A1A1A] text-[#C4FF61] hover:bg-zinc-800 dark:bg-[#C4FF61] dark:text-[#1A1A1A] font-semibold text-xs"
            >
              <Save className="size-3.5 mr-1.5" />
              {isSavingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unified Tab Navigation */}
      <Tabs defaultValue="projects" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-11 border border-border">
          <TabsTrigger value="projects" className="text-xs rounded-lg font-medium">
            Tattoo Projects ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs rounded-lg font-medium">
            Session History ({allSessions.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs rounded-lg font-medium">
            Consent Documents ({consentRecords.length})
          </TabsTrigger>
          <TabsTrigger value="media" className="text-xs rounded-lg font-medium">
            Photo Archive ({mediaAssets.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Tattoo Projects */}
        <TabsContent value="projects" className="space-y-4">
          {bookings.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">No tattoo projects recorded yet.</p>
            </Card>
          ) : (
            bookings.map((b) => (
              <Card key={b.id} className="border border-border/80 bg-card hover:border-[#C4FF61] transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-cormorant text-2xl font-semibold text-foreground">
                          {b.serviceType}
                        </span>
                        <Badge className="bg-[#1A1A1A] text-[#C4FF61] dark:bg-[#C4FF61] dark:text-[#1A1A1A] text-xs capitalize">
                          {b.stage.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Created {format(new Date(b.createdAt), "d MMM yyyy, h:mm a")} IST
                      </p>
                    </div>

                    <Button asChild size="sm" variant="outline" className="text-xs">
                      <Link href={`/dashboard/bookings/${b.id}`}>
                        <span>Open Project Dossier</span>
                        <ExternalLink className="size-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>

                  {b.designDescription && (
                    <div className="rounded-lg bg-muted/30 p-3 text-xs text-foreground/90 font-mono whitespace-pre-wrap">
                      {b.designDescription}
                    </div>
                  )}

                  {b.referenceImages && b.referenceImages.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Inspiration &amp; References
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {b.referenceImages.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setActivePhoto(img)}
                            className="relative size-16 rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <Image src={img} alt="Reference" fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab 2: Session History */}
        <TabsContent value="sessions" className="space-y-4">
          {allSessions.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">No studio sessions booked yet.</p>
            </Card>
          ) : (
            allSessions.map((s) => (
              <Card key={s.id} className="border border-border/80 bg-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        Session #{s.sessionNumber} · {s.serviceType}
                      </span>
                      <Badge className="text-xs capitalize">{s.status}</Badge>
                      {s.consentStatus === "signed" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px]">
                          Consent Signed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 text-[10px]">
                          Consent Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="size-3.5 text-zinc-400" />
                      <span>{format(new Date(s.scheduledStart), "EEEE, d MMM yyyy")}</span>
                      <span>·</span>
                      <Clock className="size-3.5 text-zinc-400" />
                      <span>
                        {format(new Date(s.scheduledStart), "h:mm a")} -{" "}
                        {format(new Date(s.scheduledEnd), "h:mm a")} ({s.durationMinutes} mins)
                      </span>
                    </p>
                  </div>

                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link href={`/dashboard/bookings/${s.bookingId}`}>
                      <span>View Session</span>
                      <ExternalLink className="size-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab 3: Consent Documents */}
        <TabsContent value="documents" className="space-y-4">
          {consentRecords.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">No digital consent forms signed yet.</p>
            </Card>
          ) : (
            consentRecords.map((c) => (
              <Card key={c.id} className="border border-border/80 bg-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="size-4 text-emerald-600" />
                      <span className="font-semibold text-sm text-foreground">
                        Digital Tattoo Consent Form
                      </span>
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px]">
                        Legally Executed
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Signer: <span className="font-medium text-foreground">{c.legalName}</span> (DOB: {c.dateOfBirth}) · Signed{" "}
                      {format(new Date(c.signedAt), "d MMM yyyy, h:mm a")} IST
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500 pt-1">
                      <span>Procedure: {c.procedureConsent ? "✓ Confirmed" : "✗"}</span>
                      <span>·</span>
                      <span>Studio Photo: {c.photographyConsent ? "✓ Granted" : "✗"}</span>
                      <span>·</span>
                      <span>Marketing: {c.marketingConsent ? "✓ Approved" : "✗"}</span>
                    </div>
                  </div>

                  {c.signatureImageUrl && (
                    <div className="h-10 w-28 border border-zinc-200 rounded bg-white p-1 flex items-center justify-center">
                      <img
                        src={c.signatureImageUrl}
                        alt="Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab 4: Media Archive */}
        <TabsContent value="media" className="space-y-4">
          {mediaAssets.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">No photographs archived for this client yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {mediaAssets.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setActivePhoto(m.url)}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted cursor-pointer hover:shadow-md transition-all"
                >
                  <Image src={m.url} alt={m.caption || "Tattoo photo"} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {m.category.replace(/_/g, " ")}
                    </span>
                    {m.caption && <span className="text-[10px] truncate">{m.caption}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Lightbox Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img src={activePhoto} alt="Full view" className="max-w-full max-h-full object-contain rounded-lg" />
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 text-white bg-black/60 rounded-full p-2 text-xs hover:bg-black/80"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
