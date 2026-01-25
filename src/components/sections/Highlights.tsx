import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Code, Coins } from "lucide-react";

const highlights = [
    {
        title: "Small Batches",
        description: "Personalized attention with small batch sizes and 1-to-1 options.",
        icon: Users,
        color: "text-blue-600",
    },
    {
        title: "Expert Teachers",
        description: "Learn from experienced subject matter experts and industry professionals.",
        icon: BookOpen,
        color: "text-green-600",
    },
    {
        title: "Future Skills",
        description: "Master Coding (Python, Web) alongside academic subjects.",
        icon: Code,
        color: "text-purple-600",
    },
    {
        title: "Affordable",
        description: "High-quality education at prices that fit your budget.",
        icon: Coins,
        color: "text-orange-600",
    },
];

export function Highlights() {
    return (
        <section className="py-16 bg-slate-50">
            <div className="container px-4 md:px-6 mx-auto">
                <h2 className="text-3xl font-bold text-center mb-12 text-primary">Why Choose Brightline?</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {highlights.map((item) => (
                        <Card key={item.title} className="hover:shadow-lg transition-shadow border-none shadow-md">
                            <CardHeader className="space-y-1">
                                <div className={`p-3 w-12 h-12 rounded-lg bg-background ${item.color} mb-2 shadow-sm flex items-center justify-center`}>
                                    <item.icon className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl">{item.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{item.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
