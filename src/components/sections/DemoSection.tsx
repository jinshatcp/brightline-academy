import { LeadCaptureForm } from "@/components/forms/LeadCaptureForm";

export function DemoSection() {
    return (
        <section id="demo" className="py-16 bg-primary text-primary-foreground">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="grid gap-12 lg:grid-cols-2 items-center">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-white">
                            Unlock Your Child's Potential Today
                        </h2>
                        <p className="text-slate-200 text-lg">
                            Book a free demo class to experience our interactive teaching methodology.
                            Get a personalized learning plan and expert guidance.
                        </p>
                        <ul className="space-y-4 text-slate-200">
                            <li className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary font-bold">1</span>
                                <span>Fill out the form</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary font-bold">2</span>
                                <span>Schedule a time</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary font-bold">3</span>
                                <span>Start learning!</span>
                            </li>
                        </ul>
                    </div>
                    <div className="bg-background rounded-xl p-6 shadow-xl text-foreground">
                        <h3 className="text-xl font-bold mb-4 text-center">Book Your Free Demo Class</h3>
                        <LeadCaptureForm />
                    </div>
                </div>
            </div>
        </section>
    );
}
