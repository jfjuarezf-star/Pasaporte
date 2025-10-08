
"use client";

import Link from "next/link";
import { LogOut, ShieldCheck, KeyRound, UserSquare, Loader2, BookUser } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

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
import type { User } from "@/lib/types";
import { logout } from "@/app/actions";

export function Header({ user, isTrainer }: { user: User, isTrainer?: boolean }) {
  const [loadingLink, setLoadingLink] = useState<string | null>(null);
  const pathname = usePathname();

  // Reset loading state when navigation completes
  useEffect(() => {
    setLoadingLink(null);
  }, [pathname]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  const handleLinkClick = (href: string) => {
    // Only set loading state if we are actually navigating
    if (pathname !== href) {
        setLoadingLink(href);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 glassmorphism backdrop-blur-lg px-4 md:px-6">
       <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={() => handleLinkClick('/dashboard')}>
        <img src="https://res.cloudinary.com/dtd6lzcg5/image/upload/v1748351583/TPM_LOGO_ey8qh5.png" alt="Onboarding Passport Logo" className="h-8" />
        <span className="hidden sm:inline-block">Pasaporte de Capacitación</span>
      </Link>
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 flex-1">
        {/* You can add more nav links here if needed */}
      </nav>
      <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <DropdownMenu onOpenChange={() => setLoadingLink(null)}>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <Avatar>
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glassmorphism backdrop-blur-lg">
            <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
             {user.role === 'admin' && (
                <>
                    <DropdownMenuItem asChild>
                        <Link href="/admin" onClick={() => handleLinkClick('/admin')} className="flex items-center w-full">
                            {loadingLink === '/admin' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            <span>Panel de Admin</span>
                        </Link>
                    </DropdownMenuItem>
                     <DropdownMenuItem asChild>
                        <Link href="/dashboard" onClick={() => handleLinkClick('/dashboard')} className="flex items-center w-full">
                           {loadingLink === '/dashboard' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserSquare className="mr-2 h-4 w-4" />}
                            <span>Mi Pasaporte</span>
                        </Link>
                    </DropdownMenuItem>
                </>
             )}
             {isTrainer && (
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/trainer" onClick={() => handleLinkClick('/dashboard/trainer')} className="flex items-center w-full">
                        {loadingLink === '/dashboard/trainer' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookUser className="mr-2 h-4 w-4" />}
                        <span>Panel de Capacitador</span>
                    </Link>
                </DropdownMenuItem>
             )}
            <DropdownMenuItem asChild>
              <Link href="/dashboard/change-password" onClick={() => handleLinkClick('/dashboard/change-password')} className="flex items-center w-full">
                {loadingLink === '/dashboard/change-password' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                <span>Cambiar Contraseña</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <form action={logout} className="w-full">
                    <button type="submit" className="w-full text-left flex items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Cerrar Sesión</span>
                    </button>
                </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
