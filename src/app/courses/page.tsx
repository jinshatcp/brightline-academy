import { Metadata } from 'next';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
    title: "Courses",
    description: "Explore our online courses in Maths, Science, and Coding for Grades 6-12.",
};

const courses = [
    {
        category: "Mathematics",
        items: [
            {
                title: "Middle School Math",
                grade: "Grades 6-8",
                desc: "Master integers, fractions, geometry, and basic algebra.",
                tags: ["Foundation", "Logic"],
            },
            {
                title: "High School Math",
                grade: "Grades 9-10",
                desc: "Advanced algebra, trigonometry, statistics, and exam prep.",
                tags: ["Board Exams", "Problem Solving"],
            },
            {
                title: "Senior Math",
                grade: "Grades 11-12",
                desc: "Calculus, vectors, probability, and competitive exam readiness.",
                tags: ["Advanced", "Calculus"],
            },
        ],
    },
    {
        category: "Science",
        items: [
            {
                title: "Integrated Science",
                grade: "Grades 6-8",
                desc: "Physics, Chemistry, and Biology basics explained through experiments.",
                tags: ["Exploration", "Curiosity"],
            },
            {
                title: "Physics / Chem / Bio",
                grade: "Grades 9-10",
                desc: "Deep dive into core sciences with focus on board syllabus and concepts.",
                tags: ["Theory", "Practicals"],
            },
        ],
    },
    {
        category: "Coding & Tech",
        items: [
            {
                title: "Scratch & Logic",
                grade: "Grades 6-8",
                desc: "Block-based coding to understand logic, loops, and creativity.",
                tags: ["Beginner", "Fun"],
            },
            {
                title: "Python Fundamentals",
                grade: "Grades 8-12",
                desc: "Learn the world's most popular programming language.",
                tags: ["Python", "Projects"],
            },
            {
                title: "Web Development",
                grade: "Grades 9-12",
                desc: "Build websites using HTML, CSS, and basic JavaScript.",
                tags: ["Web Design", "Creative"],
            },
        ],
    },
];

export default function CoursesPage() {
    return (
        <div className="container px-4 md:px-6 py-16 mx-auto">
            <div className="space-y-12">
                <section className="text-center space-y-4">
                    <h1 className="text-4xl font-bold text-primary">Our Courses</h1>
                    <p className="max-w-2xl mx-auto text-muted-foreground">
                        Comprehensive syllabuses designed by experts to ensure academic success and skill building.
                    </p>
                </section>

                {/* Gulf Focus Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white text-center shadow-lg">
                    <h2 className="text-2xl font-bold mb-2">Special Batches for UAE & Gulf Students</h2>
                    <p className="text-blue-100 max-w-2xl mx-auto mb-6">
                        We offer dedicated timings and curriculum alignment for CBSE students in Dubai, Sharjah, Saudi Arabia, and Qatar.
                    </p>
                    <Link href="/blogs/best-online-science-tuition-uae-gulf" className="inline-block bg-white text-blue-700 font-bold px-6 py-2 rounded-full hover:bg-gray-100 transition-colors">
                        Learn More
                    </Link>
                </div>

                {/* Key Highlights Section (New) */}
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <h3 className="font-bold text-blue-900 mb-2">Live Interactive Polls</h3>
                        <p className="text-sm text-blue-800">Classes aren't just watching a video. Students answer quizzes in real-time to check understanding.</p>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                        <h3 className="font-bold text-purple-900 mb-2">Recorded Lectures</h3>
                        <p className="text-sm text-purple-800">Missed a class? Watch the recording anytime, anywhere. Perfect for revision.</p>
                    </div>
                    <div className="bg-teal-50 p-6 rounded-xl border border-teal-100">
                        <h3 className="font-bold text-teal-900 mb-2">Weekly Assignments</h3>
                        <p className="text-sm text-teal-800">Regular homework and tests to ensure the concepts are stuck in memory.</p>
                    </div>
                </div>

                {courses.map((section) => (
                    <section key={section.category} className="space-y-6">
                        <h2 className="text-2xl font-bold pt-8 border-t">{section.category}</h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {section.items.map((course) => (
                                <Card key={course.title} className="flex flex-col hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-xl">{course.title}</CardTitle>
                                            <Badge variant="secondary">{course.grade}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <p className="text-sm text-muted-foreground mb-4">{course.desc}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {course.tags.map(tag => (
                                                <span key={tag} className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">#{tag}</span>
                                            ))}
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full" asChild>
                                            <Link href="/book-demo">Enroll / Book Demo</Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </section>
                ))}

                {/* Batch Options Section (New) */}
                <section className="bg-slate-900 text-white rounded-2xl p-8 mt-12">
                    <h2 className="text-2xl font-bold mb-8 text-center">Batch Options to Suit Your Schedule</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white/10 p-6 rounded-xl border border-white/10">
                            <h3 className="font-bold text-lg mb-2">Regular Weekday Batch</h3>
                            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
                                <li>3-4 days per week</li>
                                <li>Complete Syllabus Coverage</li>
                                <li>Slow & Steady Pace</li>
                            </ul>
                        </div>
                        <div className="bg-white/10 p-6 rounded-xl border border-white/10">
                            <h3 className="font-bold text-lg mb-2">Weekend Fast-Track</h3>
                            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
                                <li>Fri & Sat / Sat & Sun</li>
                                <li>Focus on Core Concepts</li>
                                <li>Ideal for self-study students</li>
                            </ul>
                        </div>
                        <div className="bg-white/10 p-6 rounded-xl border border-white/10">
                            <h3 className="font-bold text-lg mb-2">Exam Crash Course</h3>
                            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
                                <li>2 Months before Boards</li>
                                <li>Daily Mock Tests</li>
                                <li>Rapid Revision</li>
                            </ul>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
