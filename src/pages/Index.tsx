import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import { Code2, Cloud, Terminal, Cpu } from "lucide-react";
import { Link } from "react-router-dom";

const skills = [
  {
    icon: Code2,
    title: "Frontend",
    description: "React, TypeScript, Next.js, TailwindCSS",
  },
  {
    icon: Terminal,
    title: "Backend",
    description: "Node.js, Python, Go, REST & GraphQL",
  },
  {
    icon: Cloud,
    title: "Cloud",
    description: "AWS, GCP, Docker, Kubernetes",
  },
  {
    icon: Cpu,
    title: "Database",
    description: "PostgreSQL, MongoDB, Redis",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      
      {/* Skills Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 grid-pattern-subtle opacity-20" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="mb-16">
            <span className="text-mono text-primary text-sm">// EXPERTISE</span>
            <h2 className="text-3xl md:text-5xl font-display font-light text-foreground mt-4 text-display">
              TECH <span className="text-primary">STACK</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skills.map((skill, index) => (
              <div
                key={skill.title}
                className="group card-glow bg-card border border-border p-8 reveal"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <skill.icon className="w-8 h-8 text-primary mb-6 group-hover:animate-pulse" />
                <h3 className="text-xl font-display font-light text-foreground mb-3">
                  {skill.title}
                </h3>
                <p className="text-muted-foreground font-mono text-sm">
                  {skill.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 border-t border-border">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <span className="text-mono text-primary text-sm">// READY_TO_BUILD?</span>
            <h2 className="text-3xl md:text-5xl font-display font-light text-foreground mt-4 mb-8 text-display">
              LET'S CREATE
              <br />
              <span className="text-primary glow-text">SOMETHING GREAT</span>
            </h2>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-mono text-primary border border-primary px-8 py-4 hover:bg-primary hover:text-primary-foreground transition-all glow"
            >
              <Terminal className="w-4 h-4" />
              CONTACT_ME
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="text-mono text-xs text-muted-foreground">DEV.FOLIO</span>
            </div>
            <div className="text-mono text-xs text-muted-foreground">
              © 2024 // ALL_RIGHTS_RESERVED
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
