"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
    studentName: z.string().min(2, { message: "Student name must be at least 2 characters." }),
    grade: z.string().min(1, { message: "Please select a grade." }),
    subject: z.string().min(1, { message: "Please select a subject." }),
    parentContact: z.string().min(10, { message: "Please enter a valid contact number." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
});

// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJd86v1eHbmz16dgGGWNkY2QF_b8mGMdEIqTInyeCPghJobIps6AjR1zfjFtFO4dTi/exec";

export function LeadCaptureForm() {
    const [isSubmitted, setIsSubmitted] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            studentName: "",
            grade: "",
            subject: "",
            parentContact: "",
            email: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            const payload = {
                ...values,
                formType: 'demo'
            };

            await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            setIsSubmitted(true);
        } catch (error) {
            console.error("Error submitting form", error);
            alert("Something went wrong. Please try emailing us directly.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isSubmitted) {
        return (
            <div className="text-center space-y-4 p-6 bg-green-50 rounded-lg border border-green-200">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold">✓</div>
                    <h3 className="text-xl font-bold text-primary">Demo Requested!</h3>
                </div>
                <p className="text-md text-muted-foreground">
                    Your request for a free demo class has been received. Our team will contact you shortly on the provided number.
                </p>
                <Button variant="outline" onClick={() => {
                    setIsSubmitted(false);
                    form.reset();
                }} className="mt-4">
                    Back to Form
                </Button>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="studentName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Student Name</FormLabel>
                            <FormControl>
                                <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="grade"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Grade</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Grade" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                                            <SelectItem key={g} value={String(g)}>
                                                Grade {g}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Interested Subject</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Subject" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="maths">Mathematics</SelectItem>
                                        <SelectItem value="science">Science</SelectItem>
                                        <SelectItem value="coding">Coding</SelectItem>
                                        <SelectItem value="all">All Subjects</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="parentContact"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Parent Contact Number</FormLabel>
                            <FormControl>
                                <Input placeholder="+1 234 567 890" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                                <Input placeholder="parent@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full font-bold bg-secondary text-primary hover:bg-secondary/90" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Book Free Demo Class"}
                </Button>
            </form>
        </Form>
    );
}
