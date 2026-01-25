"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, BookOpen, GraduationCap, Phone } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Courses", href: "/courses" },
    { name: "Blogs", href: "/blogs/best-online-science-tuition-uae-gulf" },
    { name: "Contact", href: "/contact" },
];

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container px-4 md:px-6 flex h-16 items-center justify-between mx-auto">
                <Link href="/" className="flex items-center gap-2">
                    <Image src="/brightline-logo.png" alt="Brightline Academy" width={80} height={80} className="w-auto h-16 object-contain" />
                    <span className="text-xl font-bold tracking-tight text-primary">Brightline Academy</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex gap-6 items-center">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                <div className="hidden md:flex items-center gap-4">
                    <Button asChild variant="ghost" className="text-primary hover:text-primary/80 font-medium">
                        <Link href="https://brightline-academy-7xz1.vercel.app/">Login</Link>
                    </Button>
                    <Button asChild variant="default" className="bg-primary text-secondary hover:bg-primary/90 font-semibold shadow-md">
                        <Link href="/book-demo">Book Free Demo</Link>
                    </Button>
                </div>

                {/* Mobile Nav */}
                <div className="md:hidden">
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-primary">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="bg-background">
                            <div className="flex flex-col gap-6 mt-6">
                                <Link href="/" className="flex items-center gap-2 mb-4" onClick={() => setIsOpen(false)}>
                                    <span className="text-lg font-bold text-primary">Brightline Academy</span>
                                </Link>
                                <nav className="flex flex-col gap-4">
                                    {navLinks.map((link) => (
                                        <Link
                                            key={link.name}
                                            href={link.href}
                                            className="text-base font-medium text-foreground hover:text-primary transition-colors"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            {link.name}
                                        </Link>
                                    ))}
                                    <Button asChild variant="outline" className="mt-4 w-full border-primary text-primary hover:bg-primary/10">
                                        <Link href="https://brightline-academy-7xz1.vercel.app/" onClick={() => setIsOpen(false)}>Login</Link>
                                    </Button>
                                    <Button asChild className="w-full bg-secondary text-primary hover:bg-secondary/80">
                                        <Link href="/book-demo" onClick={() => setIsOpen(false)}>Book Free Demo</Link>
                                    </Button>
                                </nav>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
