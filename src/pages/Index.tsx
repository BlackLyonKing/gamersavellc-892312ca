import Seo from "@/components/Seo";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import AIPackagesSection from "@/components/AIPackagesSection";
import ProjectsSection from "@/components/ProjectsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Gamers Ave LLC — AI Agents, SEO & Web3 Development"
        description="Gamers Ave LLC builds AI agents, voice concierge systems, SEO/AEO strategies, and Web3 platforms for growing businesses."
        path="/"
      />
      <HeroSection />
      <ServicesSection />
      <AIPackagesSection />
      <ProjectsSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
