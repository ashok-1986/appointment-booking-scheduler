"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CalendarDays,
  List,
  Grid3X3,
  Columns,
  RefreshCw,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ViewMode,
  SessionItem,
  ClientOption,
  TIME_SLOTS,
} from "@/components/dashboard/calendar/types";
import { StatusBadge, ConsentBadge } from "@/components/dashboard/calendar/status-badges";
import { AppointmentModal } from "@/components/dashboard/calendar/appointment-modal";
import { SessionDetailsModal } from "@/components/dashboard/calendar/session-details-modal";
import { WhatsAppConfirmationModal } from "@/components/dashboard/calendar/whatsapp-modal";

export default function CalendarPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Appointment Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientInstagram, setNewClientInstagram] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("11:00");
  const [appointmentDuration, setAppointmentDuration] = useState(180);
  const [serviceType, setServiceType] = useState("Tattoo");
  const [placement, setPlacement] = useState("");
  const [designDescription, setDesignDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Session Details Modal
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);

  // WhatsApp Confirmation Modal
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappData, setWhatsappData] = useState<{
    clientName: string;
    phone: string;
    message: string;
    url: string;
  } | null>(null);

  // Fetch all sessions & clients
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/calendar/sessions");
      const data = await res.json();
      if (data.ok) {
        setSessions(data.sessions || []);
        setClients(data.clients || []);
      } else {
        toast.error(data.error || "Failed to load studio schedule");
      }
    } catch (err) {
      console.error("Calendar fetch error:", err);
      toast.error("Failed to connect to studio calendar service");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Real-time conflict detection check in appointment modal
  const detectedConflict = useMemo(() => {
    if (!appointmentDate || !appointmentTime) return null;
    try {
      const [year, month, day] = appointmentDate.split("-").map(Number);
      const [hour, min] = appointmentTime.split(":").map(Number);
      const start = new Date(year, month - 1, day, hour, min, 0);
      const end = new Date(start.getTime() + appointmentDuration * 60 * 1000);

      const conflicting = sessions.find((s) => {
        if (s.status === "cancelled") return false;
        const sStart = new Date(s.scheduledStart);
        const sEnd = new Date(s.scheduledEnd);
        return sStart < end && sEnd > start;
      });

      return conflicting || null;
    } catch {
      return null;
    }
  }, [appointmentDate, appointmentTime, appointmentDuration, sessions]);

  // Open Appointment Modal with optional pre-filled date and time
  const handleOpenNewAppointment = (date?: Date, time?: string) => {
    const targetDate = date || new Date();
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");

    setAppointmentDate(`${yyyy}-${mm}-${dd}`);
    setAppointmentTime(time || "11:00");
    setAppointmentDuration(180);
    setServiceType("Tattoo");
    setPlacement("");
    setDesignDescription("");
    setNotes("");
    setIsNewClient(false);
    setSelectedClientId(clients.length > 0 ? clients[0].id : "");
    setNewClientName("");
    setNewClientEmail("");
    setNewClientPhone("");
    setNewClientInstagram("");
    setAllowOverlap(false);
    setModalOpen(true);
  };

  // Submit appointment creation
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appointmentDate || !appointmentTime) {
      toast.error("Please pick a valid appointment date and time");
      return;
    }

    if (isNewClient) {
      if (!newClientName || !newClientEmail || !newClientPhone) {
        toast.error("Please fill in Name, Email, and Phone number for the new client");
        return;
      }
    } else if (!selectedClientId) {
      toast.error("Please select a client");
      return;
    }

    if (detectedConflict && !allowOverlap) {
      toast.error("Scheduling conflict detected. Please resolve or check 'Override conflict'.");
      return;
    }

    try {
      setIsSubmitting(true);
      const [year, month, day] = appointmentDate.split("-").map(Number);
      const [hour, min] = appointmentTime.split(":").map(Number);
      const scheduledStart = new Date(year, month - 1, day, hour, min, 0).toISOString();

      const payload: any = {
        scheduledStart,
        durationMinutes: appointmentDuration,
        serviceType,
        placement: placement || null,
        designDescription: designDescription || null,
        notes: notes || null,
        allowOverlap,
      };

      if (isNewClient) {
        payload.newClient = {
          name: newClientName,
          email: newClientEmail,
          phone: newClientPhone,
          instagramHandle: newClientInstagram || null,
        };
      } else {
        payload.clientId = selectedClientId;
      }

      const res = await fetch("/api/calendar/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success("Appointment successfully scheduled!");
        setModalOpen(false);
        fetchSessions();

        // Offer immediate WhatsApp confirmation
        if (data.whatsappMessage && data.whatsappUrl) {
          setWhatsappData({
            clientName: data.client.name,
            phone: data.client.phone,
            message: data.whatsappMessage,
            url: data.whatsappUrl,
          });
          setWhatsappModalOpen(true);
        }
      } else {
        toast.error(data.error || "Failed to schedule appointment");
      }
    } catch (err) {
      console.error("Schedule error:", err);
      toast.error("Failed to connect to appointment scheduler");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick WhatsApp Confirmation trigger from session card
  const handleTriggerWhatsApp = (session: SessionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const start = new Date(session.scheduledStart);
    const end = new Date(session.scheduledEnd);
    const cleanPhone = session.client.phone.replace(/[^0-9]/g, "");

    const dateFormatted = start.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const startTimeStr = start.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const endTimeStr = end.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const durationHours = (session.durationMinutes / 60).toFixed(
      session.durationMinutes % 60 === 0 ? 0 : 1
    );

    const message =
      `Hi ${session.client.name}! ✨\n\n` +
      `Your tattoo session with Prerna at Meet Prerna Studio is confirmed:\n` +
      `📅 Date: ${dateFormatted}\n` +
      `⏰ Time: ${startTimeStr} to ${endTimeStr} (${durationHours} hrs)\n` +
      `🎨 Service: ${session.booking.serviceType}${session.booking.placement ? ` (${session.booking.placement})` : ""}\n` +
      `📍 Studio: Indiranagar, Bangalore\n\n` +
      `Please arrive 10 minutes early, well-hydrated and having eaten a good meal. Looking forward to creating your piece!`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    setWhatsappData({
      clientName: session.client.name,
      phone: session.client.phone,
      message,
      url,
    });
    setWhatsappModalOpen(true);
  };

  // Update session status (e.g. In Progress, Completed, Cancelled)
  const handleUpdateStatus = async (sessionId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/calendar/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Session status updated to ${newStatus}`);
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s))
        );
        if (selectedSession && selectedSession.id === sessionId) {
          setSelectedSession((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        toast.error(data.error || "Failed to update session status");
      }
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Network error updating status");
    }
  };

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === "month") next.setMonth(next.getMonth() - 1);
    else if (viewMode === "week") next.setDate(next.getDate() - 7);
    else if (viewMode === "day") next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === "month") next.setMonth(next.getMonth() + 1);
    else if (viewMode === "week") next.setDate(next.getDate() + 7);
    else if (viewMode === "day") next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Header Title Formatting
  const viewTitle = useMemo(() => {
    const locale = "en-IN";
    if (viewMode === "month") {
      return currentDate.toLocaleDateString(locale, { month: "long", year: "numeric" });
    }
    if (viewMode === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      })} to ${endOfWeek.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    }
    if (viewMode === "day") {
      return currentDate.toLocaleDateString(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    return "All Scheduled Sessions";
  }, [viewMode, currentDate]);

  // Calendar Month Matrix Calculation
  const monthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDay = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    const matrix: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      sessions: SessionItem[];
    }> = [];

    // Preceding month trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      matrix.push({
        date: d,
        isCurrentMonth: false,
        isToday: isSameDay(d, new Date()),
        sessions: getSessionsForDay(d, sessions),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      matrix.push({
        date: d,
        isCurrentMonth: true,
        isToday: isSameDay(d, new Date()),
        sessions: getSessionsForDay(d, sessions),
      });
    }

    // Trailing month leading days to complete full 35 or 42 grid
    const remaining = (7 - (matrix.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      matrix.push({
        date: d,
        isCurrentMonth: false,
        isToday: isSameDay(d, new Date()),
        sessions: getSessionsForDay(d, sessions),
      });
    }

    return matrix;
  }, [currentDate, sessions]);

  // Week View Days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        date: d,
        isToday: isSameDay(d, new Date()),
        sessions: getSessionsForDay(d, sessions),
      };
    });
  }, [currentDate, sessions]);

  // Day View Sessions
  const daySessions = useMemo(() => {
    return getSessionsForDay(currentDate, sessions);
  }, [currentDate, sessions]);

  // Agenda Sessions sorted
  const agendaSessions = useMemo(() => {
    return [...sessions]
      .filter((s) => s.status !== "cancelled")
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
  }, [sessions]);

  // Helper check for same calendar day
  function isSameDay(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  // Filter sessions that fall on date
  function getSessionsForDay(date: Date, allSessions: SessionItem[]) {
    return allSessions.filter((s) => {
      const sDate = new Date(s.scheduledStart);
      return isSameDay(sDate, date);
    });
  }

  // Status Badge Helper
  const getStatusBadge = (status: string) => <StatusBadge status={status} />;

  // Consent Status Badge Helper
  const getConsentBadge = (consentStatus: string) => (
    <ConsentBadge consentStatus={consentStatus} />
  );

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-semibold px-2.5 py-0.5 rounded-full bg-[#C4FF61] text-[#1A1A1A]">
              Artist Studio Scheduler
            </span>
            <span className="text-xs text-muted-foreground font-mono">CD-05</span>
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-serif font-light tracking-tight text-foreground">
            Artist-Controlled Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-light">
            Exclusive artist studio view. Schedule appointments, review health disclosures, manage conflict checks, and trigger instant WhatsApp confirmations.
          </p>
        </div>

        {/* View Switcher & Action Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher Pills */}
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1 border border-zinc-200/80 dark:border-zinc-800">
            <button
              onClick={() => setViewMode("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                viewMode === "month"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-[#C4FF61]"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                viewMode === "week"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-[#C4FF61]"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Week</span>
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                viewMode === "day"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-[#C4FF61]"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Day</span>
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                viewMode === "agenda"
                  ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-[#C4FF61]"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Agenda</span>
            </button>
          </div>

          <Button
            onClick={() => handleOpenNewAppointment()}
            className="bg-[#C4FF61] hover:bg-[#b2f04b] text-[#1A1A1A] font-medium shadow-sm transition-all hover:shadow-md gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Appointment</span>
          </Button>
        </div>
      </div>

      {/* Date Navigation & Summary Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-50/80 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-background overflow-hidden shadow-xs">
            <button
              onClick={handlePrev}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-medium text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 border-x border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-light tracking-tight text-foreground">
            {viewTitle}
          </h2>
        </div>

        {/* Quick Studio Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#C4FF61]" />
            <span>
              <strong className="text-foreground font-medium">
                {sessions.filter((s) => s.status === "scheduled").length}
              </strong>{" "}
              Scheduled
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              <strong className="text-foreground font-medium">
                {sessions.filter((s) => s.status === "completed").length}
              </strong>{" "}
              Completed
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>
              <strong className="text-foreground font-medium">
                {sessions.filter((s) => s.consentStatus !== "signed" && s.status === "scheduled").length}
              </strong>{" "}
              Consent Pending
            </span>
          </div>
        </div>
      </div>

      {/* Main Calendar View Body */}
      {loading ? (
        <div className="min-h-[450px] flex items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-background">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A] dark:text-[#C4FF61]" />
            <p className="text-xs text-muted-foreground">Loading calendar schedule...</p>
          </div>
        </div>
      ) : viewMode === "month" ? (
        /* ==================== MONTH VIEW ==================== */
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-background shadow-xs">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-center text-xs font-medium text-muted-foreground py-2.5">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200 dark:divide-zinc-800">
            {monthMatrix.map((cell, idx) => {
              const formattedDate = cell.date.getDate();

              return (
                <div
                  key={idx}
                  onClick={() => handleOpenNewAppointment(cell.date)}
                  className={`min-h-[110px] sm:min-h-[135px] p-2 flex flex-col justify-between transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 cursor-pointer ${
                    !cell.isCurrentMonth ? "bg-zinc-50/40 dark:bg-zinc-950/40 opacity-40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold rounded-full h-6 w-6 flex items-center justify-center ${
                        cell.isToday
                          ? "bg-[#C4FF61] text-[#1A1A1A] font-bold shadow-xs"
                          : "text-foreground"
                      }`}
                    >
                      {formattedDate}
                    </span>

                    {cell.sessions.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {cell.sessions.length} appt{cell.sessions.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Sessions pills inside cell */}
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[85px] scrollbar-none">
                    {cell.sessions.slice(0, 3).map((session) => {
                      const startTime = new Date(session.scheduledStart).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={session.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                          }}
                          className={`group/item text-[11px] p-1.5 rounded-lg border flex flex-col gap-0.5 transition-all hover:scale-[1.02] shadow-2xs ${
                            session.status === "completed"
                              ? "bg-zinc-100/80 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                              : session.status === "in_progress"
                              ? "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-400"
                              : "bg-[#C4FF61]/15 text-[#1A1A1A] dark:text-[#C4FF61] border-[#C4FF61]/40"
                          }`}
                        >
                          <div className="flex items-center justify-between font-medium">
                            <span className="truncate">{session.client.name}</span>
                            <span className="text-[9px] opacity-75">{startTime}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] opacity-80">
                            <span className="truncate">{session.booking.placement || session.booking.serviceType}</span>
                            {session.consentStatus === "signed" ? (
                              <ShieldCheck className="h-2.5 w-2.5 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <Clock className="h-2.5 w-2.5 text-amber-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {cell.sessions.length > 3 && (
                      <div className="text-[10px] text-center text-muted-foreground font-medium pt-0.5">
                        +{cell.sessions.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === "week" ? (
        /* ==================== WEEK VIEW ==================== */
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-background shadow-xs">
          <div className="min-w-[850px]">
            {/* Week Header with 7 Days */}
            <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 divide-x divide-zinc-200 dark:divide-zinc-800">
              {weekDays.map((col, idx) => {
                const dayName = col.date.toLocaleDateString("en-IN", { weekday: "short" });
                const dayNum = col.date.getDate();

                return (
                  <div
                    key={idx}
                    className={`py-3 px-2 text-center ${
                      col.isToday ? "bg-[#C4FF61]/10 font-medium" : ""
                    }`}
                  >
                    <p className="text-xs text-muted-foreground uppercase">{dayName}</p>
                    <p
                      className={`text-lg font-serif mt-0.5 inline-flex items-center justify-center h-7 w-7 rounded-full ${
                        col.isToday ? "bg-[#C4FF61] text-[#1A1A1A] font-bold" : "text-foreground"
                      }`}
                    >
                      {dayNum}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 7 Columns with Sessions */}
            <div className="grid grid-cols-7 divide-x divide-zinc-200 dark:divide-zinc-800 min-h-[500px]">
              {weekDays.map((col, idx) => {
                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenNewAppointment(col.date)}
                    className="p-2 space-y-2.5 flex flex-col hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 cursor-pointer"
                  >
                    {col.sessions.map((session) => {
                      const start = new Date(session.scheduledStart).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      const end = new Date(session.scheduledEnd).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={session.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                          }}
                          className="rounded-xl border border-zinc-200/90 dark:border-zinc-700/80 p-2.5 bg-card shadow-xs hover:shadow-md transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {session.client.name}
                            </span>
                            {getStatusBadge(session.status)}
                          </div>

                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {start} to {end}
                            </span>
                          </div>

                          {session.booking.placement && (
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
                              📍 {session.booking.placement}
                            </p>
                          )}

                          <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            {getConsentBadge(session.consentStatus)}
                            <button
                              onClick={(e) => handleTriggerWhatsApp(session, e)}
                              className="rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 p-1 text-[#25D366] transition-colors"
                              title="Quick WhatsApp Confirmation"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {col.sessions.length === 0 && (
                      <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground/60 italic p-4 text-center">
                        Click to add
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : viewMode === "day" ? (
        /* ==================== DAY VIEW ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Day Timeline (2 Cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-background p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-xl font-serif font-light text-foreground">
                  {currentDate.toLocaleDateString("en-IN", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {daySessions.length} session{daySessions.length !== 1 ? "s" : ""} booked for this date
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => handleOpenNewAppointment(currentDate)}
                className="bg-[#C4FF61] text-[#1A1A1A] hover:bg-[#b2f04b]"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Session
              </Button>
            </div>

            {daySessions.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <CalendarIcon className="h-10 w-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="text-sm font-medium">No sessions scheduled for this day</p>
                <p className="text-xs text-muted-foreground font-light mt-1">
                  Enjoy studio preparation time or click below to schedule an appointment.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenNewAppointment(currentDate)}
                  className="mt-4"
                >
                  Schedule Appointment
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {daySessions.map((session) => {
                  const start = new Date(session.scheduledStart).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const end = new Date(session.scheduledEnd).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const durationHours = (session.durationMinutes / 60).toFixed(
                    session.durationMinutes % 60 === 0 ? 0 : 1
                  );

                  return (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 bg-card hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-serif font-medium text-foreground">
                            {session.client.name}
                          </span>
                          {getStatusBadge(session.status)}
                          {getConsentBadge(session.consentStatus)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-foreground font-medium">
                            <Clock className="h-3.5 w-3.5 text-zinc-500" />
                            {start} to {end} ({durationHours} hrs)
                          </span>
                          <span>Service: {session.booking.serviceType}</span>
                          {session.booking.placement && (
                            <span>Placement: {session.booking.placement}</span>
                          )}
                        </div>

                        {session.booking.designDescription && (
                          <p className="text-xs text-zinc-500 font-light line-clamp-2">
                            {session.booking.designDescription}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleTriggerWhatsApp(session, e)}
                          className="text-xs gap-1.5 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-[#25D366]" />
                          <span>WhatsApp</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Day Side Info Panel */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-5 space-y-5">
            <h4 className="text-sm uppercase tracking-wider font-semibold text-foreground">
              Studio Readiness
            </h4>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border bg-background">
                <span className="text-[11px] text-muted-foreground">Total Booked Time</span>
                <p className="text-2xl font-serif font-light text-foreground mt-0.5">
                  {(
                    daySessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60
                  ).toFixed(1)}{" "}
                  hours
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-background">
                <span className="text-[11px] text-muted-foreground">Consent Compliance</span>
                <p className="text-xs text-muted-foreground mt-1 font-light leading-relaxed">
                  Before beginning any tattoo procedure, ensure the client has digitally signed the health disclosure and marketing consent form.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-background space-y-2">
                <span className="text-[11px] font-medium text-foreground">Quick Hourly Slots</span>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {TIME_SLOTS.slice(2, 8).map((time) => (
                    <button
                      key={time}
                      onClick={() => handleOpenNewAppointment(currentDate, time)}
                      className="text-xs p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-[#C4FF61]/20 hover:border-[#C4FF61]/50 text-left transition-colors font-mono"
                    >
                      + {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== AGENDA / LIST VIEW ==================== */
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-background shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-serif font-light text-foreground">
                Chronological Agenda
              </h3>
              <p className="text-xs text-muted-foreground font-light">
                All upcoming booked appointments and client sessions
              </p>
            </div>
            <span className="text-xs font-mono rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1">
              {agendaSessions.length} Sessions
            </span>
          </div>

          {agendaSessions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <CalendarIcon className="h-10 w-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm font-medium">No scheduled appointments found</p>
              <Button
                size="sm"
                onClick={() => handleOpenNewAppointment()}
                className="mt-4 bg-[#C4FF61] text-[#1A1A1A] hover:bg-[#b2f04b]"
              >
                Schedule First Appointment
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {agendaSessions.map((session) => {
                const start = new Date(session.scheduledStart);
                const end = new Date(session.scheduledEnd);
                const dateStr = start.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const timeStr = `${start.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })} to ${end.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}`;

                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Box */}
                      <div className="h-14 w-14 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 flex-shrink-0">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          {start.toLocaleDateString("en-IN", { month: "short" })}
                        </span>
                        <span className="text-lg font-serif font-bold text-foreground leading-none">
                          {start.getDate()}
                        </span>
                      </div>

                      {/* Client & Booking Info */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-serif font-medium text-foreground">
                            {session.client.name}
                          </span>
                          {getStatusBadge(session.status)}
                          {getConsentBadge(session.consentStatus)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="text-foreground font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeStr}
                          </span>
                          <span>Phone: {session.client.phone}</span>
                          <span>Service: {session.booking.serviceType}</span>
                          {session.booking.placement && (
                            <span>Placement: {session.booking.placement}</span>
                          )}
                        </div>

                        {session.booking.designDescription && (
                          <p className="text-xs text-zinc-500 font-light line-clamp-1">
                            {session.booking.designDescription}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick WhatsApp Action */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleTriggerWhatsApp(session, e)}
                        className="text-xs gap-1.5 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-[#25D366]" />
                        <span>Confirm on WhatsApp</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== NEW APPOINTMENT MODAL ==================== */}
      <AppointmentModal
        open={modalOpen}
        onOpenChange={(open) => !isSubmitting && setModalOpen(open)}
        isSubmitting={isSubmitting}
        clients={clients}
        detectedConflict={detectedConflict}
        allowOverlap={allowOverlap}
        setAllowOverlap={setAllowOverlap}
        isNewClient={isNewClient}
        setIsNewClient={setIsNewClient}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        newClientName={newClientName}
        setNewClientName={setNewClientName}
        newClientEmail={newClientEmail}
        setNewClientEmail={setNewClientEmail}
        newClientPhone={newClientPhone}
        setNewClientPhone={setNewClientPhone}
        newClientInstagram={newClientInstagram}
        setNewClientInstagram={setNewClientInstagram}
        appointmentDate={appointmentDate}
        setAppointmentDate={setAppointmentDate}
        appointmentTime={appointmentTime}
        setAppointmentTime={setAppointmentTime}
        appointmentDuration={appointmentDuration}
        setAppointmentDuration={setAppointmentDuration}
        serviceType={serviceType}
        setServiceType={setServiceType}
        placement={placement}
        setPlacement={setPlacement}
        designDescription={designDescription}
        setDesignDescription={setDesignDescription}
        notes={notes}
        setNotes={setNotes}
        onSubmit={handleCreateAppointment}
      />

      {/* ==================== SESSION DETAILS MODAL ==================== */}
      <SessionDetailsModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onUpdateStatus={handleUpdateStatus}
        onTriggerWhatsApp={handleTriggerWhatsApp}
      />

      {/* ==================== WHATSAPP CONFIRMATION MODAL ==================== */}
      <WhatsAppConfirmationModal
        open={whatsappModalOpen}
        onOpenChange={setWhatsappModalOpen}
        data={whatsappData}
      />
    </div>
  );
}
