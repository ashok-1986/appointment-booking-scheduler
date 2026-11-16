"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Star, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const feedbackSchema = z.object({
  rating: z.number().min(1, "Please select a rating").max(5),
  feedback: z.string().optional(),
  healedPhotoUrl: z.string().optional(),
});

type FeedbackValues = z.infer<typeof feedbackSchema>;

export default function FeedbackPage() {
  const { bookingId } = useParams() as { bookingId: string };
  const [booking, setBooking] = useState<{
    client: { name: string };
    serviceType: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { rating: 0, feedback: "", healedPhotoUrl: "" },
  });

  useEffect(() => {
    fetch(`/api/feedback/${bookingId}`)
      .then((r) => r.json())
      .then((data) => setBooking(data.booking))
      .catch(() => toast.error("Failed to load"));
  }, [bookingId]);

  async function onSubmit(values: FeedbackValues) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/feedback/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to submit");
        return;
      }
      setDone(true);
      toast.success("Thanks for your feedback!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Thank you!</CardTitle>
            <CardDescription>
              Your feedback helps us improve.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            How was your session?
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {booking ? `${booking.client.name} – ${booking.serviceType}` : "Loading…"}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Rate your experience</CardTitle>
            <CardDescription>
              Tap a star to rate, then share any comments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating</FormLabel>
                      <FormControl>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => field.onChange(n)}
                              className="p-1"
                              aria-label={`Rate ${n} out of 5`}
                            >
                              <Star
                                className={`size-8 ${
                                  n <= (field.value ?? 0)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="feedback"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comments (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us more about your experience…"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="healedPhotoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Camera className="size-4 text-muted-foreground" />
                        Healed Tattoo Photo (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Paste link to your healed tattoo photo (e.g. Imgur, Drive, Instagram)"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Share a photo of your healed piece for the artist to inspect.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {submitting ? "Submitting…" : "Submit Feedback"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
