import {
    BookOpen,
    Monitor,
    Clock,
    Award,
    Globe,
    CheckCircle,
    MapPin,
    HelpCircle,
    Star,
    Linkedin,
    Code,
    Calculator,
    Beaker,
    BrainCircuit,
    Rocket,
    Users,
    Target,
    Zap,
    XCircle,
    Check,
    Search
} from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Best Online Tuition in UAE, Sharjah, Ajman & Dubai (CBSE Science/Maths)",
    description: "Top-rated online tuition for CBSE students in Sharjah (Muwaileh, Al Nahda), Ajman (Al Jurf), and Dubai. Expert Maths, Science & Coding classes for Grades 6-12.",
    keywords: [
        // UAE General
        "Online science tuition UAE", "Best online maths tuition UAE", "CBSE tuition UAE", "Online coding classes UAE",
        // Sharjah
        "Tuition in Muwaileh Sharjah", "CBSE tuition Al Nahda Sharjah", "Science tutors Al Majaz", "Maths classes Abu Shagara", "Online tuition Rolla Sharjah", "Tuition in Al Khan Sharjah", "Private tutors in Sharjah",
        // Dubai
        "Maths tuition Dubai Silicon Oasis", "Science tutors Bur Dubai", "CBSE tuition Al Karama", "Online classes JVC Dubai", "Physics tutors Al Barsha", "Tuition in Discovery Gardens", "Maths tuition Deira", "Science classes Al Nahda Dubai",
        // Ajman
        "Tuition centres Al Jurf Ajman", "CBSE tuition Al Nuaimiya", "Science classes Al Tallah", "Maths tutors Ajman downtown",
        // Abu Dhabi
        "Online tuition Abu Dhabi", "CBSE tutors Mussafah", "Maths classes Khalifa City",
        // Gulf / GCC
        "Online tuition Saudi Arabia", "CBSE tuition Riyadh", "Maths tutors Jeddah", "Physics tuition Dammam",
        "Online tuition Qatar", "CBSE tuition Doha", "Science tutors Al Wakrah",
        "Online tuition Oman", "CBSE tuition Muscat",
        "Online tuition Kuwait", "CBSE tuition Kuwait City",
        "Online tuition Bahrain", "CBSE tuition Manama",
        // Subjects & Grades
        "Grade 6 Science tuition", "Grade 7 Maths tuition", "Grade 8 Science classes", "Grade 9 CBSE Maths", "Grade 10 Physics tuition", "Grade 11 Chemistry tuition", "Grade 12 Maths tuition",
        "Python coding for kids UAE", "Web development classes for students Dubai", "Biology tuition for NEET UAE"
    ],
};

