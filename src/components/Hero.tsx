import { ArrowDown, Code2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-3s' }} />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 mb-8 reveal">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="text-mono text-muted-foreground ml-4">~/developer/portfolio</span>
          </div>
          
          {/* Main Title */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 reveal">
              <Terminal className="w-6 h-6 text-primary" />
              <span className="text-mono text-primary">init_portfolio.sh</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-light text-foreground text-display reveal-delayed">
              FULL-STACK
              <br />
              <span className="text-primary glow-text">DEVELOPER</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground font-mono max-w-2xl reveal-delayed-2">
              // Building high-performance web applications
              <br />
              // Specializing in React, Node.js, and Cloud Infrastructure
            </p>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 mt-12 reveal-delayed-2">
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 glow">
              <Link to="/projects" className="flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                <span className="text-mono">VIEW_PROJECTS</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-border hover:border-primary hover:text-primary">
              <Link to="/contact" className="text-mono">
                GET_IN_TOUCH
              </Link>
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 pt-8 border-t border-border reveal-delayed-2">
            <div>
              <div className="text-3xl md:text-4xl font-display font-light text-foreground">50+</div>
              <div className="text-mono text-muted-foreground text-xs mt-1">PROJECTS</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-display font-light text-foreground">5+</div>
              <div className="text-mono text-muted-foreground text-xs mt-1">YEARS_EXP</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-display font-light text-foreground">100%</div>
              <div className="text-mono text-muted-foreground text-xs mt-1">COMMITTED</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 reveal-delayed-2">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ArrowDown className="w-4 h-4 animate-bounce" />
          <span className="text-mono text-xs">SCROLL</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;
