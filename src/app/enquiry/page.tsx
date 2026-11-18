"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  UploadCloud,
  X,
  Instagram,
  Globe,
  Share2,
  CheckCircle2,
  Calendar as CalendarIcon,
  MessageCircle,
  ShieldCheck,
  Flower2,
  Sparkles,
  MapPin,
  ArrowDown,
} from "lucide-react";
import Image from "next/image";
import confetti from "canvas-confetti";

import { Button } from "@/components/ui/button";
import StudioStandardsBento from "@/components/ui/studio-standards-bento";
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

// Zod validation schema matching the Fillout intake form
const enquiryFormSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(7, "Valid phone number is required"),
  city: z.string().min(2, "City is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional(),
  tattooTimeline: z.string().min(1, "Please select your desired timeline"),
  instagramHandle: z.string().min(1, "Instagram ID is required"),
  message: z.string().optional(),
});

type EnquiryFormValues = z.infer<typeof enquiryFormSchema>;

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Prefer not to say", label: "Prefer not to say" },
  { value: "Other", label: "Other" },
];

const TIMELINE_OPTIONS = [
  { value: "Just Browsing/Flexible", label: "Just Browsing/Flexible" },
  { value: "ASAP / This Week", label: "ASAP / This Week" },
  { value: "Within 1–2 Months", label: "Within 1–2 Months" },
  { value: "3+ Months Out", label: "3+ Months Out" },
];

