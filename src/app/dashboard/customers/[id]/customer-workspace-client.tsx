"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, MessageSquare, Mail, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Left Column
import { CustomerIdentityCard } from "@/components/dashboard/customer-workspace/left-column/customer-identity-card";
import { QuickActionsToolbar } from "@/components/dashboard/customer-workspace/left-column/quick-actions-toolbar";
import { ClientPropertiesCard } from "@/components/dashboard/customer-workspace/left-column/client-properties-card";
import { ArtistPrivateNotes } from "@/components/dashboard/customer-workspace/left-column/artist-private-notes";

// Center Column
import { ActiveProjectHeader } from "@/components/dashboard/customer-workspace/center-column/active-project-header";
import { PipelineProgressionBar } from "@/components/dashboard/customer-workspace/center-column/pipeline-progression-bar";
import { CurrentStageActionCard } from "@/components/dashboard/customer-workspace/center-column/current-stage-action-card";
import { CommunicationTimeline } from "@/components/dashboard/customer-workspace/center-column/communication-timeline";
import { QuickWhatsAppComposer } from "@/components/dashboard/customer-workspace/center-column/quick-whatsapp-composer";
import { NoActiveProjectCard } from "@/components/dashboard/customer-workspace/center-column/no-active-project-card";

// Right Column
import { TattooProjectsSwitcher } from "@/components/dashboard/customer-workspace/right-column/tattoo-projects-switcher";
import { UpcomingSessionsCard } from "@/components/dashboard/customer-workspace/right-column/upcoming-sessions-card";
import { EmbeddedMediaGallery } from "@/components/dashboard/customer-workspace/right-column/embedded-media-gallery";
import { FinancialSummaryCard } from "@/components/dashboard/customer-workspace/right-column/financial-summary-card";
import { DigitalConsentCard } from "@/components/dashboard/customer-workspace/right-column/digital-consent-card";

// Modals
import { ScheduleSessionModal } from "@/components/dashboard/customer-workspace/modals/schedule-session-modal";
import { UploadMediaModal } from "@/components/dashboard/customer-workspace/modals/upload-media-modal";
import { LogCallModal } from "@/components/dashboard/customer-workspace/modals/log-call-modal";
import { PaperConsentOverrideModal } from "@/components/dashboard/customer-workspace/modals/paper-consent-override-modal";
import { ImageLightboxModal } from "@/components/dashboard/customer-workspace/modals/image-lightbox-modal";

import type { UnifiedCustomerWorkspaceData } from "@/lib/customers";

