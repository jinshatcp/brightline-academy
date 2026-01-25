"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ChevronRight } from "lucide-react";

type Message = {
    role: 'bot' | 'user';
    text: string;
};

export function FloatingChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', text: "👋 Hi there! Welcome to Brightline Academy. How can we help you today?" }
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleOptionClick = (option: string) => {
        // Add user message
        const newMessages = [...messages, { role: 'user', text: option } as Message];

        // Add bot response logic
        let botResponse = "";

        switch (option) {
            case "Fee Structure":
                botResponse = "For fee details, please send us an inquiry directly. We will contact you back shortly with the complete structure for your grade.";
                break;
            case "Class Timings":
                botResponse = "Our batches for Gulf students run from 4:00 PM to 9:00 PM (UAE Time). We also have special weekend batches.";
                break;
            case "Smart Platform":
                botResponse = "We don't use Zoom! Our custom LMS features recorded lectures, proctored exams, and a dedicated student dashboard.";
                break;
            default:
                botResponse = "Sure, feel free to ask or connect with us on WhatsApp.";
        }

        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
        }, 500);

        setMessages(newMessages);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all duration-300 flex items-center justify-center group"
                aria-label="Toggle chat"
            >
                {isOpen ? (
                    <X className="w-6 h-6" />
                ) : (
                    <MessageCircle className="w-6 h-6 animate-pulse" />
                )}
                <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Chat with us!
                </span>
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-5 duration-300 flex flex-col max-h-[500px]">
                    <div className="bg-blue-900 p-4 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white font-bold">
                                BL
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Brightline Support</h3>
                                <p className="text-blue-200 text-xs">Online</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/70 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div ref={scrollRef} className="p-4 flex-1 overflow-y-auto bg-gray-50 flex flex-col gap-3">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`self-${msg.role === 'bot' ? 'start' : 'end'} max-w-[85%] text-sm p-3 rounded-2xl shadow-sm ${msg.role === 'bot'
                                        ? 'bg-white text-gray-700 rounded-tl-none border border-gray-100'
                                        : 'bg-blue-600 text-white rounded-tr-none'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        ))}

                        {/* Quick Options */}
                        {messages.length < 3 && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {["Fee Structure", "Class Timings", "Smart Platform"].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => handleOptionClick(opt)}
                                        className="text-xs bg-white border border-blue-100 text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors text-left flex items-center justify-between"
                                    >
                                        {opt} <ChevronRight className="w-3 h-3" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
                        <a
                            href="https://wa.me/+919187384376"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-colors text-sm"
                        >
                            <Send className="w-4 h-4" />
                            Chat on WhatsApp
                        </a>
                        <p className="text-center text-[10px] text-gray-400 mt-2">
                            Powered by Brightline Academy
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
