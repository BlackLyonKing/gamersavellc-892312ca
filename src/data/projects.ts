export interface Project {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  category: string;
  screenshot: string;
}

export const projects: Project[] = [
  {
    id: "alpha-swarm",
    name: "Alpha Swarm Terminal",
    description: "Advanced AI-powered crypto trading terminal with real-time market analysis, automated swarm trading strategies, and multi-chain portfolio management.",
    techStack: ["React", "TypeScript", "Web3.js", "AI/ML", "WebSocket", "TradingView API"],
    category: "Web3 / DeFi",
    screenshot: "/screenshots/alpha-swarm.png",
  },
  {
    id: "hklaw",
    name: "H-Klaw App",
    description: "Full-service legal platform with case management, client portals, document automation, and AI-assisted legal research for modern law practices.",
    techStack: ["React", "TypeScript", "Supabase", "AI Agents", "PDF Generation", "Auth"],
    category: "Legal Tech",
    screenshot: "/screenshots/hklaw.png",
  },
  {
    id: "crypto-pos",
    name: "CryptoPOS Chain",
    description: "Blockchain-powered point-of-sale system supporting cryptocurrency payments, inventory tracking, referral programs, and real-time transaction processing.",
    techStack: ["React", "Solana", "Smart Contracts", "POS Integration", "Blockchain", "TypeScript"],
    category: "Web3 / FinTech",
    screenshot: "/screenshots/crypto-pos.png",
  },
  {
    id: "gamers-ave",
    name: "Gamers Ave",
    description: "Decentralized competitive gaming platform where players wager on skill-based matches with blockchain-secured escrow, leaderboards, and tournaments.",
    techStack: ["React", "Solana", "Smart Contracts", "WebSocket", "Escrow System", "TypeScript"],
    category: "Web3 / Gaming",
    screenshot: "/screenshots/gamers-ave.png",
  },
  {
    id: "lion-king",
    name: "Lion King Apparel",
    description: "Premium e-commerce storefront with product catalog, cart system, secure checkout, inventory management, and responsive mobile-first design.",
    techStack: ["React", "TypeScript", "E-Commerce", "Stripe", "Supabase", "Tailwind CSS"],
    category: "E-Commerce",
    screenshot: "/screenshots/lion-king.png",
  },
  {
    id: "soul-food",
    name: "Soul Food Delivered",
    description: "Food delivery platform featuring menu browsing, real-time order tracking, driver management, and integrated payment processing for local restaurants.",
    techStack: ["React", "TypeScript", "Supabase", "Geolocation", "Payment Gateway", "Real-time"],
    category: "Food & Delivery",
    screenshot: "/screenshots/soul-food.png",
  },
  {
    id: "soboba",
    name: "Soboba Sovereign Play",
    description: "Sovereign online casino platform supporting both traditional and cryptocurrency payments with provably fair gaming, live dealers, and rewards systems.",
    techStack: ["React", "Crypto Payments", "RNG Systems", "WebSocket", "Solana", "TypeScript"],
    category: "Web3 / Gaming",
    screenshot: "/screenshots/soboba.png",
  },
  {
    id: "lake-elsinore",
    name: "Lake Elsinore Connect",
    description: "Community engagement platform connecting local residents with events, services, businesses, and city resources in an intuitive social interface.",
    techStack: ["React", "TypeScript", "Supabase", "Maps API", "Auth", "Real-time Chat"],
    category: "Community",
    screenshot: "/screenshots/lake-elsinore.png",
  },
  {
    id: "pursued",
    name: "Pursued Luxury",
    description: "Premium luxury goods marketplace with authentication verification, seller vetting, crypto payments, and curated high-end product discovery.",
    techStack: ["React", "Solana", "E-Commerce", "NFT Verification", "TypeScript", "Web3"],
    category: "Web3 / E-Commerce",
    screenshot: "/screenshots/pursued.png",
  },
  {
    id: "kims-limeade",
    name: "Kim's Limeade",
    description: "Vibrant business website for a local limeade brand featuring product showcases, online ordering, location finder, and brand storytelling.",
    techStack: ["React", "TypeScript", "Responsive Design", "Tailwind CSS", "SEO", "Animations"],
    category: "Business Website",
    screenshot: "/screenshots/kims-limeade.png",
  },
  {
    id: "flavors-fizz",
    name: "Flavors & Fizz Hub",
    description: "Interactive food and beverage discovery platform with recipe sharing, ingredient sourcing, brand partnerships, and community engagement features.",
    techStack: ["React", "TypeScript", "Supabase", "Tailwind CSS", "Auth", "CMS"],
    category: "Food & Beverage",
    screenshot: "/screenshots/flavors-fizz.png",
  },
  {
    id: "bright-fix",
    name: "Bright Fix",
    description: "Home services and repair platform connecting homeowners with verified contractors, featuring booking, estimates, reviews, and project tracking.",
    techStack: ["React", "TypeScript", "Supabase", "Scheduling", "Auth", "Geolocation"],
    category: "Business SaaS",
    screenshot: "/screenshots/bright-fix.png",
  },
];
