import { Metadata } from 'next';
import { LeadCaptureForm } from "@/components/forms/LeadCaptureForm";

export const metadata: Metadata = {
    title: "Book Free Demo Class",
    description: "Schedule your free demo class for Maths, Science, or Coding. Experience expert teaching at Brightline Academy.",
};

export default function BookDemoPage() {
    return (
        <div className="container px-4 md:px-6 py-16 mx-auto">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-primary">Book Your Free Demo Class</h1>
                    <p className="text-muted-foreground">
                        Take the first step towards academic excellence. Fill out the form below and we will contact you to schedule a session.
                    </p>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-xl border shadow-lg">
                    <LeadCaptureForm />
                </div>
            </div>
        </div>
    );
}
