import { Metadata } from 'next';
import Image from 'next/image';
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/forms/ContactForm";

export const metadata: Metadata = {
    title: "Contact Us",
    description: "Get in touch with Brightline Academy for any queries regarding our courses and online tuition.",
};

export default function ContactPage() {
    return (
        <div className="container px-4 md:px-6 py-16 mx-auto">
            <div className="grid gap-12 lg:grid-cols-2">
                <div className="space-y-8">
                    <section>
                        <h1 className="text-4xl font-bold text-primary mb-4">Contact Us</h1>
                        <p className="text-muted-foreground text-lg">
                            Have questions? We are here to help. Reach out to us via email, phone, or WhatsApp.
                        </p>
                    </section>

                    <div className="grid gap-6">
                        <Card>
                            <CardContent className="flex flex-row items-center justify-between gap-4 p-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 text-green-600 rounded-full">
                                        <MessageCircle className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">WhatsApp</h3>
                                        <p className="text-sm text-muted-foreground">+91 9187 384 376</p>
                                        <p className="text-xs text-muted-foreground mt-1">Scan to chat</p>
                                    </div>
                                </div>
                                <div className="relative w-24 h-24 border rounded-lg overflow-hidden shrink-0">
                                    <Image
                                        src="/whatsapp-qr.jpeg"
                                        alt="WhatsApp QR Code"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                                    <Mail className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold">Email</h3>
                                    <p className="text-sm text-muted-foreground">academybrightline@gmail.com</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                                    <Phone className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold">Call Us</h3>
                                    <p className="text-sm text-muted-foreground">+91 9187 384 376</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-xl shadow-sm border">
                    <h2 className="text-2xl font-bold text-primary mb-6">Send us a Message</h2>
                    <ContactForm />
                </div>
            </div>
        </div>
    );
}