export default function BestOnlineTuitionGulf() {
    return (
        <main className="min-h-screen bg-white font-sans selection:bg-blue-100">

            {/* Hero Section */}
            <section className="relative bg-[#0F172A] text-white py-24 px-4 md:px-8 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-slate-900/95 to-slate-900/90"></div>
                <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-400/30 rounded-full px-5 py-2 text-sm font-bold text-yellow-300 animate-pulse">
                            <Star className="w-4 h-4 fill-current" />
                            <span>#1 Rated by Parents in Sharjah & Dubai</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                            Bridge the Gap to <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300">Academic Excellence</span>
                        </h1>

                        <p className="text-lg text-slate-300 leading-relaxed max-w-xl">
                            Don't let your child fall behind. Expert Online Tuition for <strong>Maths, Science & Coding</strong> (Grades 6-12).
                            Specially designed for CBSE students in <strong>Sharjah, Ajman, Dubai</strong> and the wider Gulf.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link
                                href="/book-demo"
                                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:bg-blue-500 transition-all transform hover:-translate-y-1 text-center"
                            >
                                Book Free Demo Class
                            </Link>
                            <Link
                                href="https://wa.me/+919187384376"
                                className="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all text-center flex items-center justify-center gap-2 backdrop-blur-sm"
                            >
                                <span>WhatsApp Us</span>
                            </Link>
                        </div>

                        <div className="flex items-center gap-6 pt-4 text-sm text-slate-400 font-medium">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                <span>5000+ Students</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-blue-400" />
                                <span>UAE & GCC Focus</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative hidden lg:block">
                        {/* Visual Abstract */}
                        <div className="relative z-10 grid grid-cols-2 gap-4">
                            <SubjectCard
                                icon={<Calculator className="w-8 h-8 text-blue-400" />}
                                title="Mathematics"
                                grade="Gr 6-12"
                                desc="Algebra, Calculus, Geometry"
                                color="bg-blue-600/20"
                            />
                            <SubjectCard
                                icon={<Beaker className="w-8 h-8 text-purple-400" />}
                                title="Science"
                                grade="Gr 6-12"
                                desc="Physics, Chem, Biology"
                                color="bg-purple-600/20"
                            />
                            <SubjectCard
                                icon={<Code className="w-8 h-8 text-teal-400" />}
                                title="Coding"
                                grade="Gr 6-12"
                                desc="Python, Web, Logic"
                                color="bg-teal-600/20"
                                className="col-span-2"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Section (New) */}
            <section className="py-20 bg-gray-50 px-4">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Why Local Tuition Centers Are Outdated</h2>
                    <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">See why smart parents in Al Nahda and Bur Dubai are switching to Brightline.</p>

                    <div className="overflow-x-auto">
                        <table className="w-full bg-white rounded-2xl shadow-sm border-collapse overflow-hidden">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="p-6 text-left w-1/3">Feature</th>
                                    <th className="p-6 text-center w-1/3 bg-blue-600">Brightline Academy</th>
                                    <th className="p-6 text-center w-1/3 text-gray-400">Local Tuition Centers</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <ComparisonRow
                                    feature="Faculty Quality"
                                    us="Expert Subject Specialists"
                                    them="General B.Ed Teachers"
                                    usIcon={<CheckCircle className="w-5 h-5 text-green-500 inline mr-2" />}
                                    themIcon={<Target className="w-5 h-5 text-gray-400 inline mr-2" />}
                                />
                                <ComparisonRow
                                    feature="Travel Time"
                                    us="Zero (Learn from Home)"
                                    them="1-2 Hours Wasted Daily"
                                />
                                <ComparisonRow
                                    feature="Class Recordings"
                                    us="Available 24/7 for Revision"
                                    them="Not Available"
                                />
                                <ComparisonRow
                                    feature="Personal Attention"
                                    us="Small Batches (Max 5-8)"
                                    them="Crowded Rooms (20+ Kids)"
                                />
                                <ComparisonRow
                                    feature="Curriculum Focus"
                                    us="CBSE/NCERT Oriented"
                                    them="Generic"
                                />
                                <ComparisonRow
                                    feature="Extra Support"
                                    us="Revision Classes & Mentor Session"
                                    them="None"
                                />
                                <ComparisonRow
                                    feature="Technology"
                                    us="Smart Learning Platform"
                                    them="Basic Zoom/Google Meet"
                                />
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Smart Platform Section (Updated) */}
            <section className="py-20 bg-white px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-blue-600 font-bold tracking-wider text-sm uppercase">Technology</span>
                        <h2 className="text-3xl font-bold text-gray-900 mt-2">Why We Don't Use Zoom or Google Meet</h2>
                        <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                            Standard meeting apps are for offices, not students. Our custom-built Learning Management System (LMS) is designed for serious education.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="bg-indigo-100 p-3 rounded-lg h-fit text-indigo-600">
                                    <Monitor className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900">Dedicated Student Dashboard</h3>
                                    <p className="text-gray-600 text-sm mt-1">
                                        No more searching WhatsApp groups for links. Access all class notes, assignments, and recordings in one organized individual portal.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-pink-100 p-3 rounded-lg h-fit text-pink-600">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900">Archive of Old Classes</h3>
                                    <p className="text-gray-600 text-sm mt-1">
                                        Zoom links expire. Our platform keeps your entire history of classes safe and organized by chapter for exam revision.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-teal-100 p-3 rounded-lg h-fit text-teal-600">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900">Proctored Online Exams</h3>
                                    <p className="text-gray-600 text-sm mt-1">
                                        Real exam simulation with camera-proctoring to ensure integrity and get students used to pressure (unlike Google Forms).
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-orange-100 p-3 rounded-lg h-fit text-orange-600">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-gray-900">Live Interactive Quizzes</h3>
                                    <p className="text-gray-600 text-sm mt-1">
                                        Teachers launch polls and quizzes instantly during class to check understanding. It's active learning, not just listening.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-100 rounded-2xl p-8 border border-gray-200">
                            <div className="mb-6">
                                <h3 className="font-bold text-gray-900 mb-2">About Brightline Academy</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Brightline Academy is a premier online tutoring platform founded by passionate educators.
                                    Our mission is to provide high-quality, conceptual education to students in the Gulf region who often struggle to find good quality teachers locally.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl text-center shadow-sm">
                                    <span className="block text-2xl font-bold text-blue-600">5000+</span>
                                    <span className="text-xs text-gray-500">Happy Students</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl text-center shadow-sm">
                                    <span className="block text-2xl font-bold text-blue-600">96%</span>
                                    <span className="text-xs text-gray-500">Score Improvement</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Detailed Curriculum Section (New) */}
            <section className="py-20 px-4 max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-1">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">What We Teach</h2>
                        <div className="space-y-4">
                            <p className="text-gray-600">
                                Our curriculum is meticulously designed for students in Gulf schools. We cover every chapter, every concept, and every doubt.
                            </p>
                            <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                                <h4 className="font-bold text-blue-900 mb-2">Did you know?</h4>
                                <p className="text-sm text-blue-800">
                                    Most students in Grade 11 struggle because their Grade 9 foundations are weak. We fix that.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                        <CurriculumCard
                            title="Middle School (Gr 6-8)"
                            subjects={[
                                "Science: Motion, Light, Cells, Atoms",
                                "Maths: Integers, Algebra Basics, Geometry",
                                "Coding: Block coding (Scratch) & Logic"
                            ]}
                            icon={<Rocket className="w-6 h-6 text-purple-500" />}
                        />
                        <CurriculumCard
                            title="Secondary (Gr 9-10)"
                            subjects={[
                                "Physics: Electricity, Magnetism, Optics",
                                "Chem: Periodic Table, Carbon Compounds",
                                "Bio: Life Processes, Heredity",
                                "Maths: Trigonometry, Quadratic Eq, Stats"
                            ]}
                            isHighlight
                            icon={<Target className="w-6 h-6 text-blue-500" />}
                        />
                        <CurriculumCard
                            title="Senior Secondary (Gr 11-12)"
                            subjects={[
                                "Specialized Streams: PCM / PCB",
                                "Entrance Prep: JEE / NEET Foundation",
                                "Computer Science: Python, SQL"
                            ]}
                            icon={<BrainCircuit className="w-6 h-6 text-teal-500" />}
                        />
                        <CurriculumCard
                            title="Coding Academy"
                            subjects={[
                                "Python Programming (Zero to Hero)",
                                "Web Development (HTML/CSS/JS)",
                                "Artificial Intelligence Basics"
                            ]}
                            icon={<Code className="w-6 h-6 text-indigo-500" />}
                        />
                    </div>
                </div>
            </section>

            {/* Teachers / Exam Prep Section (New) */}
            <section className="py-20 bg-slate-900 text-white px-4">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4">Exam Training Strategy</h2>
                    <p className="text-slate-400">How we help average students become toppers</p>
                </div>
                <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
                    <StrategyStep
                        num="01"
                        title="Concept Decoding"
                        desc="We don't just lecture. We use storytelling and real-life examples to make complex atoms and equations relatable and easy to remember."
                    />
                    <StrategyStep
                        num="02"
                        title="Doubt Destruction"
                        desc="Daily doubt-solving sessions so no question remains unanswered."
                    />
                    <StrategyStep
                        num="03"
                        title="Mock Drilling"
                        desc="Weekly tests that simulate the real exam pressure and pattern."
                    />
                    <StrategyStep
                        num="04"
                        title="Gap Analysis"
                        desc="AI-driven reports to tell you exactly where marks are lost."
                    />
                </div>
            </section>

            {/* Success Stories Section (New) */}
            <section className="py-20 bg-blue-50 px-4">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Parents from Dubai & Sharjah Trust Us</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <TestimonialCard
                            name="Priya S."
                            location="Al Nahda, Sharjah"
                            grade="Grade 9 Parent"
                            text="My son was struggling with Physics equations. After just 2 months with Brightline, he is now confident and scoring grade 90+. The teachers are very patient."
                        />
                        <TestimonialCard
                            name="Ahmed K."
                            location="Silicon Oasis, Dubai"
                            grade="Grade 11 Student"
                            text="The JEE foundation classes here are much better than local centers. I save 2 hours of travel time every day, which I use for self-study."
                        />
                        <TestimonialCard
                            name="Sarah M."
                            location="Al Jurf, Ajman"
                            grade="Grade 7 Parent"
                            text="We love the coding classes! It's amazing to see my daughter building her own websites. The 1:1 attention is exactly what she needed."
                        />
                    </div>
                </div>
            </section >

            {/* FAQ Section (New) */}
            < section className="py-20 px-4 max-w-4xl mx-auto" >
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    <FAQItem
                        question="Do you cover the CBSE Syllabus followed in UAE schools?"
                        answer="Yes, 100%. Our curriculum is strictly aligned with the NCERT/CBSE guidelines followed by Indian schools in the UAE, Qatar, and Saudi Arabia. We also cover additional topics for competitive exams."
                    />
                    <FAQItem
                        question="What are the class timings?"
                        answer="We have special batches for Gulf students running from 4:00 PM to 9:00 PM (UAE Time) to align with after-school hours. Weekend batches are also available."
                    />
                    <FAQItem
                        question="Do you provide demo classes?"
                        answer="Yes! We offer a FREE comprehensive assessment and demo class. It helps us understand your child's current level and design a learning plan."
                    />
                    <FAQItem
                        question="How do you handle doubt solving?"
                        answer="Apart from live classes, students have access to a dedicated doubt-clearing group where they can post questions and get video solutions from mentors."
                    />
                </div>
            </section >

            {/* Locations SEO Block - The "30+ Keywords" Section */}
            < section className="py-16 px-4 bg-gray-50 border-t border-gray-200" >
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <MapPin className="w-6 h-6 text-red-500 animate-bounce" />
                        <h2 className="text-2xl font-bold text-gray-900">Serving Families Across Top Residential Areas</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Sharjah Column */}
                        <div>
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Sharjah</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>• Tuition in <strong>Muwaileh</strong> Commercial</li>
                                <li>• CBSE Classes in <strong>Al Nahda</strong> Sharjah</li>
                                <li>• Science Tutors in <strong>Al Majaz 1, 2, 3</strong></li>
                                <li>• Maths Tuition in <strong>Al Khan</strong> & <strong>Al Taawun</strong></li>
                                <li>• Education in <strong>Abu Shagara</strong></li>
                                <li>• Private Tutors in <strong>Rolla</strong></li>
                                <li>• Classes in <strong>Al Qasimia</strong></li>
                            </ul>
                        </div>

                        {/* Dubai Column */}
                        <div>
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Dubai</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>• Tuition in <strong>Dubai Silicon Oasis (DSO)</strong></li>
                                <li>• Classes in <strong>Bur Dubai</strong> & <strong>Karama</strong></li>
                                <li>• Tutors in <strong>Al Barsha</strong> & <strong>Tecom</strong></li>
                                <li>• Science in <strong>Jumeirah Village Circle (JVC)</strong></li>
                                <li>• Maths in <strong>Discovery Gardens</strong></li>
                                <li>• CBSE Tuition in <strong>Al Nahda Dubai</strong></li>
                                <li>• Classes in <strong>International City</strong></li>
                            </ul>
                        </div>

                        {/* Ajman & Others Column */}
                        <div>
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Ajman & Others</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>• Tuition in <strong>Al Jurf</strong> Ajman</li>
                                <li>• Classes in <strong>Al Nuaimiya</strong></li>
                                <li>• Tutors in <strong>Al Tallah 2</strong></li>
                                <li>• Online Tuition <strong>Riyadh</strong> (KSA)</li>
                                <li>• CBSE Classes <strong>Doha</strong> (Qatar)</li>
                                <li>• Maths Tuition <strong>Muscat</strong> (Oman)</li>
                                <li>• Science Tutors <strong>Kuwait City</strong></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section >



            {/* Refined LinkedIn Section */}
            < section className="py-8 px-4 max-w-5xl mx-auto mt-8" >
                <div className="bg-[#0077b5] rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-blue-900/10">
                    <div className="flex items-center gap-5">
                        <div className="bg-white p-4 rounded-full shadow-inner">
                            <Linkedin className="w-8 h-8 text-[#0077b5]" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-1">Join Our Community</h3>
                            <p className="text-blue-100 max-w-md">
                                Follow Brightline Academy for free resources, webinar alerts, and student success stories.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="https://www.linkedin.com/company/brightline-academy/"
                        target="_blank"
                        className="bg-white text-[#0077b5] px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-md whitespace-nowrap"
                    >
                        Connect on LinkedIn
                    </Link>
                </div>
            </section >

            {/* Final CTA */}
            < section className="py-24 bg-white text-center px-4" >
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
                    Ready to boost your child's grades?
                </h2>
                <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                    Join the #1 Rated Online Tuition Platform in the Gulf.
                </p>
                <Link
                    href="/book-demo"
                    className="inline-flex items-center gap-3 bg-blue-600 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1"
                >
                    <span>Book Free Demo Class</span>
                    <Globe className="w-5 h-5" />
                </Link>
            </section >
        </main >
    );
}

