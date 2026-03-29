import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main
      style={{
        background: "#000000",
        height: "100vh",
        overflowX: "hidden",
        overflowY: "auto",
        fontFamily: "'Sora', -apple-system, sans-serif",
        color: "#fff",
      }}
    >
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}
