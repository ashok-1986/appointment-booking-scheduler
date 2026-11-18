"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  Users,
  Search,
  MessageCircle,
  Phone,
  Mail,
  Instagram,
  MapPin,
  Calendar,
  CreditCard,
  ArrowRight,
  Sparkles,
  Repeat,
  DollarSign,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildPersonalizedWhatsAppUrl } from "@/lib/services/whatsapp-composer";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagramHandle: string | null;
  dateOfBirth: string | null;
  city: string | null;
  notes: string | null;
  bookingsCount: number;
  totalSpend: string;
  formattedTotalSpend: string;
  totalSpendNumber: number;
  latestBookingStage?: string;
  latestBookingDate?: string | null;
  isRepeat: boolean;
  createdAt: string;
};

type Props = {
  initialCustomers: Customer[];
  initialStats: {
    totalCustomers: number;
    repeatCustomers: number;
    totalLifetimeRevenue: number;
  };
};

export default function CustomersClient({
  initialCustomers,
  initialStats,
}: Props) {
  const [search, setSearch] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return initialCustomers;
    const term = search.toLowerCase();
    return initialCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        (c.instagramHandle && c.instagramHandle.toLowerCase().includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term))
    );
  }, [initialCustomers, search]);

  return (
    <div className="space-y-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full bg-[#C4FF61] text-[#1A1A1A]">
              Client Profiles (CD-01)
            </span>
          </div>
          <h1 className="font-heading font-cormorant text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-2">
            Studio Client Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-body">
            Centralized customer registry with complete appointment histories, signed consents &amp; lifetime records.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="size-11 rounded-full bg-[#C4FF61]/20 flex items-center justify-center text-[#1A1A1A] shrink-0">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Clients
              </p>
              <p className="font-mono text-2xl font-bold text-foreground">
                {initialStats.totalCustomers}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="size-11 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
              <Repeat className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Repeat Collectors
              </p>
              <p className="font-mono text-2xl font-bold text-foreground">
                {initialStats.repeatCustomers}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="size-11 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <CreditCard className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lifetime Studio Inflow
              </p>
              <p className="font-mono text-2xl font-bold text-foreground">
                ₹{initialStats.totalLifetimeRevenue.toLocaleString("en-IN")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search clients by name, phone, email, city, or @instagram..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-card border-border rounded-xl text-sm"
        />
      </div>

      {/* Customer Registry List */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <p className="text-muted-foreground text-sm">
              No clients found matching your search term.
            </p>
          </Card>
        ) : (
          filteredCustomers.map((c) => {
            const waUrl = buildPersonalizedWhatsAppUrl({
              phone: c.phone,
              name: c.name,
              stage: c.latestBookingStage || null,
              isRepeat: c.isRepeat,
            });

            return (
              <Card
                key={c.id}
                className="overflow-hidden border border-border/80 bg-card hover:border-[#C4FF61] transition-all hover:shadow-sm"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Client Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-heading font-cormorant text-2xl font-semibold text-foreground">
                        {c.name}
                      </h3>
                      {c.isRepeat ? (
                        <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 text-[10px] font-semibold">
                          Repeat Client ({c.bookingsCount} projects)
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 text-[10px] font-semibold">
                          First Time Client
                        </Badge>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground/90">
                        <Phone className="size-3 text-muted-foreground" />
                        {c.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="size-3 text-muted-foreground" />
                        {c.email}
                      </span>
                      {c.instagramHandle && (
                        <a
                          href={`https://instagram.com/${c.instagramHandle.replace(
                            "@",
                            ""
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-pink-600 hover:underline"
                        >
                          <Instagram className="size-3" />
                          @{c.instagramHandle.replace("@", "")}
                        </a>
                      )}
                      {c.city && (
                        <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                          <MapPin className="size-3 text-rose-500" />
                          {c.city}
                        </span>
                      )}
                    </div>

                    {/* Timestamps (CD-06) */}
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-1">
                      <Clock className="size-3 text-zinc-400" />
                      <span>
                        First enquired:{" "}
                        {format(new Date(c.createdAt), "d MMM yyyy, h:mm a")} IST
                      </span>
                      <span>·</span>
                      <span>
                        ({formatDistanceToNow(new Date(c.createdAt), {
                          addSuffix: true,
                        })})
                      </span>
                    </div>
                  </div>

                  {/* Financial & Booking Stats */}
                  <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-border/80 pt-3 md:pt-0 md:pl-6 shrink-0 justify-between md:justify-end">
                    <div className="text-left md:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Lifetime Spend
                      </p>
                      <p className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {c.formattedTotalSpend}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Bookings
                      </p>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {c.bookingsCount}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {Boolean(waUrl) && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors"
                          title="Open WhatsApp chat"
                        >
                          <MessageCircle className="size-4" />
                        </a>
                      )}
                      <Button
                        asChild
                        className="h-9 rounded-lg bg-[#1A1A1A] text-[#C4FF61] hover:bg-zinc-800 dark:bg-[#C4FF61] dark:text-[#1A1A1A] text-xs font-semibold"
                      >
                        <Link href={`/dashboard/customers/${c.id}`}>
                          <span>View Dossier</span>
                          <ArrowRight className="size-3.5 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
