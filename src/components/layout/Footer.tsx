import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
    return (
        <footer className="w-full bg-slate-900 text-slate-200 border-t border-slate-800">
            <div className="container px-4 md:px-6 py-12 mx-auto">
                <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white">Brightline Academy</h3>
                        <p className="text-sm text-slate-400">
                            Empowering students with concept clarity, logical thinking, and future-ready skills in Maths, Science, and Coding.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Quick Links</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                            </li>
                            <li>
                                <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
                            </li>
                            <li>
                                <Link href="/courses" className="hover:text-white transition-colors">Courses</Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
                            </li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Subjects</h3>
                        <ul className="space-y-2 text-sm">
                            <li>Mathematics (Gr 6-12)</li>
                            <li>Science (Physics, Chem, Bio)</li>
                            <li>Coding (Python, Web, Scratch)</li>
                            <li>Exam Preparation</li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Contact Us</h3>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>academybrightline@gmail.com</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>+91 9187 384 376</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>Online / Global</span>
                            </li>
                        </ul>
                        <div className="flex gap-4 pt-2">
                            <Link href="#" aria-label="Facebook" className="hover:text-white transition-colors">
                                <Facebook className="h-5 w-5" />
                            </Link>
                            <Link href="#" aria-label="Twitter" className="hover:text-white transition-colors">
                                <Twitter className="h-5 w-5" />
                            </Link>
                            <Link href="#" aria-label="Instagram" className="hover:text-white transition-colors">
                                <Instagram className="h-5 w-5" />
                            </Link>
                            <Link href="#" aria-label="LinkedIn" className="hover:text-white transition-colors">
                                <Linkedin className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
                    <p>© {new Date().getFullYear()} Brightline Academy. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