export default function EnquiryPage() {
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formSectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const form = useForm<EnquiryFormValues>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      city: "",
      dateOfBirth: "",
      gender: "",
      tattooTimeline: "Just Browsing/Flexible",
      instagramHandle: "",
      message: "",
    },
  });

  // Trigger celebratory confetti on thank-you screen
  useEffect(() => {
    if (submitted) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#C4FF61", "#EAFF27", "#1A1A1A", "#FDFFE9"],
        });
      } catch (e) {
        // Fallback silently if canvas is unavailable
      }
    }
  }, [submitted]);

  // Handle file uploads
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("file", files[i]);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.urls)) {
        setReferenceImages((prev) => [...prev, ...data.urls]);
        toast.success("Reference images uploaded!");
      } else {
        toast.error(data.error || "Failed to upload file");
      }
    } catch (err: any) {
      toast.error(err?.message || "File upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    setReferenceImages((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function onSubmit(values: EnquiryFormValues) {
    setIsPending(true);
    try {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        city: values.city,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender || undefined,
        tattooTimeline: values.tattooTimeline,
        instagramHandle: values.instagramHandle.startsWith("@")
          ? values.instagramHandle
          : `@${values.instagramHandle}`,
        message: values.message || undefined,
        serviceType: "Tattoo",
        referenceImages: referenceImages,
      };

      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Submission failed. Please try again.");
        return;
      }

      setSubmitted(true);
      toast.success("Appointment enquiry received!");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong while submitting.");
    } finally {
      setIsPending(false);
    }
  }

  // ================= Thank You Screen =================
  if (submitted) {
    return (
      <div className="min-h-screen w-full bg-[#12131a] py-16 flex items-center justify-center font-montserrat selection:bg-[#C4FF61] selection:text-[#1A1A1A] overflow-x-hidden m-0 p-0">
        <div className="full-bleed-container flex justify-center">
          <div className="w-full max-w-xl bg-[#FDFFE9] rounded-3xl p-8 sm:p-12 shadow-2xl border border-[#C4FF61]/30 text-[#1A1A1A] text-center animate-in fade-in zoom-in-95 duration-500">
            {/* Brand Logo */}
            <div className="flex justify-center mb-6">
              <div className="relative w-48 h-16 sm:w-56 sm:h-20">
                <Image
                  src="/meetprerna_logo.png"
                  alt="Meet Prerna"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C4FF61] text-[#1A1A1A] mb-4 shadow-md">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            {/* Cormorant Garamond for Header */}
            <h1 className="font-cormorant text-4xl sm:text-5xl font-medium tracking-tight mb-3">
              Thank you
            </h1>
            <p className="text-base sm:text-lg text-[#1A1A1A]/80 font-montserrat font-normal max-w-md mx-auto mb-8 leading-relaxed">
              Your tattoo enquiry has been received. Prerna will review your design request and get back to you shortly.
            </p>

            {/* Socials & Follow Me */}
            <div className="pt-6 border-t border-[#1A1A1A]/10">
              {/* Cormorant Garamond for Header */}
              <h2 className="font-cormorant text-2xl font-medium mb-4">Follow me</h2>
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8">
                <a
                  href="https://www.instagram.com/tattoosbyprerna/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#1A1A1A]/20 bg-white/60 hover:bg-[#C4FF61] hover:border-[#1A1A1A] transition-all font-montserrat text-xs sm:text-sm font-medium"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Instagram</span>
                </a>
                <a
                  href="https://in.pinterest.com/meetprerna_/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#1A1A1A]/20 bg-white/60 hover:bg-[#C4FF61] hover:border-[#1A1A1A] transition-all font-montserrat text-xs sm:text-sm font-medium"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Pinterest</span>
                </a>
                <a
                  href="https://meetprerna.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#1A1A1A]/20 bg-white/60 hover:bg-[#C4FF61] hover:border-[#1A1A1A] transition-all font-montserrat text-xs sm:text-sm font-medium"
                >
                  <Globe className="w-4 h-4" />
                  <span>Website</span>
                </a>
              </div>

              {/* Direct WhatsApp CTA */}
              <div className="bg-[#1A1A1A] rounded-2xl p-6 text-white mb-6 shadow-xl">
                <p className="font-montserrat text-xs sm:text-sm text-[#FDFFE9]/80 mb-3 font-normal">
                  Need an immediate reply or have quick questions?
                </p>
                <a
                  href="https://wa.me/917738147935?text=Hi%20Prerna!%20I%20just%20submitted%20my%20tattoo%20enquiry."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 w-full bg-[#C4FF61] hover:bg-[#EAFF27] text-[#1A1A1A] font-montserrat font-semibold py-3 px-6 rounded-full transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>Chat with me on WhatsApp</span>
                </a>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  form.reset();
                  setReferenceImages([]);
                }}
                className="font-montserrat text-xs uppercase tracking-wider text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-transparent border-0"
              >
                Submit another response
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= Intake Form Screen =================
  return (
    <div className="min-h-screen w-full bg-[#12131a] overflow-x-hidden font-montserrat selection:bg-[#C4FF61] selection:text-[#1A1A1A] flex flex-col m-0 p-0">
      {/* 1. FULL-BLEED STICKY HEADER */}
      <header className="w-full sticky top-0 z-50 bg-[#12131a]/85 backdrop-blur-md border-b border-white/10 transition-colors">
        <div className="full-bleed-container flex items-center justify-between py-3.5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="relative w-36 h-10 sm:w-44 sm:h-12">
              <Image
                src="/meetprerna_logo.png"
                alt="Meet Prerna Tattoo Studio"
                fill
                priority
                className="object-contain"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
              <span className="size-1.5 rounded-full bg-[#C4FF61] animate-pulse" />
              <span>Indiranagar, Bangalore</span>
            </div>
            <a
              href="https://wa.me/917738147935?text=Hi%20Prerna!%20I%27d%20like%20to%20enquire%20about%20a%20tattoo%20session."
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
            <Button
              onClick={scrollToForm}
              className="rounded-full bg-[#C4FF61] hover:bg-[#EAFF27] text-[#1A1A1A] text-xs font-semibold px-4 py-2 shadow-xs transition-all hover:scale-105 active:scale-95"
            >
              Book Consultation
            </Button>
          </div>
        </div>
      </header>

      {/* 2. FULL-BLEED HERO BANNER */}
      <section className="w-full relative overflow-hidden bg-gradient-to-b from-[#12131a] via-[#171822] to-[#12131a] border-b border-white/10 py-16 sm:py-24 lg:py-28">
        <div
          className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(196,255,97,0.18),transparent_70%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-15 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:40px_40px]"
          aria-hidden="true"
        />

        <div className="full-bleed-container relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C4FF61]/30 bg-[#C4FF61]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-[#C4FF61] mb-5">
            <Sparkles className="size-3.5" />
            <span>Private Tattoo Atelier · Bangalore</span>
          </div>

          <h1 className="font-cormorant text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-white max-w-4xl leading-[1.08] mb-6">
            Fine-Line Artistry, Micro-Realism &amp; <span className="font-normal italic text-[#C4FF61]">Intentional Ink</span>
          </h1>

          <p className="text-zinc-300 font-normal text-sm sm:text-base lg:text-lg max-w-2xl leading-relaxed mb-8">
            Every custom tattoo is designed collaboratively, placed with anatomical harmony, and executed under strict hospital-grade sterilization with 100% vegan organic pigments.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto mb-12">
            <Button
              onClick={scrollToForm}
              className="w-full sm:w-auto h-12 rounded-full bg-[#C4FF61] hover:bg-[#EAFF27] text-[#1A1A1A] font-semibold text-sm px-8 shadow-lg shadow-[#C4FF61]/15 transition-all hover:scale-105 active:scale-95"
            >
              <span>Submit Booking Enquiry</span>
              <span aria-hidden="true">↓</span>
            </Button>
            <a
              href="#studio-standards"
              className="w-full sm:w-auto h-12 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium text-sm px-6 inline-flex items-center justify-center transition-colors"
            >
              Explore Studio Standards
            </a>
            <a
              href="https://wa.me/917738147935?text=Hi%20Prerna!%20I%27d%20like%20to%20ask%20a%20question%20about%20booking%20a%20tattoo%20session."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto h-12 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-medium text-sm px-6 inline-flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="size-4" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-4xl border-t border-white/10 pt-8 text-left">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <ShieldCheck className="size-5 text-[#C4FF61] shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Hospital Grade</p>
                <p className="text-[11px] text-zinc-400">100% Sterile &amp; Disposable</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <Flower2 className="size-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">100% Vegan Inks</p>
                <p className="text-[11px] text-zinc-400">Dynamic Cruelty-Free Carbon</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <Sparkles className="size-5 text-cyan-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Micro-Realism</p>
                <p className="text-[11px] text-zinc-400">Single-Needle 0401RL Precision</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <CalendarIcon className="size-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Private Atelier</p>
                <p className="text-[11px] text-zinc-400">1-on-1 Dedicated Session</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FULL-BLEED STUDIO STANDARDS BENTO SHOWCASE */}
      <section id="studio-standards" className="w-full">
        <StudioStandardsBento onBookClick={scrollToForm} />
      </section>

      {/* 4. FULL-BLEED BOOKING INTAKE SECTION */}
      <section
        ref={formSectionRef}
        id="enquiry-form-card"
        className="w-full bg-[#12131a] py-16 sm:py-24 border-t border-white/10 relative scroll-mt-12"
      >
        <div className="full-bleed-container">
          <div className="text-center max-w-xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C4FF61]/30 bg-[#C4FF61]/10 px-3 py-1 font-montserrat text-xs font-semibold uppercase tracking-widest text-[#C4FF61] mb-3">
              <CalendarIcon className="size-3.5" />
              <span>Consultation Intake</span>
            </div>
            <h2 className="font-cormorant text-3xl sm:text-5xl font-medium tracking-tight text-white mb-3">
              Book Your Studio Session
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Share your tattoo concept, ideal placement, and timeline to receive a personalized proposal and consultation slot from Prerna.
            </p>
          </div>

          <div className="w-full max-w-2xl mx-auto bg-[#FDFFE9] rounded-3xl p-6 sm:p-12 shadow-2xl border border-[#1A1A1A]/10 text-[#1A1A1A]">
            {/* Brand Logo Header */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="relative w-52 h-20 sm:w-64 sm:h-24">
                <Image
                  src="/meetprerna_logo.png"
                  alt="Meet Prerna"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
              <div className="w-12 h-0.5 bg-[#C4FF61] mt-2 rounded-full" />
              <h3 className="font-cormorant text-2xl sm:text-3xl font-medium tracking-tight mt-4 text-[#1A1A1A]">
                Intake Questionnaire
              </h3>
              <p className="font-montserrat text-xs sm:text-sm text-[#1A1A1A]/70 text-center mt-1">
                All details help Prerna calibrate session duration, needle grouping, and sizing.
              </p>
            </div>

            <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* ROW 0: Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-montserrat text-xs uppercase tracking-wider text-[#1A1A1A]/80 font-semibold">
                      Full Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your full name"
                        className="font-montserrat h-12 bg-white/90 border-[#1A1A1A]/20 rounded-xl focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-montserrat text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-montserrat text-xs uppercase tracking-wider text-[#1A1A1A]/80 font-semibold">
                      Email <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className="font-montserrat h-12 bg-white/90 border-[#1A1A1A]/20 rounded-xl focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-montserrat text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 1: Phone number & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-montserrat text-xs uppercase tracking-wider text-[#1A1A1A]/80 font-semibold">
                      Phone number <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+91 98765 43210"
                        className="font-montserrat h-12 bg-white/90 border-[#1A1A1A]/20 rounded-xl focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-montserrat text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-montserrat text-xs uppercase tracking-wider text-[#1A1A1A]/80 font-semibold">
                      City <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Mumbai, Delhi, Bengaluru"
                        className="font-montserrat h-12 bg-white/90 border-[#1A1A1A]/20 rounded-xl focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-montserrat text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-[#1A1A1A]/10 my-4" />

            {/* ROW 3: Date of birth & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-montserrat text-xs uppercase tracking-wider text-[#1A1A1A]/80 font-semibold">
                      Date of birth <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="date"
                          className="font-montserrat h-12 bg-white/90 border-[#1A1A1A]/20 rounded-xl focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] text-sm pr-10"
                          {...field}
                        />
                        <CalendarIcon className="w-5 h-5 absolute right-3 top-3.5 text-[#1A1A1A]/40 pointer-events-none" />
                      </div>
                    </FormControl>
                    <FormMessage className="font-montserrat text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-montserrat text-xs uppercase tracking-wider text-[#1A1A1A]/80 font-semibold">
                      Gender
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="font-montserrat h-12 bg-white/90 border-[#1A1A1A]/20 rounded-xl focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] text-sm">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#FDFFE9] border border-[#1A1A1A]/20 text-[#1A1A1A] font-montserrat">
                        {GENDER_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="focus:bg-[#C4FF61] focus:text-[#1A1A1A] cursor-pointer"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="font-montserrat text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 4: Desired Tattoo Timeline? & Insta ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="tattooTimeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-montserrat text-xs uppercase tracking-wider text-[#1A1A1A]/80 font-semibold">
                      Desired Tattoo Timeline? <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="font-montserrat text-sm h-12 bg-white/90 border-[#1A1A1A]/20 rounded-xl focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]">
                          <SelectValue placeholder="Select timeline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#FDFFE9] border border-[#1A1A1A]/20 text-[#1A1A1A] font-montserrat text-sm">
                        {TIMELINE_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="focus:bg-[#C4FF61] focus:text-[#1A1A1A] cursor-pointer py-2"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="font-montserrat text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instagramHandle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-montserrat text-xs uppercase tracking-wider text-[#1A1A1A]/80 font-semibold">
                      Insta ID <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="@username"
                        className="font-montserrat h-12 bg-white/90 border-[#1A1A1A]/20 rounded-xl focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-montserrat text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* ROW 5: Upload Reference Designs */}
            <div>
              <label className="block font-montserrat text-xs uppercase tracking-wider text-[#1A1A1A]/80 font-semibold mb-2">
                Upload reference designs
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                className="border-2 border-dashed border-[#1A1A1A]/20 hover:border-[#1A1A1A]/50 bg-white/50 hover:bg-white/80 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#FDFFE9] border border-[#1A1A1A]/10 flex items-center justify-center text-[#1A1A1A]/60 shadow-sm">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-[#1A1A1A]" />
                    ) : (
                      <UploadCloud className="w-6 h-6 text-[#1A1A1A]" />
                    )}
                  </div>
                  <p className="font-montserrat text-sm font-medium text-[#1A1A1A]">
                    {isUploading ? "Uploading photos..." : "Drop reference photos or click to browse"}
                  </p>
                  <p className="font-montserrat text-xs text-[#1A1A1A]/50 font-normal">
                    PNG, JPG, WEBP up to 10MB each
                  </p>
                </div>
              </div>

              {/* Uploaded Images Thumbnails */}
              {referenceImages.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {referenceImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#1A1A1A]/20 group shadow-sm bg-black/5"
                    >
                      <Image
                        src={url}
                        alt="Reference design"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#1A1A1A]/80 hover:bg-red-600 text-white flex items-center justify-center opacity-90 transition-all shadow-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[#1A1A1A]/10 my-4" />

            {/* ROW 7: Any other information? */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-montserrat text-xs uppercase tracking-wider text-[#1A1A1A]/80 font-semibold">
                    Any other information?
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Placement, size in inches, specific meaning, skin tone, or questions..."
                      rows={4}
                      className="font-montserrat bg-white/90 border-[#1A1A1A]/20 rounded-xl focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] text-sm resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="font-montserrat text-xs" />
                </FormItem>
              )}
            />

            {/* ROW 8: Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={isPending || isUploading}
                className="w-full h-14 rounded-full bg-[#C4FF61] hover:bg-[#EAFF27] text-[#1A1A1A] font-montserrat text-base font-semibold tracking-wide shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                {isPending ? (
                  <span className="flex items-center gap-2 font-montserrat text-sm">
                    <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                  </span>
                ) : (
                  "Book an Appointment"
                )}
              </Button>
            </div>
          </form>
        </Form>
          </div>
        </div>
      </section>

      {/* 5. FULL-BLEED STUDIO FOOTER */}
      <footer className="w-full bg-[#0a0a0f] border-t border-white/10 py-12 text-zinc-400 font-montserrat">
        <div className="full-bleed-container flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="relative w-36 h-10">
              <Image
                src="/meetprerna_logo.png"
                alt="Meet Prerna Tattoo Studio"
                fill
                className="object-contain"
              />
            </div>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <p className="text-xs text-zinc-400">
              Bespoke fine-line tattoos &amp; micro-realism by Prerna · Indiranagar, Bangalore
            </p>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/tattoosbyprerna/"
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-[#C4FF61] hover:text-[#1A1A1A] hover:border-[#C4FF61] transition-colors"
              title="Instagram"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href="https://in.pinterest.com/meetprerna_/"
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-[#C4FF61] hover:text-[#1A1A1A] hover:border-[#C4FF61] transition-colors"
              title="Pinterest"
            >
              <Share2 className="size-4" />
            </a>
            <a
              href="https://meetprerna.com"
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-[#C4FF61] hover:text-[#1A1A1A] hover:border-[#C4FF61] transition-colors"
              title="Official Website"
            >
              <Globe className="size-4" />
            </a>
            <a
              href="https://wa.me/917738147935?text=Hi%20Prerna!%20I%20have%20a%20question%20about%20your%20tattoo%20sessions."
              target="_blank"
              rel="noopener noreferrer"
              className="size-9 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="size-4" />
            </a>
          </div>
        </div>

        <div className="full-bleed-container mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500">
          <p>© {new Date().getFullYear()} Meet Prerna Tattoo Studio. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Hospital-grade sterilization · Vegan organic pigments · Private sessions</p>
        </div>
      </footer>
    </div>
  );
}
