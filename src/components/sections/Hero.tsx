import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function Hero() {
    return (
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-background">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2 items-center">
                    <div className="flex flex-col justify-center space-y-4">
                        <div className="inline-block rounded-lg bg-secondary/20 px-3 py-1 text-sm text-secondary-foreground w-fit mb-2">
                            🚀 Admissions Open for 2026-27
                        </div>
                        <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-primary">
                            Online Maths, Science & Coding Classes for Grades 6–12
                        </h1>
                        <p className="max-w-[600px] text-muted-foreground md:text-xl">
                            Live interactive tuition • Expert teachers • Personalized learning.
                            Unlock your child's potential with Brightline Academy.
                        </p>
                        <div className="flex flex-col gap-2 min-[400px]:flex-row">
                            <Button asChild size="lg" className="bg-primary text-secondary hover:bg-primary/90 font-bold px-8">
                                <Link href="/book-demo">
                                    Book a Free Demo Class <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-primary text-primary hover:bg-primary/5">
                                <Link href="/courses">Explore Courses</Link>
                            </Button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 mt-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>Small Batch Size</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>Interactive Learning</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center">
                        {/* Hero Image */}
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border-4 border-white/50">
                            <Image
                                src="/hero-image.png"
                                alt="Student learning online with Brightline Academy"
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
