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
      <div className="min-h-screen bg-[#1A1A1A] py-12 px-4 flex items-center justify-center font-montserrat selection:bg-[#C4FF61] selection:text-[#1A1A1A]">
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
    );
  }

  // ================= Intake Form Screen =================
  return (
    <div className="min-h-screen bg-[#1A1A1A] py-10 px-4 sm:px-6 flex flex-col items-center justify-start font-montserrat selection:bg-[#C4FF61] selection:text-[#1A1A1A]">
      {/* Studio Standards & Artistry Bento Showcase */}
      <div className="w-full max-w-6xl mb-12 animate-in fade-in duration-500">
        <StudioStandardsBento onBookClick={scrollToForm} />
      </div>

      {/* Booking Intake Card */}
      <div
        ref={formSectionRef}
        id="enquiry-form-card"
        className="w-full max-w-2xl bg-[#FDFFE9] rounded-3xl p-6 sm:p-12 shadow-2xl border border-[#1A1A1A]/10 text-[#1A1A1A] scroll-mt-8"
      >
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
          <h1 className="font-cormorant text-3xl sm:text-4xl font-medium tracking-tight mt-4 text-[#1A1A1A]">
            Book a Studio Session
          </h1>
          <p className="font-montserrat text-xs sm:text-sm text-[#1A1A1A]/70 text-center mt-1">
            Share your concept, placement, and timeline to receive a personalized proposal.
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
  );
}
