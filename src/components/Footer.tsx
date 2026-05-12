import logo from "@/assets/logo.png";
import { Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Gamers Ave LLC Logo" className="w-10 h-10 object-contain" />
          <span className="font-display text-lg font-bold gradient-text">GAMERS AVE</span>
          <span className="text-muted-foreground text-sm">LLC</span>
        </div>
        <a
          href="tel:+19517990593"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-sm transition-colors"
        >
          <Phone className="w-4 h-4" />
          (951) 799-0593
        </a>
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} Gamers Ave LLC. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
