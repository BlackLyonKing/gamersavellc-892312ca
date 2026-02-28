export interface Project {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  category: string;
  url?: string;
}

export const projects: Project[] = [
  {
    id: "alpha-swarm",
    name: "Alpha Swarm Terminal",
    description: "Advanced AI-powered crypto trading terminal with real-time market analysis, automated swarm trading strategies, and multi-chain portfolio management.",
    techStack: ["React", "TypeScript", "Web3.js", "AI/ML", "WebSocket", "TradingView API"],
    category: "Web3 / DeFi",
    url: "https://lionstradingswarm.lovable.app",
  },
  {
    id: "hklaw",
    name: "H-Klaw App",
    description: "Full-service legal platform with case management, client portals, document automation, and AI-assisted legal research for modern law practices.",
    techStack: ["React", "TypeScript", "Supabase", "AI Agents", "PDF Generation", "Auth"],
    category: "Legal Tech",
    url: "https://hklaws.lovable.app",
  },
  {
    id: "crypto-pos",
    name: "CryptoPOS Chain",
    description: "Blockchain-powered point-of-sale system supporting cryptocurrency payments, inventory tracking, referral programs, and real-time transaction processing.",
    techStack: ["React", "Solana", "Smart Contracts", "POS Integration", "Blockchain", "TypeScript"],
    category: "Web3 / FinTech",
    url: "https://chain-stock-pos.lovable.app",
  },
  {
    id: "gamers-ave",
    name: "Gamers Ave",
    description: "Decentralized competitive gaming platform where players wager on skill-based matches with blockchain-secured escrow, leaderboards, and tournaments.",
    techStack: ["React", "Solana", "Smart Contracts", "WebSocket", "Escrow System", "TypeScript"],
    category: "Web3 / Gaming",
    url: "https://duel-masters-suite.lovable.app",
  },
  {
    id: "lion-king",
    name: "Lion King Apparel",
    description: "Premium e-commerce storefront with product catalog, cart system, secure checkout, inventory management, and responsive mobile-first design.",
    techStack: ["React", "TypeScript", "E-Commerce", "Stripe", "Supabase", "Tailwind CSS"],
    category: "E-Commerce",
    url: "https://blacklionkingclothes.lovable.app",
  },
  {
    id: "soul-food",
    name: "Soul Food Delivered",
    description: "Food delivery platform featuring menu browsing, real-time order tracking, driver management, and integrated payment processing for local restaurants.",
    techStack: ["React", "TypeScript", "Supabase", "Geolocation", "Payment Gateway", "Real-time"],
    category: "Food & Delivery",
    url: "https://therealgehttokitchen.lovable.app",
  },
  {
    id: "soboba",
    name: "Soboba Sovereign Play",
    description: "Sovereign online casino platform supporting both traditional and cryptocurrency payments with provably fair gaming, live dealers, and rewards systems.",
    techStack: ["React", "Crypto Payments", "RNG Systems", "WebSocket", "Solana", "TypeScript"],
    category: "Web3 / Gaming",
    url: "https://tribal-nexus-play.lovable.app",
  },
  {
    id: "lake-elsinore",
    name: "Lake Elsinore Connect",
    description: "Community engagement platform connecting local residents with events, services, businesses, and city resources in an intuitive social interface.",
    techStack: ["React", "TypeScript", "Supabase", "Maps API", "Auth", "Real-time Chat"],
    category: "Community",
    url: "https://dreamextreme.lovable.app",
  },
  {
    id: "barber-plus",
    name: "Barber Plus Pay",
    description: "All-in-one barbershop management app with appointment booking, on-the-spot payments, client profiles, and queue management for modern barbers.",
    techStack: ["React", "TypeScript", "Supabase", "Payment Processing", "Scheduling", "Auth"],
    category: "Business SaaS",
    url: "https://barber-plus-pay.lovable.app",
  },
  {
    id: "school-dao",
    name: "School DAO",
    description: "Decentralized education platform with DAO governance, interactive learning modules, token-based incentives, and community-driven curriculum management.",
    techStack: ["React", "Solana", "DAO Governance", "Smart Contracts", "TypeScript", "Web3"],
    category: "Web3 / EdTech",
    url: "https://school-aiview.lovable.app",
  },
  {
    id: "blk-health",
    name: "BLK Health",
    description: "Health and wellness platform with personalized tracking, community support, fitness plans, and telehealth integration for holistic wellness management.",
    techStack: ["React", "TypeScript", "Supabase", "Health APIs", "Charts", "Auth"],
    category: "HealthTech",
    url: "https://black-lyon-health.lovable.app",
  },
  {
    id: "pursued",
    name: "Pursued Luxury",
    description: "Premium luxury goods marketplace with authentication verification, seller vetting, crypto payments, and curated high-end product discovery.",
    techStack: ["React", "Solana", "E-Commerce", "NFT Verification", "TypeScript", "Web3"],
    category: "Web3 / E-Commerce",
    url: "https://pursued-luxury-solana.lovable.app",
  },
  {
    id: "bitcoin-dash",
    name: "Bitcoin Insight Dashboard",
    description: "Real-time Bitcoin mining monitoring dashboard tracking pool fees, hashrate, revenue analytics, electricity costs, and profitability optimization.",
    techStack: ["React", "TypeScript", "Recharts", "Blockchain APIs", "WebSocket", "Data Viz"],
    category: "Crypto / Analytics",
    url: "https://bitcoin-insight-dash.lovable.app",
  },
  {
    id: "kims-limeade",
    name: "Kim's Limeade",
    description: "Vibrant business website for a local limeade brand featuring product showcases, online ordering, location finder, and brand storytelling.",
    techStack: ["React", "TypeScript", "Responsive Design", "Tailwind CSS", "SEO", "Animations"],
    category: "Business Website",
    url: "https://kimlemonade.lovable.app",
  },
  {
    id: "flavors-fizz",
    name: "Flavors & Fizz Hub",
    description: "Interactive food and beverage discovery platform with recipe sharing, ingredient sourcing, brand partnerships, and community engagement features.",
    techStack: ["React", "TypeScript", "Supabase", "Tailwind CSS", "Auth", "CMS"],
    category: "Food & Beverage",
    url: "https://flavorandfizz.lovable.app",
  },
  {
    id: "bright-fix",
    name: "Bright Fix",
    description: "Home services and repair platform connecting homeowners with verified contractors, featuring booking, estimates, reviews, and project tracking.",
    techStack: ["React", "TypeScript", "Supabase", "Scheduling", "Auth", "Geolocation"],
    category: "Business SaaS",
    url: "https://bright-buddy-fix.lovable.app",
  },
];
