import { Hero } from "@/components/sections/Hero";
import { Highlights } from "@/components/sections/Highlights";
import { Subjects } from "@/components/sections/Subjects";
import { Testimonials } from "@/components/sections/Testimonials";
import { DemoSection } from "@/components/sections/DemoSection";

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Brightline Academy",
    "url": "https://www.brightlineacademy.com",
    "logo": "https://www.brightlineacademy.com/brightline-logo.png",
    "description": "Online Maths, Science & Coding Classes for Grades 6–12",
    "sameAs": [
      "https://facebook.com/brightline",
      "https://twitter.com/brightline",
      "https://instagram.com/brightline"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "World"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-234-567-890",
      "contactType": "customer service"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <Highlights />
      <Subjects />
      <Testimonials />

      {/* Latest Articles Section */}
      <section className="py-20 bg-slate-50">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Latest from Our Blog</h2>
            <p className="text-gray-600 mt-2">Expert advice, study tips, and educational news</p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col md:flex-row">
              <div className="md:w-2/5 bg-blue-900 h-48 md:h-auto flex items-center justify-center p-6">
                <div className="text-center">
                  <span className="block text-blue-300 text-sm font-bold tracking-wider mb-2">FEATURED</span>
                  <h3 className="text-2xl font-bold text-white">Gulf Edition</h3>
                </div>
              </div>
              <div className="p-8 md:w-3/5 flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Best Online Tuition for Maths, Science & Coding (Grades 6-12)
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  Discover why parents in UAE, Qatar, and Saudi Arabia trust Brightline for their child's academic success in CBSE and International curriculums.
                </p>
                <a href="/blogs/best-online-science-tuition-uae-gulf" className="text-blue-600 font-bold hover:text-blue-800 inline-flex items-center gap-2">
                  Read Article &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DemoSection />
    </>
  );
}
