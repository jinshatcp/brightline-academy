import { Metadata } from 'next';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, Globe, Star } from "lucide-react";

export const metadata: Metadata = {
    title: "About Us",
    description: "Learn about Brightline Academy's mission, expert teachers, and interactive teaching methodology.",
};

export default function AboutPage() {
    return (
        <div className="container px-4 md:px-6 py-16 mx-auto">
            <div className="max-w-4xl mx-auto space-y-12">
                <section className="space-y-4 text-center">
                    <h1 className="text-4xl font-bold text-primary">About Brightline Academy</h1>
                    <p className="text-xl text-muted-foreground">
                        Empowering students to think logically, learn conceptually, and succeed globally.
                    </p>
                </section>

                <section className="grid gap-8 md:grid-cols-2 items-center">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-primary">Our Mission & Vision</h2>
                        <p className="text-muted-foreground">
                            At Brightline, we believe that education is not just about scoring marks but about mastering concepts.
                            Our mission is to provide high-quality, personalized online tuition that makes learning math, science, and coding enjoyable and effective.
                        </p>
                        <p className="text-muted-foreground">
                            We envision a future where every student is confident, curious, and equipped with the skills to solve real-world problems.
                        </p>
                    </div>
                    <div className="w-full relative rounded-xl overflow-hidden shadow-lg h-[600px] md:h-auto md:aspect-square">
                        <Image
                            src="/mission-image.png"
                            alt="Brightline Academy Mission"
                            fill
                            className="object-cover"
                        />
                    </div>
                </section>

                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-primary text-center">Our Teaching Methodology</h2>
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="p-6 bg-white shadow-sm border rounded-lg">
                            <h3 className="text-lg font-bold mb-2 text-secondary-foreground">Concept Clarity</h3>
                            <p className="text-sm text-slate-600">Focus on "Why" and "How" rather than rote learning. We ensure deep understanding of every topic.</p>
                        </div>
                        <div className="p-6 bg-white shadow-sm border rounded-lg">
                            <h3 className="text-lg font-bold mb-2 text-secondary-foreground">Interactive Classes</h3>
                            <p className="text-sm text-slate-600">Live 2-way communication, quizzes, and digital whiteboards to keep students engaged.</p>
                        </div>
                        <div className="p-6 bg-white shadow-sm border rounded-lg">
                            <h3 className="text-lg font-bold mb-2 text-secondary-foreground">Future-Ready Skills</h3>
                            <p className="text-sm text-slate-600">Integrating Coding (Python, Web) with academics to prepare students for the tech-driven future.</p>
                        </div>
                    </div>
                </section>

                            From different academic calendars to the need for competitive exam (JEE/NEET) preparation while living abroad.
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-blue-400" />
                                <span>Timings aligned with Gulf Time Zone</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-blue-400" />
                                <span>Focus on CBSE guidelines followed in Gulf schools</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-blue-400" />
                                <span>Bridge courses for students moving back to India</span>
                            </li>
                        </ul>
                    </div>
                    <div className="bg-white/10 p-6 rounded-xl border border-white/20">
                        <div className="flex items-center gap-4 mb-4">
                            <Globe className="h-8 w-8 text-blue-400" />
                            <h3 className="font-bold text-xl">Global Standards</h3>
                        </div>
                        <p className="text-sm text-slate-300">
                            "Our daughter in Grade 10 at an Indian School in Dubai was struggling with Physics. The personalized attention from Brightline's tutors made all the difference. She scored 95% in her boards."
                        </p>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                            <span className="text-xs font-bold text-white">The Verma Family, Dubai</span>
                            <div className="flex gap-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            </div>
                        </div>
                    </div>
                </div >
            </section >

        <section className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4">Join the Brightline Family</h2>
            <Button asChild size="lg" className="bg-primary text-secondary">
                <Link href="/book-demo">Book a Free Assessment</Link>
            </Button>
        </section>
        </div >
        </div >
    );
}
