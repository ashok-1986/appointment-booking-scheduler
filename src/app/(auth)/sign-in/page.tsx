"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { Loader2, KeyRound } from "lucide-react";

import { authClient } from "@/lib/auth-client";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "prerna@meetprerna.com", password: "" },
  });

  const isDev = process.env.NODE_ENV === "development";

  function autofillPrerna() {
    form.setValue("email", "prerna@meetprerna.com");
    toast.info("Prerna's artist email populated");
  }

  async function onSubmit(values: SignInValues) {
    setIsPending(true);
    try {
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        fetchOptions: {
          onSuccess: () => {
            toast.success("Welcome back, Prerna!");
            router.push("/dashboard/bookings");
            router.refresh();
          },
        },
      });
      if (error) {
        toast.error(error.message || "Sign in failed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Sign in failed");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A1A1A] px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="border border-[#1A1A1A]/10 bg-[#FDFFE9] text-[#1A1A1A] shadow-2xl rounded-3xl">
          <CardHeader className="text-center pt-8 pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative w-48 h-16">
                <Image
                  src="/meetprerna_logo.png"
                  alt="Meet Prerna"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>
            <CardTitle className="font-cormorant text-3xl font-medium">Artist Studio Portal</CardTitle>
            <CardDescription className="text-zinc-600 font-sans text-sm">
              Sign in to manage appointments, consultations & bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-zinc-700">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="prerna@meetprerna.com"
                          autoComplete="email"
                          className="bg-white/80 border-zinc-300 rounded-xl focus:border-[#1A1A1A]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider font-semibold text-zinc-700">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="bg-white/80 border-zinc-300 rounded-xl focus:border-[#1A1A1A]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 rounded-full bg-[#C4FF61] hover:bg-[#EAFF27] text-[#1A1A1A] font-semibold text-base shadow-md transition-all"
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {isPending ? "Signing in…" : "Sign In to Dashboard"}
                </Button>
              </form>
            </Form>

            {/* Studio Artist Note / Dev Helper */}
            {isDev ? (
              <div className="mt-5 pt-4 border-t border-zinc-200/80 text-center">
                <button
                  type="button"
                  onClick={autofillPrerna}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white/70 hover:bg-white px-3 py-1.5 rounded-full border border-zinc-200 transition-all shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#1A1A1A]" />
                  <span>Autofill Prerna&apos;s email (Dev)</span>
                </button>
              </div>
            ) : (
              <div className="mt-5 pt-4 border-t border-zinc-200/80 text-center">
                <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sign in with your studio email (<span className="font-medium text-zinc-700">prerna@meetprerna.com</span>)</span>
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center text-sm pb-6">
            <p className="text-zinc-500">
              Need an account?{" "}
              <Link href="/sign-up" className="font-semibold text-zinc-900 hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}