// Sub-components
function SubjectCard({ icon, title, grade, desc, color, className = "" }: any) {
    return (
        <div className={`backdrop-blur-md bg-white/10 border border-white/10 p-6 rounded-2xl ${className}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                {icon}
            </div>
            <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
            <div className="flex justify-between items-end">
                <p className="text-slate-400 text-sm">{desc}</p>
                <span className="text-xs font-mono bg-white/20 px-2 py-1 rounded text-white">{grade}</span>
            </div>
        </div>
    )
}

function ComparisonRow({ feature, us, them, usIcon, themIcon }: any) {
    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="p-6 font-semibold text-gray-700 border-r border-gray-100">{feature}</td>
            <td className="p-6 text-center text-blue-700 font-bold bg-blue-50/50 border-r border-gray-100">
                {usIcon}{us}
            </td>
            <td className="p-6 text-center text-gray-500">
                {themIcon}{them}
            </td>
        </tr>
    )
}

function CurriculumCard({ title, subjects, icon, isHighlight }: any) {
    return (
        <div className={`p-6 rounded-xl border ${isHighlight ? 'border-blue-200 bg-blue-50 shadow-md transform md:scale-105' : 'border-gray-200 bg-white shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                    {icon}
                </div>
                <h3 className="font-bold text-lg text-gray-900">{title}</h3>
            </div>
            <ul className="space-y-3">
                {subjects.map((sub: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{sub}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function StrategyStep({ num, title, desc }: any) {
    return (
        <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-colors">
            <span className="text-4xl font-bold text-blue-500/30 mb-4 block">{num}</span>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 text-sm">{desc}</p>
        </div>
    )
}

function TestimonialCard({ name, location, grade, text }: any) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
            <div className="flex items-center gap-1 text-yellow-500 mb-4">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
            </div>
            <p className="text-gray-600 mb-6 italic">"{text}"</p>
            <div>
                <h4 className="font-bold text-gray-900">{name}</h4>
                <p className="text-xs text-gray-500">{location}</p>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{grade}</span>
            </div>
        </div>
    )
}

function FAQItem({ question, answer }: any) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="font-bold text-gray-900 text-lg mb-2 flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                {question}
            </h3>
            <p className="text-gray-600 ml-7">{answer}</p>
        </div>
    )
}
