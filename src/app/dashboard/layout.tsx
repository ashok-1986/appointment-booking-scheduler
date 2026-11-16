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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/bookings" className="flex items-center gap-3">
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

            <nav className="flex items-center gap-4 text-sm font-medium">
              <Link
                href="/dashboard/bookings"
                className="text-foreground transition-colors hover:text-foreground/80 font-semibold"
              >
                Bookings
              </Link>
              <Link
                href="/enquiry"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground text-xs"
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
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}