export default function CustomerWorkspaceClient({
  initialData,
  initialBookingId,
}: {
  initialData: any; // Serialized UnifiedCustomerWorkspaceData
  initialBookingId?: string;
}) {
  const router = useRouter();

  // Active Project Selection with defensive fallbacks
  const defaultBookingId = useMemo(() => {
    if (initialBookingId && initialData.bookings.some((b: any) => b.id === initialBookingId)) {
      return initialBookingId;
    }
    const nonTerminal = initialData.bookings.find(
      (b: any) =>
        b.stage !== "closed_followup" &&
        b.stage !== "not_a_fit" &&
        b.stage !== "cancelled"
    );
    if (nonTerminal) return nonTerminal.id;
    return initialData.bookings[0]?.id || null;
  }, [initialBookingId, initialData.bookings]);

  const [activeBookingId, setActiveBookingId] = useState<string | null>(defaultBookingId);

  // Active booking entity
  const activeBooking = useMemo(() => {
    if (!activeBookingId) return null;
    return initialData.bookings.find((b: any) => b.id === activeBookingId) || null;
  }, [activeBookingId, initialData.bookings]);

  // Local optimistic messages state
  const [messages, setMessages] = useState<any[]>(initialData.messages || []);

  // Modal triggers
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
  const [isPaperOverrideModalOpen, setIsPaperOverrideModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedLightboxUrl, setSelectedLightboxUrl] = useState<string | null>(null);

  // Multi-project switching (shallow URL update)
  const handleSelectProject = useCallback(
    (newBookingId: string) => {
      setActiveBookingId(newBookingId);
      const url = new URL(window.location.href);
      url.searchParams.set("bookingId", newBookingId);
      window.history.replaceState({}, "", url.toString());
    },
    []
  );

  // Fast refresh
  const handleRefresh = useCallback(async () => {
    router.refresh();
  }, [router]);

  // Quick Action: WhatsApp
  const handleOpenWhatsApp = useCallback(() => {
    const composer = document.getElementById("quick-whatsapp-composer-section");
    if (composer) {
      composer.scrollIntoView({ behavior: "smooth", block: "center" });
      const textarea = composer.querySelector("textarea");
      if (textarea) textarea.focus();
    } else {
      const cleanPhone = initialData.customer.phone.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${cleanPhone}`, "_blank", "noopener,noreferrer");
    }
  }, [initialData.customer.phone]);

  // Quick Action: Email
  const handleOpenEmail = useCallback(() => {
    window.location.href = `mailto:${initialData.customer.email}?subject=MeetPrerna Tattoo Studio Consultation`;
  }, [initialData.customer.email]);

  // Quick Action: Call
  const handleOpenCall = useCallback(() => {
    setIsLogCallModalOpen(true);
  }, []);

  // Quick Action: Notes Focus
  const handleFocusNotes = useCallback(() => {
    const notesElem = document.getElementById("artist-private-notes-section");
    if (notesElem) {
      notesElem.scrollIntoView({ behavior: "smooth", block: "center" });
      const textarea = notesElem.querySelector("textarea");
      if (textarea) textarea.focus();
    }
  }, []);

  // Lightbox Trigger
  const handleImageClick = useCallback((url: string) => {
    setSelectedLightboxUrl(url);
    setIsLightboxOpen(true);
  }, []);

  // Optimistic WhatsApp sending / logging
  const handleSendWhatsAppOptimistic = useCallback(
    async (content: string, logOnly = false) => {
      if (!activeBooking) {
        toast.error("Cannot dispatch message: No active project selected");
        return;
      }

      const tempId = `opt-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        bookingId: activeBooking.id,
        channel: "whatsapp",
        direction: "outbound",
        content,
        templateName: null,
        hubspotTimelineEventId: null,
        deliveryStatus: "sending",
        errorMessage: null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const res = await fetch(`/api/bookings/${activeBooking.id}/whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, logOnly }),
        });
        const result = await res.json();
        if (!res.ok || !result.ok) {
          throw new Error(result.error || "Failed to dispatch message");
        }

        // Reconcile optimistic message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  ...(result.data || {}),
                  deliveryStatus: "sent",
                }
              : m
          )
        );
        toast.success(logOnly ? "Logged to timeline" : "WhatsApp message dispatched");
      } catch (err: any) {
        // Rollback
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(`Message dispatch failed: ${err.message}`);
      }
    },
    [activeBooking]
  );

  // Phone Call logging handler
  const handleLogCall = useCallback(
    async (content: string) => {
      if (!activeBooking) {
        toast.error("Cannot log call: No active project selected");
        return;
      }

      const tempId = `opt-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        bookingId: activeBooking.id,
        channel: "call",
        direction: "outbound",
        content,
        templateName: null,
        hubspotTimelineEventId: null,
        deliveryStatus: "logged",
        errorMessage: null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const res = await fetch(`/api/bookings/${activeBooking.id}/whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, logOnly: true }),
        });
        const result = await res.json();
        if (!res.ok || !result.ok) {
          throw new Error(result.error || "Failed to log call outcome");
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, ...(result.data || {}) } : m))
        );
      } catch (err: any) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw err;
      }
    },
    [activeBooking]
  );

  // Sessions and Consent context
  const currentSessions = useMemo(() => {
    if (!activeBooking) return initialData.sessions || [];
    return (initialData.sessions || []).filter((s: any) => s.bookingId === activeBooking.id);
  }, [activeBooking, initialData.sessions]);

  const currentConsentRecords = useMemo(() => {
    if (!activeBooking) return initialData.consentRecords || [];
    const activeRecords = (initialData.consentRecords || []).filter(
      (c: any) => c.bookingId === activeBooking.id
    );
    return activeRecords.length > 0 ? activeRecords : initialData.consentRecords || [];
  }, [activeBooking, initialData.consentRecords]);

  const hasSignedConsent = currentConsentRecords.length > 0;
  const isRepeatCollector = (initialData.bookings?.length || 0) > 1;

  return (
    <div className="min-h-screen bg-background text-foreground font-body pb-12">
      {/* Top Studio Breadcrumb & Context Header */}
      <div className="border-b border-border/70 bg-card/60 px-4 py-3 sm:px-6 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/bookings"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Return to Bookings Pipeline"
            >
              <ArrowLeft className="size-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Client Workspace
                </span>
                <span className="text-muted-foreground/50">/</span>
                <span className="font-heading font-bold text-sm text-foreground">
                  {initialData.customer.name}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Unified CRM profile • Customer ID: <code className="text-[10px]">{initialData.customer.id.slice(0, 8)}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/customers"
              className="hidden sm:inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              All Clients
            </Link>
          </div>
        </div>
      </div>

      {/* Main 3-Column Responsive Grid */}
      <main className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* ======================================================== */}
          {/* LEFT COLUMN: Identity, Quick Actions, Props, Notes (25%) */}
          {/* ======================================================== */}
          <aside className="col-span-12 md:col-span-4 xl:col-span-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-5.5rem)] xl:overflow-y-auto pr-1 scrollbar-thin space-y-4">
            <CustomerIdentityCard
              customer={initialData.customer}
              isRepeat={isRepeatCollector}
              totalSpendNumber={initialData.totalSpendNumber || 0}
            />

            <QuickActionsToolbar
              phone={initialData.customer.phone}
              email={initialData.customer.email}
              onOpenWhatsApp={handleOpenWhatsApp}
              onOpenEmail={handleOpenEmail}
              onOpenCall={handleOpenCall}
              onFocusNotes={handleFocusNotes}
            />

            <ClientPropertiesCard
              customer={initialData.customer}
              formattedTotalSpend={initialData.formattedTotalSpend}
              projectsCount={initialData.bookings?.length || 0}
              hasSignedConsent={hasSignedConsent}
            />

            <ArtistPrivateNotes
              customerId={initialData.customer.id}
              initialNotes={initialData.customer.notes}
            />
          </aside>

          {/* ======================================================== */}
          {/* CENTER COLUMN: Project Overview, Pipeline, Action Center, */}
          {/*                Timeline, and WhatsApp Composer (50%)     */}
          {/* ======================================================== */}
          <section className="col-span-12 md:col-span-8 xl:col-span-6 space-y-5">
            {activeBooking ? (
              <>
                <ActiveProjectHeader
                  booking={activeBooking}
                  onImageClick={handleImageClick}
                />

                <PipelineProgressionBar
                  currentStageRaw={activeBooking.stage}
                />

                <CurrentStageActionCard
                  booking={activeBooking}
                  customer={initialData.customer}
                  onRefresh={handleRefresh}
                  onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
                  onOpenUploadModal={() => setIsUploadModalOpen(true)}
                />
              </>
            ) : (
              <NoActiveProjectCard
                customerName={initialData.customer.name}
              />
            )}

            {/* Chronological Communication Timeline */}
            <CommunicationTimeline
              messages={messages}
              activeBookingId={activeBooking?.id || null}
            />

            {/* Quick WhatsApp Inline Composer */}
            <div id="quick-whatsapp-composer-section">
              <QuickWhatsAppComposer
                customerName={initialData.customer.name}
                customerPhone={initialData.customer.phone}
                onSend={handleSendWhatsAppOptimistic}
              />
            </div>
          </section>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Project Switcher, Sessions, Media Gallery, */}
          {/*               Financial Ledger, Digital Consent (25%)    */}
          {/* ======================================================== */}
          <aside className="col-span-12 md:col-span-12 xl:col-span-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-5.5rem)] xl:overflow-y-auto pr-1 scrollbar-thin space-y-4">
            <TattooProjectsSwitcher
              bookings={initialData.bookings || []}
              activeBookingId={activeBooking?.id || null}
              onSelectBooking={handleSelectProject}
            />

            <UpcomingSessionsCard
              sessions={currentSessions}
              onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
            />

            <EmbeddedMediaGallery
              mediaAssets={initialData.mediaAssets || []}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onImageClick={handleImageClick}
            />

            <FinancialSummaryCard
              booking={activeBooking}
              allPayments={initialData.allPayments || []}
              formattedTotalSpend={initialData.formattedTotalSpend}
            />

            <DigitalConsentCard
              bookingId={activeBooking?.id || null}
              consentRecords={currentConsentRecords}
              onOpenPaperOverrideModal={() => setIsPaperOverrideModalOpen(true)}
            />
          </aside>
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODALS SUITE                                             */}
      {/* ======================================================== */}
      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        bookingId={activeBooking?.id || null}
        customerName={initialData.customer.name}
        onSuccess={handleRefresh}
      />

      <UploadMediaModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        customerId={initialData.customer.id}
        bookingId={activeBooking?.id || null}
        customerName={initialData.customer.name}
        onSuccess={handleRefresh}
      />

      <LogCallModal
        isOpen={isLogCallModalOpen}
        onClose={() => setIsLogCallModalOpen(false)}
        customerName={initialData.customer.name}
        customerPhone={initialData.customer.phone}
        onLogCall={handleLogCall}
      />

      <PaperConsentOverrideModal
        isOpen={isPaperOverrideModalOpen}
        onClose={() => setIsPaperOverrideModalOpen(false)}
        bookingId={activeBooking?.id || null}
        customerName={initialData.customer.name}
        onSuccess={handleRefresh}
      />

      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        imageUrl={selectedLightboxUrl}
      />
    </div>
  );
}
