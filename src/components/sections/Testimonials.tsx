import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
    {
        name: "Sarah Jenkins",
        role: "Parent of Grade 8 Student",
        text: "Brightline Academy transformed my son's approach to Maths. He used to fear algebra, but now he loves solving problems. The 1-on-1 attention is excellent.",
        rating: 5,
    },
    {
        name: "Rahul M.",
        role: "Grade 10 Student",
        text: "The coding classes are amazing! I built my first Python game in just 4 weeks. The teachers explain everything so clearly.",
        rating: 5,
    },
    {
        name: "Priya Sharma",
        role: "Parent of Grade 6 Student",
        text: "Interactive sessions and regular progress reports keep me updated. Highly recommend for Science and Coding.",
        rating: 5,
    },
];

export function Testimonials() {
    return (
        <section className="py-16 bg-slate-50">
            <div className="container px-4 md:px-6 mx-auto">
                <h2 className="text-3xl font-bold text-center mb-12 text-primary">What Parents & Students Say</h2>
                <div className="grid gap-6 md:grid-cols-3">
                    {testimonials.map((t, i) => (
                        <Card key={i} className="border-none shadow-md">
                            <CardHeader className="pb-2">
                                <div className="flex gap-1 mb-2">
                                    {[...Array(t.rating)].map((_, i) => (
                                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-4">"{t.text}"</p>
                                <div>
                                    <p className="font-bold text-primary">{t.name}</p>
                                    <p className="text-sm text-slate-500">{t.role}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
