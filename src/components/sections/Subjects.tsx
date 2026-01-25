import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, FlaskConical, Laptop } from "lucide-react";

const subjects = [
    {
        title: "Mathematics",
        description: "Build strong foundations in Algebra, Geometry, and Calculus for Grades 6-12.",
        icon: Calculator,
        grades: "Grades 6-12",
    },
    {
        title: "Science",
        description: "Explore Physics, Chemistry, and Biology with interactive experiments and concept clarity.",
        icon: FlaskConical,
        grades: "Grades 6-12",
    },
    {
        title: "Coding",
        description: "Learn Python, Web Development, and Scratch. Develop logical thinking and problem-solving.",
        icon: Laptop,
        grades: "Beginner to Advanced",
    },
];

export function Subjects() {
    return (
        <section className="py-16 bg-background">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="flex flex-col items-center justify-center text-center space-y-4 mb-12">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-primary">Subjects We Teach</h2>
                    <p className="max-w-[700px] text-muted-foreground md:text-xl">
                        Comprehensive curriculum designed for academic excellence and skill development.
                    </p>
                </div>
                <div className="grid gap-8 md:grid-cols-3">
                    {subjects.map((subject) => (
                        <Card key={subject.title} className="flex flex-col border-2 hover:border-primary transition-colors">
                            <CardHeader>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                                        <subject.icon className="h-6 w-6" />
                                    </div>
                                    <CardTitle className="text-2xl">{subject.title}</CardTitle>
                                </div>
                                <CardDescription className="font-medium text-secondary-foreground/80">{subject.grades}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-muted-foreground">{subject.description}</p>
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href="/courses">View Curriculum</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
