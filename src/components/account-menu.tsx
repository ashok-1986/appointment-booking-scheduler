"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type AccountMenuUser = {
  name: string | null;
  email: string | null;
  image?: string | null;
};

export function AccountMenu({ user }: { user: AccountMenuUser }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out");
            router.push("/sign-in");
            router.refresh();
          },
        },
      });
    } catch (err: any) {
      toast.error(err?.message || "Sign out failed");
    } finally {
      setIsPending(false);
    }
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2">
          <Avatar className="size-7">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm sm:inline">
            {user.name}
          </span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="mr-2 size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} disabled={isPending}>
          <LogOut className="mr-2 size-4" />
          {isPending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}