import { requireUser } from "@/lib/auth-utils";
import { AccountMenu } from "@/components/account-menu";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50/50 dark:bg-zinc-950">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="relative h-9 w-28 sm:w-36">
                <Image
                  src="/meetprerna_logo.png"
                  alt="Meet Prerna"
                  fill
                  priority
                  className="object-contain object-left"
                />
              </div>
              <span className="hidden text-xs uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full bg-[#C4FF61] text-[#1A1A1A] sm:inline-block">
                Artist Studio
              </span>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-4 text-sm font-medium">
              <Link
                href="/dashboard"
                className="text-foreground transition-colors hover:text-foreground/80 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Overview
              </Link>
              <Link
                href="/dashboard/bookings"
                className="text-muted-foreground transition-colors hover:text-foreground px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Bookings
              </Link>
              <Link
                href="/dashboard/customers"
                className="text-muted-foreground transition-colors hover:text-foreground px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Customers
              </Link>
              <Link
                href="/dashboard/calendar"
                className="text-muted-foreground transition-colors hover:text-foreground px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Calendar
              </Link>
              <Link
                href="/dashboard/gallery"
                className="text-muted-foreground transition-colors hover:text-foreground px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Gallery
              </Link>
              <Link
                href="/enquiry"
                target="_blank"
                className="hidden md:inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground text-xs ml-2 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/50"
              >
                <span>Live Enquiry Form</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <AccountMenu user={{ name: user.name, email: user.email, image: user.image }} />
          </div>
        </div>
      </header>
      <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        {children}
      </main>
    </div>
  );
}