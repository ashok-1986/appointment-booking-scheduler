"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const consentSchema = z.object({
  healthDisclosure: z.boolean().refine((v) => v === true, {
    message: "You must confirm your health disclosures",
  }),
  designApproval: z.boolean().refine((v) => v === true, {
    message: "You must approve the design",
  }),
  photoPermission: z.boolean().refine((v) => v === true, {
    message: "You must grant photo permission",
  }),
  fullName: z.string().min(2, "Full name is required"),
  signature: z.string().min(2, "Signature is required"),
});

type ConsentValues = z.infer<typeof consentSchema>;

export default function ConsentPage() {
  const { bookingId } = useParams() as { bookingId: string };
  const [booking, setBooking] = useState<{
    client: { name: string };
    serviceType: string;
    consentSignedAt: string | null;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);

  const form = useForm<ConsentValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      healthDisclosure: false,
      designApproval: false,
      photoPermission: false,
      fullName: "",
      signature: "",
    },
  });

  useEffect(() => {
    fetch(`/api/consent/${bookingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.booking) {
          setBooking(data.booking);
          if (data.booking.consentSignedAt) setAlreadySigned(true);
        }
      })
      .catch(() => toast.error("Failed to load consent form"));
  }, [bookingId]);

  async function onSubmit(values: ConsentValues) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/consent/${bookingId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to sign");
        return;
      }
      setAlreadySigned(true);
      toast.success("Consent form signed!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to sign");
    } finally {
      setSubmitting(false);
    }
  }

  if (alreadySigned) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Consent Signed</CardTitle>
            <CardDescription>
              Thank you. Your consent form has been recorded.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Consent Form
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Please review and sign before your session.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Consent & Agreement</CardTitle>
            <CardDescription>
              {booking ? `${booking.client.name} – ${booking.serviceType}` : "Loading…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="healthDisclosure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I confirm I have disclosed all relevant health conditions
                          and understand the risks involved.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="designApproval"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I approve the design and understand the final result may
                          vary.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="photoPermission"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I grant permission for the studio to use photos of the
                          work for portfolio and marketing purposes.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signature (type your full name)</FormLabel>
                      <FormControl>
                        <Input placeholder="Type your full name to sign" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <PenLine className="mr-2 size-4" />
                  )}
                  {submitting ? "Signing…" : "Sign Consent Form"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
