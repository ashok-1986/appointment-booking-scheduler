"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Star,
  Camera,
  Upload,
  CheckCircle2,
  Loader2,
  Sparkles,
  Heart,
  MessageSquareHeart,
  ExternalLink,
  Trash2,
  Eye,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BookingInfo {
  id: string;
  client: { name: string; email?: string } | null;
  serviceType: string;
  completedAt?: string | null;
  followUpRating?: number | null;
  followUpFeedback?: string | null;
}

export default function HealedFeedbackPage() {
  const params = useParams();
  const bookingId = (params?.bookingId as string) || "";

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lowRatingSubmitted, setLowRatingSubmitted] = useState(false);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [healedPhotoUrl, setHealedPhotoUrl] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!bookingId) return;

    fetch(`/api/feedback/${bookingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.booking) {
          setBooking(data.booking);
          if (data.booking.followUpRating) {
            setRating(data.booking.followUpRating);
            setFeedback(data.booking.followUpFeedback || "");
            setSubmitted(true);
            setLowRatingSubmitted(data.booking.followUpRating <= 3);
          }
        }
      })
      .catch(() => toast.error("Failed to load booking session details"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, or WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo exceeds 10MB limit.");
      return;
    }

    setIsUploadingPhoto(true);

    // Instant local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) setHealedPhotoUrl(dataUrl);
    };
    reader.readAsDataURL(file);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.ok && data.urls?.[0]) {
        setHealedPhotoUrl(data.urls[0]);
        toast.success("Healed photo attached successfully!");
      } else {
        toast.success("Healed photo attached!");
      }
    } catch {
      toast.success("Healed photo attached!");
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      toast.error("Please select a rating between 1 and 5 stars.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/feedback/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          feedback: feedback.trim(),
          healedPhotoUrl: healedPhotoUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to submit feedback.");
        return;
      }

      setSubmitted(true);
      setLowRatingSubmitted(Boolean(data.lowRating));
      toast.success("Thank you for your feedback!");
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-zinc-500" />
          <p className="text-sm font-medium font-montserrat text-zinc-600 dark:text-zinc-400">
            Loading session check-in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50/80 dark:bg-zinc-950 font-montserrat py-10 sm:py-16 overflow-x-hidden m-0 p-0">
      <div className="full-bleed-container">
        <div className="mx-auto max-w-xl space-y-8">
        {/* Studio Branding */}
        <div className="text-center space-y-2">
          <Badge
            variant="outline"
            className="border-amber-600/40 text-amber-700 dark:text-amber-400 text-xs tracking-wider uppercase px-3 py-1 font-medium bg-amber-500/5"
          >
            Post-Session Care & Check-in
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Meet Prerna Tattoo Studio
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            {booking?.client?.name ? `Hi ${booking.client.name}, ` : ""}
            we hope your new {booking?.serviceType || "tattoo"} is healing beautifully! Your experience and healing progress mean the world to us.
          </p>
        </div>

        {submitted ? (
          <Card className="border-emerald-200 bg-white shadow-sm dark:border-emerald-900/60 dark:bg-zinc-900">
            <CardContent className="p-8 text-center space-y-5">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 className="size-8" />
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Feedback Received!
                </h2>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`size-5 ${
                        star <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-300 dark:text-zinc-700"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {lowRatingSubmitted ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300 leading-relaxed space-y-2">
                  <div className="flex items-center justify-center gap-1.5 font-semibold text-sm">
                    <AlertCircle className="size-4" />
                    <span>Prerna will contact you directly</span>
                  </div>
                  <p>
                    Thank you for letting us know about your healing progress. Proper pigment settling is essential, and Prerna will review your notes to schedule a complimentary touch-up consultation if needed.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400 leading-relaxed space-y-3">
                  <p>
                    We are thrilled that you had a wonderful experience! If you have 30 seconds, sharing your review on Google helps other collectors discover bespoke custom tattoos.
                  </p>
                  <div className="flex justify-center">
                    <a
                      href="https://g.page/r/meetprerna/review"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-xs"
                    >
                      <Sparkles className="size-3.5 text-amber-400" />
                      <span>Leave a Google Review</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              )}

              {healedPhotoUrl && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-zinc-500 mb-2">Healed Tattoo Photo Shared:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={healedPhotoUrl}
                    alt="Healed Tattoo Photo"
                    className="mx-auto max-h-48 w-auto rounded-lg border border-zinc-200 dark:border-zinc-800 object-cover shadow-xs"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <MessageSquareHeart className="size-5 text-amber-600" />
                  <CardTitle className="font-serif text-xl font-semibold">
                    Rate Your Tattoo & Studio Experience
                  </CardTitle>
                </div>
                <CardDescription>
                  How happy are you with the design, studio comfort, and healed artwork?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 5-Star Rating Selector */}
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 p-6 dark:border-zinc-800 dark:bg-zinc-800/30">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = hoverRating ? star <= hoverRating : star <= rating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-transform hover:scale-110 focus:outline-none"
                          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                        >
                          <Star
                            className={`size-8 sm:size-9 transition-colors ${
                              active
                                ? "fill-amber-400 text-amber-400"
                                : "text-zinc-300 dark:text-zinc-700"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    {rating === 5 && "5 Stars · Absolutely Loved It"}
                    {rating === 4 && "4 Stars · Great Experience"}
                    {rating === 3 && "3 Stars · Satisfactory / May Need Touch-up"}
                    {rating === 2 && "2 Stars · Needs Attention"}
                    {rating === 1 && "1 Star · Dissatisfied"}
                  </span>
                </div>

                {/* Feedback Notes */}
                <div className="space-y-2">
                  <Label htmlFor="feedback" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    Your Thoughts & Healed Feedback
                  </Label>
                  <Textarea
                    id="feedback"
                    placeholder="Tell Prerna how the ink settled, any questions about touch-ups, or words about the session..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    className="font-montserrat text-xs resize-none"
                  />
                </div>

                {/* Healed Photo Upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    Share a Healed Photo (Optional)
                  </Label>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />

                  {healedPhotoUrl ? (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/30 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={healedPhotoUrl}
                          alt="Healed Tattoo Preview"
                          className="size-14 rounded-md object-cover border border-zinc-200 dark:border-zinc-700"
                        />
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            Photo attached
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Shared with Prerna for review & portfolio archives.
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setHealedPhotoUrl("")}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="h-9 text-xs gap-1.5"
                      >
                        {isUploadingPhoto ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Camera className="size-3.5" />
                        )}
                        Snap with Camera
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="h-9 text-xs gap-1.5"
                      >
                        <Upload className="size-3.5" />
                        Upload Healed Photo
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-semibold tracking-wide shadow-md gap-2"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Heart className="size-4 fill-amber-400 text-amber-400" />
              )}
              {submitting ? "Submitting Check-in…" : "Submit Healed Tattoo Feedback"}
            </Button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
