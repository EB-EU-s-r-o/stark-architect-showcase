import Navigation from "@/components/Navigation";
import { User, Calendar, MapPin, Coffee } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mb-20 reveal">
            <span className="text-mono text-primary text-sm">// ABOUT_ME</span>
            <h1 className="text-4xl md:text-6xl font-display font-light text-foreground mt-4 text-display">
              THE <span className="text-primary glow-text">DEVELOPER</span>
            </h1>
          </div>
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="space-y-8 reveal-delayed">
              <div className="bg-card border border-border p-8 card-glow">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-5 h-5 text-primary" />
                  <span className="text-mono text-xs text-muted-foreground">BIO</span>
                </div>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  Full-stack developer with 5+ years of experience building scalable web applications
                  and cloud infrastructure. Passionate about clean code and exceptional UX.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border p-6 card-glow">
                  <Calendar className="w-5 h-5 text-primary mb-3" />
                  <div className="text-mono text-xs text-muted-foreground">EXPERIENCE</div>
                  <div className="text-2xl font-display font-light text-foreground mt-1">5+ Years</div>
                </div>
                <div className="bg-card border border-border p-6 card-glow">
                  <MapPin className="w-5 h-5 text-primary mb-3" />
                  <div className="text-mono text-xs text-muted-foreground">LOCATION</div>
                  <div className="text-2xl font-display font-light text-foreground mt-1">Remote</div>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border p-8 card-glow reveal-delayed-2">
              <div className="flex items-center gap-3 mb-6">
                <Coffee className="w-5 h-5 text-primary" />
                <span className="text-mono text-xs text-muted-foreground">SKILLS</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {["React", "TypeScript", "Node.js", "Python", "AWS", "Docker", "PostgreSQL", "GraphQL"].map((skill) => (
                  <span key={skill} className="text-mono text-xs px-3 py-1.5 bg-secondary border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;