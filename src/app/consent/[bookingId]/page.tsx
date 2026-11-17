"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  PenLine,
  CheckCircle2,
  Printer,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  Calendar,
  User,
  HeartPulse,
  Camera,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignaturePad, SignaturePadRef } from "@/components/signature-pad";

interface BookingInfo {
  client: { name: string; email?: string; phone?: string };
  serviceType: string;
  consentSignedAt: string | null;
}

interface SignedRecordData {
  consentRecordId?: string;
  legalName: string;
  dateOfBirth: string;
  signedAt: string;
  procedureConsent: boolean;
  photographyConsent: boolean;
  marketingConsent: boolean;
  signatureImageUrl: string;
  healthDisclosures: {
    allergies: boolean;
    allergiesDetails: string;
    bloodThinners: boolean;
    skinConditions: boolean;
    skinConditionsDetails: string;
    pregnantOrNursing: boolean;
    cardiacOrEpileptic: boolean;
  };
}

function calculateAge(dobString: string): number | null {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function ConsentPage() {
  const params = useParams();
  const bookingId = (params?.bookingId as string) || "";

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);

  // Form Fields
  const [legalName, setLegalName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Health Disclosures
  const [allergies, setAllergies] = useState(false);
  const [allergiesDetails, setAllergiesDetails] = useState("");
  const [bloodThinners, setBloodThinners] = useState(false);
  const [skinConditions, setSkinConditions] = useState(false);
  const [skinConditionsDetails, setSkinConditionsDetails] = useState("");
  const [cardiacOrEpileptic, setCardiacOrEpileptic] = useState(false);
  const [pregnantOrNursing, setPregnantOrNursing] = useState(false);

  // Procedure & Risk Acknowledgement
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);

  // The 3 Separate Permission Checkboxes
  const [procedureConsent, setProcedureConsent] = useState(false);
  const [photographyConsent, setPhotographyConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Signature
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const signaturePadRef = useRef<SignaturePadRef>(null);

  // Signed Record for Confirmation & Document Printing
  const [signedRecord, setSignedRecord] = useState<SignedRecordData | null>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(true);

  // Calculate client age live
  const clientAge = calculateAge(dateOfBirth);
  const isUnderage = clientAge !== null && clientAge < 18;
  const isAgeValid = clientAge !== null && clientAge >= 18;

  useEffect(() => {
    if (!bookingId) return;

    fetch(`/api/consent/${bookingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.booking) {
          setBooking(data.booking);
          if (data.booking.client?.name) {
            setLegalName(data.booking.client.name);
          }
          if (data.booking.consentSignedAt) {
            setAlreadySigned(true);
            setSignedRecord({
              legalName: data.booking.client?.name || "Client",
              dateOfBirth: "On File (Verified 18+)",
              signedAt: data.booking.consentSignedAt,
              procedureConsent: true,
              photographyConsent: true,
              marketingConsent: true,
              signatureImageUrl: "",
              healthDisclosures: {
                allergies: false,
                allergiesDetails: "",
                bloodThinners: false,
                skinConditions: false,
                skinConditionsDetails: "",
                pregnantOrNursing: false,
                cardiacOrEpileptic: false,
              },
            });
          }
        }
      })
      .catch(() => toast.error("Failed to load booking details"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation checks
    if (!legalName.trim() || legalName.trim().length < 2) {
      toast.error("Please enter client legal full name as shown on photo ID.");
      return;
    }

    if (!dateOfBirth) {
      toast.error("Date of birth is required for 18+ legal verification.");
      return;
    }

    if (clientAge === null || clientAge < 18) {
      toast.error("Clients must be 18 years of age or older to receive tattoo services.");
      return;
    }

    if (!ageConfirmed) {
      toast.error("Please confirm legal age and valid photo identification.");
      return;
    }

    if (!riskAcknowledged) {
      toast.error("Please review and acknowledge the procedure and aftercare risks.");
      return;
    }

    // Mandatory Permission Checkbox #1
    if (!procedureConsent) {
      toast.error("Tattoo Procedure Consent is mandatory to perform the session.");
      return;
    }

    if (!signatureDataUrl) {
      toast.error("Please provide your digital signature using the touchscreen pad.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        legalName: legalName.trim(),
        dateOfBirth,
        healthDisclosures: {
          allergies,
          allergiesDetails: allergies ? allergiesDetails : "",
          bloodThinners,
          skinConditions,
          skinConditionsDetails: skinConditions ? skinConditionsDetails : "",
          pregnantOrNursing,
          cardiacOrEpileptic,
        },
        procedureConsent: true,
        photographyConsent,
        marketingConsent,
        signatureImageUrl: signatureDataUrl,
      };

      const res = await fetch(`/api/consent/${bookingId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to record digital consent.");
        return;
      }

      const recordedData: SignedRecordData = {
        consentRecordId: data.consentRecordId,
        legalName: payload.legalName,
        dateOfBirth: payload.dateOfBirth,
        signedAt: data.signedAt || new Date().toISOString(),
        procedureConsent: true,
        photographyConsent,
        marketingConsent,
        signatureImageUrl: signatureDataUrl,
        healthDisclosures: payload.healthDisclosures,
      };

      setSignedRecord(recordedData);
      setAlreadySigned(true);
      toast.success("Consent agreement signed and recorded successfully!");
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred while signing.");
    } finally {
      setSubmitting(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-zinc-600 dark:text-zinc-400" />
          <p className="text-sm font-medium font-montserrat text-zinc-600 dark:text-zinc-400">
            Loading digital consent agreement…
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SUCCESS / ALREADY SIGNED STATE (WITH PRINT & DOWNLOAD PDF)
  // =========================================================================
  if (alreadySigned && signedRecord) {
    return (
      <div className="min-h-screen bg-zinc-50/70 py-10 px-4 sm:px-6 dark:bg-zinc-950 font-montserrat">
        {/* Print Styles for clean A4 certificate export */}
        <style jsx global>{`
          @media print {
            body {
              background: #ffffff !important;
              color: #09090b !important;
            }
            .no-print {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            .printable-document {
              box-shadow: none !important;
              border: 1px solid #e4e4e7 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 2.5cm 2cm !important;
            }
            @page {
              size: A4 portrait;
              margin: 1cm;
            }
          }
        `}</style>

        <div className="mx-auto max-w-3xl space-y-8">
          {/* Action Bar / Status Header (Hidden during browser print) */}
          <div className="no-print">
            <Card className="border-emerald-200 bg-white shadow-sm dark:border-emerald-900/60 dark:bg-zinc-900">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-emerald-100 p-2.5 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      <ShieldCheck className="size-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-serif text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                          Digital Consent Executed
                        </h2>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs"
                        >
                          Verified
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        Signed by <span className="font-semibold text-zinc-900 dark:text-zinc-200">{signedRecord.legalName}</span> on{" "}
                        {new Date(signedRecord.signedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(signedRecord.signedAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZoneName: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Button
                      onClick={handlePrint}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-sm gap-2"
                    >
                      <Printer className="size-4" />
                      Download Signed Document (PDF/Print)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formally Formatted Printable Signed Document Certificate */}
          <div className="printable-document rounded-2xl border border-zinc-200 bg-white p-8 sm:p-12 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {/* Document Header */}
            <div className="border-b border-zinc-200 pb-8 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    MEET PRERNA
                  </h1>
                  <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500 font-medium">
                    Fine Art Tattoo Studio · Consent & Release Certificate
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="size-3.5" />
                    Legally Executed
                  </span>
                  <p className="mt-2 text-[11px] text-zinc-400 font-mono">
                    Ref: {signedRecord.consentRecordId || bookingId.slice(0, 8)}
                  </p>
                </div>
              </div>
            </div>

            {/* Client & Booking Summary */}
            <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4 rounded-xl bg-zinc-50 p-5 dark:bg-zinc-800/50 text-xs">
              <div>
                <span className="block text-zinc-400 font-medium uppercase tracking-wider text-[10px]">
                  Client Legal Name
                </span>
                <span className="mt-1 block font-semibold text-zinc-900 dark:text-zinc-100">
                  {signedRecord.legalName}
                </span>
              </div>
              <div>
                <span className="block text-zinc-400 font-medium uppercase tracking-wider text-[10px]">
                  Date of Birth
                </span>
                <span className="mt-1 block font-semibold text-zinc-900 dark:text-zinc-100">
                  {signedRecord.dateOfBirth}
                </span>
              </div>
              <div>
                <span className="block text-zinc-400 font-medium uppercase tracking-wider text-[10px]">
                  Service / Procedure
                </span>
                <span className="mt-1 block font-semibold text-zinc-900 dark:text-zinc-100">
                  {booking?.serviceType || "Custom Tattoo Session"}
                </span>
              </div>
              <div>
                <span className="block text-zinc-400 font-medium uppercase tracking-wider text-[10px]">
                  Execution Date
                </span>
                <span className="mt-1 block font-semibold text-zinc-900 dark:text-zinc-100">
                  {new Date(signedRecord.signedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Permissions & Disclosures Summary */}
            <div className="mt-8 space-y-6">
              <div>
                <h3 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2 dark:border-zinc-800">
                  1. Authorizations & Permissions Granted
                </h3>
                <div className="mt-3 space-y-3 text-xs">
                  <div className="flex items-start gap-3 rounded-lg border p-3 border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <CheckCircle2 className="size-4 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Procedure Consent (Mandatory)
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        I consent to the tattoo procedure as discussed with the artist.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border p-3 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    {signedRecord.photographyConsent ? (
                      <CheckCircle2 className="size-4 text-emerald-600 mt-0.5" />
                    ) : (
                      <span className="size-4 text-zinc-400 mt-0.5 text-center font-bold">✕</span>
                    )}
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Photography Consent (Studio Archives):{" "}
                        <span className={signedRecord.photographyConsent ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-500 font-medium"}>
                          {signedRecord.photographyConsent ? "Granted" : "Declined"}
                        </span>
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        I permit MeetPrerna to take photographs of the tattoo for studio archives.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border p-3 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    {signedRecord.marketingConsent ? (
                      <CheckCircle2 className="size-4 text-emerald-600 mt-0.5" />
                    ) : (
                      <span className="size-4 text-zinc-400 mt-0.5 text-center font-bold">✕</span>
                    )}
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Marketing & Portfolio Consent:{" "}
                        <span className={signedRecord.marketingConsent ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-500 font-medium"}>
                          {signedRecord.marketingConsent ? "Granted" : "Declined"}
                        </span>
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        I permit MeetPrerna to share tattoo photographs on social media and portfolio.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Disclosures Status */}
              <div>
                <h3 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2 dark:border-zinc-800">
                  2. Medical & Health Disclosures Record
                </h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border p-3 border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 block">Allergies:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                      {signedRecord.healthDisclosures?.allergies
                        ? `Yes – ${signedRecord.healthDisclosures.allergiesDetails || "Reported"}`
                        : "None reported"}
                    </span>
                  </div>
                  <div className="rounded-lg border p-3 border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 block">Blood Thinners / Bleeding:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                      {signedRecord.healthDisclosures?.bloodThinners ? "Disclosed" : "None reported"}
                    </span>
                  </div>
                  <div className="rounded-lg border p-3 border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 block">Skin Conditions:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                      {signedRecord.healthDisclosures?.skinConditions
                        ? `Yes – ${signedRecord.healthDisclosures.skinConditionsDetails || "Reported"}`
                        : "None reported"}
                    </span>
                  </div>
                  <div className="rounded-lg border p-3 border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 block">Cardiac / Epilepsy / Diabetes:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                      {signedRecord.healthDisclosures?.cardiacOrEpileptic ? "Disclosed" : "None reported"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Digital Touchscreen Signature Section */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  3. Electronic Touchscreen Signature Verification
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Executed via Meet Prerna iPad Touchscreen System. Valid under electronic signature legislation.
                </p>

                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-xl border border-zinc-200 bg-zinc-50/70 p-6 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <div className="flex-1 space-y-1">
                    <div className="text-xs uppercase tracking-wider text-zinc-400">Signer Legal Name</div>
                    <div className="font-serif text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      {signedRecord.legalName}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Certified 18+ · Timestamp: {new Date(signedRecord.signedAt).toISOString()}
                    </div>
                  </div>

                  {signedRecord.signatureImageUrl && (
                    <div className="flex flex-col items-center">
                      <div className="rounded-lg border border-zinc-200 bg-white p-2 shadow-xs dark:border-zinc-700 dark:bg-zinc-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signedRecord.signatureImageUrl}
                          alt="Client Electronic Signature"
                          className="h-20 w-52 object-contain"
                        />
                      </div>
                      <span className="mt-1 text-[10px] text-zinc-400 font-mono">
                        Digital Signature Record
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Studio Footer */}
            <div className="mt-10 border-t border-zinc-200 pt-6 text-center text-[11px] text-zinc-400 dark:border-zinc-800">
              Meet Prerna Tattoo Studio · Confidential Medical & Consent Record · Archival Copy
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN STUDIO IPAD DIGITAL CONSENT WORKFLOW FORM
  // =========================================================================
  return (
    <div className="min-h-screen bg-zinc-50/80 px-4 py-8 sm:py-14 sm:px-6 dark:bg-zinc-950 font-montserrat">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Studio Branding & Header */}
        <div className="text-center space-y-2">
          <Badge
            variant="outline"
            className="border-amber-600/40 text-amber-700 dark:text-amber-400 text-xs tracking-wider uppercase px-3 py-1 font-medium bg-amber-500/5"
          >
            Studio iPad Digital Signer
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Meet Prerna Tattoo Studio
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
            Client Digital Consent, Health Disclosure & Release Agreement. Please review and sign below prior to your appointment.
          </p>
        </div>

        {/* Appointment Badge */}
        {booking && (
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 text-xs">
            <div className="flex items-center gap-2">
              <User className="size-4 text-zinc-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {booking.client.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-600" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {booking.serviceType}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ------------------------------------------------------------- */}
          {/* SECTION 1: Client Information & Age Verification (18+) */}
          {/* ------------------------------------------------------------- */}
          <Card className="border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <User className="size-5 text-amber-600" />
                <CardTitle className="font-serif text-xl font-semibold">
                  1. Client Identity & Age Verification
                </CardTitle>
              </div>
              <CardDescription>
                Tattoo procedures are strictly prohibited for minors under 18 years of age.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="legalName" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  Client Full Legal Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="legalName"
                  placeholder="As shown on passport, driver license, or government ID"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="h-11 font-montserrat"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    Date of Birth <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="h-11 font-montserrat"
                    required
                  />
                </div>

                <div className="flex flex-col justify-end">
                  {clientAge !== null ? (
                    isUnderage ? (
                      <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>Age: {clientAge}. Under 18 cannot be tattooed.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>Age: {clientAge} (Verified 18+ eligible)</span>
                      </div>
                    )
                  ) : (
                    <div className="rounded-lg border border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-800">
                      Enter birthdate to verify legal age eligibility.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
                <Checkbox
                  id="ageConfirmed"
                  checked={ageConfirmed}
                  onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
                  disabled={isUnderage}
                  className="mt-1 size-5 rounded"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="ageConfirmed"
                    className="text-xs font-semibold cursor-pointer text-zinc-900 dark:text-zinc-100"
                  >
                    I declare under penalty of perjury that I am 18 years or older <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    I confirm that I possess a valid, government-issued photo identification verifying my legal age.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 2: Medical & Health Disclosures */}
          {/* ------------------------------------------------------------- */}
          <Card className="border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <HeartPulse className="size-5 text-amber-600" />
                <CardTitle className="font-serif text-xl font-semibold">
                  2. Health & Medical Disclosures
                </CardTitle>
              </div>
              <CardDescription>
                For your safety and optimal pigment retention, please check any conditions that apply.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Allergies */}
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="allergies"
                    checked={allergies}
                    onCheckedChange={(c) => setAllergies(c === true)}
                    className="mt-0.5 size-5 rounded"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="allergies" className="text-xs font-semibold cursor-pointer text-zinc-900 dark:text-zinc-100">
                      Allergies
                    </Label>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Known allergies to latex, metals, pigments, soaps, topical ointments, or antibiotics.
                    </p>
                  </div>
                </div>
                {allergies && (
                  <div className="pl-8 pt-1">
                    <Input
                      placeholder="Please list your specific allergies..."
                      value={allergiesDetails}
                      onChange={(e) => setAllergiesDetails(e.target.value)}
                      className="text-xs h-9 font-montserrat"
                    />
                  </div>
                )}
              </div>

              {/* Blood thinners */}
              <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <Checkbox
                  id="bloodThinners"
                  checked={bloodThinners}
                  onCheckedChange={(c) => setBloodThinners(c === true)}
                  className="mt-0.5 size-5 rounded"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="bloodThinners" className="text-xs font-semibold cursor-pointer text-zinc-900 dark:text-zinc-100">
                    Blood Thinning Medications or Bleeding Disorders
                  </Label>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Taking aspirin, anticoagulants, or having hemophilia or clotting conditions.
                  </p>
                </div>
              </div>

              {/* Skin Conditions */}
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="skinConditions"
                    checked={skinConditions}
                    onCheckedChange={(c) => setSkinConditions(c === true)}
                    className="mt-0.5 size-5 rounded"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="skinConditions" className="text-xs font-semibold cursor-pointer text-zinc-900 dark:text-zinc-100">
                      Skin Conditions
                    </Label>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Eczema, psoriasis, keloid scarring tendency, open lesions, or active infections in or near tattoo area.
                    </p>
                  </div>
                </div>
                {skinConditions && (
                  <div className="pl-8 pt-1">
                    <Input
                      placeholder="Describe skin condition and affected anatomical location..."
                      value={skinConditionsDetails}
                      onChange={(e) => setSkinConditionsDetails(e.target.value)}
                      className="text-xs h-9 font-montserrat"
                    />
                  </div>
                )}
              </div>

              {/* Cardiac / Epilepsy */}
              <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <Checkbox
                  id="cardiacOrEpileptic"
                  checked={cardiacOrEpileptic}
                  onCheckedChange={(c) => setCardiacOrEpileptic(c === true)}
                  className="mt-0.5 size-5 rounded"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="cardiacOrEpileptic" className="text-xs font-semibold cursor-pointer text-zinc-900 dark:text-zinc-100">
                    Cardiac Condition, Pacemaker, Epilepsy or Seizure History
                  </Label>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Any cardiac disease, implanted medical devices, or tendency to faint or experience seizures.
                  </p>
                </div>
              </div>

              {/* Pregnancy / Nursing */}
              <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <Checkbox
                  id="pregnantOrNursing"
                  checked={pregnantOrNursing}
                  onCheckedChange={(c) => setPregnantOrNursing(c === true)}
                  className="mt-0.5 size-5 rounded"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="pregnantOrNursing" className="text-xs font-semibold cursor-pointer text-zinc-900 dark:text-zinc-100">
                    Currently Pregnant or Nursing
                  </Label>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Tattooing while pregnant or nursing carries elevated medical risks and is strongly discouraged.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 3: Procedure & Risk Acknowledgement */}
          {/* ------------------------------------------------------------- */}
          <Card className="border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-amber-600" />
                <CardTitle className="font-serif text-xl font-semibold">
                  3. Procedure & Risk Acknowledgement
                </CardTitle>
              </div>
              <CardDescription>
                Important studio policies and physiological considerations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 text-xs space-y-2 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400 max-h-48 overflow-y-auto leading-relaxed">
                <p>
                  <strong className="text-zinc-900 dark:text-zinc-200">Permanence:</strong> I acknowledge that a tattoo is an irreversible, permanent change to my appearance. Colors, shading, and line thickness may mature over time depending on skin elasticity, exposure to sunlight, and individual biological factors.
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-zinc-200">Sterilization & Safety:</strong> Meet Prerna uses single-use, sterile disposable cartridges and hospital-grade sanitization. I agree to rigorously follow all written and verbal aftercare instructions to prevent infection.
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-zinc-200">Sobriety:</strong> I confirm that I am not currently under the influence of alcohol, recreational drugs, or narcotics, which increase bleeding and compromise judgement.
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-zinc-200">Design Approval:</strong> I have reviewed and approved the tattoo design, placement, size, and spelling.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
                <Checkbox
                  id="riskAcknowledged"
                  checked={riskAcknowledged}
                  onCheckedChange={(c) => setRiskAcknowledged(c === true)}
                  className="mt-1 size-5 rounded"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="riskAcknowledged" className="text-xs font-semibold cursor-pointer text-zinc-900 dark:text-zinc-100">
                    I acknowledge and accept all procedure risks, permanence, and aftercare responsibilities <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Required to proceed with the tattoo session.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 4: Three Separate Permission Checkboxes */}
          {/* ------------------------------------------------------------- */}
          <Card className="border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Camera className="size-5 text-amber-600" />
                <CardTitle className="font-serif text-xl font-semibold">
                  4. Permissions & Authorizations
                </CardTitle>
              </div>
              <CardDescription>
                Please indicate your consent for each separate authorization below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Checkbox 1: Procedure Consent (Mandatory) */}
              <div className="flex items-start gap-3 rounded-xl border-2 border-amber-600/30 bg-amber-50/20 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
                <Checkbox
                  id="procedureConsent"
                  checked={procedureConsent}
                  onCheckedChange={(c) => setProcedureConsent(c === true)}
                  className="mt-1 size-5 rounded data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="procedureConsent" className="text-xs font-bold cursor-pointer text-zinc-950 dark:text-zinc-50">
                      1. Procedure Consent (Mandatory)
                    </Label>
                    <Badge variant="destructive" className="text-[10px] uppercase h-5 px-1.5">
                      Required
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    &quot;I consent to the tattoo procedure as discussed.&quot;
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Authorizes Meet Prerna tattoo artists to execute the approved tattoo art on your body.
                  </p>
                </div>
              </div>

              {/* Checkbox 2: Photography Consent (Optional) */}
              <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <Checkbox
                  id="photographyConsent"
                  checked={photographyConsent}
                  onCheckedChange={(c) => setPhotographyConsent(c === true)}
                  className="mt-1 size-5 rounded"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="photographyConsent" className="text-xs font-semibold cursor-pointer text-zinc-900 dark:text-zinc-100">
                      2. Photography Consent (Optional)
                    </Label>
                    <Badge variant="secondary" className="text-[10px] uppercase h-5 px-1.5">
                      Optional
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">
                    &quot;I permit MeetPrerna to take photographs of the tattoo for studio archives.&quot;
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Used strictly for confidential studio client record-keeping, before/after documentation, and healed tracking.
                  </p>
                </div>
              </div>

              {/* Checkbox 3: Marketing Consent (Optional) */}
              <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <Checkbox
                  id="marketingConsent"
                  checked={marketingConsent}
                  onCheckedChange={(c) => setMarketingConsent(c === true)}
                  className="mt-1 size-5 rounded"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="marketingConsent" className="text-xs font-semibold cursor-pointer text-zinc-900 dark:text-zinc-100">
                      3. Marketing Consent (Optional)
                    </Label>
                    <Badge variant="secondary" className="text-[10px] uppercase h-5 px-1.5">
                      Optional
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">
                    &quot;I permit MeetPrerna to share tattoo photographs on social media and portfolio.&quot;
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Allows the studio to showcase the artwork on Instagram, portfolio website, and promotional publications.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 5: iPad Touchscreen Signature Pad */}
          {/* ------------------------------------------------------------- */}
          <Card className="border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PenLine className="size-5 text-amber-600" />
                <CardTitle className="font-serif text-xl font-semibold">
                  5. Client Digital Signature
                </CardTitle>
              </div>
              <CardDescription>
                Draw your signature on the iPad screen using an Apple Pencil, stylus, or your finger.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SignaturePad
                ref={signaturePadRef}
                height={200}
                onSignatureChange={(url) => setSignatureDataUrl(url)}
                disabled={submitting}
              />

              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1 border-t pt-3 dark:border-zinc-800">
                <p>
                  By signing above, I verify that all health disclosures are complete and truthful, and I legally execute this agreement as of{" "}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  .
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || isUnderage}
            className="w-full h-12 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 text-sm font-semibold tracking-wide shadow-md gap-2"
          >
            {submitting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <FileCheck2 className="size-5" />
            )}
            {submitting ? "Recording Digital Consent…" : "Complete & Sign Digital Consent"}
          </Button>
        </form>
      </div>
    </div>
  );
}
