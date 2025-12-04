import Navigation from "@/components/Navigation";
import { Cloud as CloudIcon, Server, Database, Shield, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const services = [
  {
    icon: Server,
    title: "Cloud Infrastructure",
    description: "Scalable AWS, GCP, and Azure deployments with infrastructure as code",
  },
  {
    icon: Database,
    title: "Database Solutions",
    description: "PostgreSQL, MongoDB, Redis optimization and management",
  },
  {
    icon: Shield,
    title: "Security & DevOps",
    description: "CI/CD pipelines, container orchestration, and security best practices",
  },
  {
    icon: Zap,
    title: "Performance",
    description: "Edge computing, CDN optimization, and latency reduction",
  },
  {
    icon: Globe,
    title: "Global Deployment",
    description: "Multi-region architecture for worldwide availability",
  },
];

const Cloud = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="max-w-4xl mb-20 reveal">
            <span className="text-mono text-primary text-sm">// CLOUD_SERVICES</span>
            <h1 className="text-4xl md:text-6xl font-display font-light text-foreground mt-4 text-display">
              CLOUD
              <br />
              <span className="text-primary glow-text">SOLUTIONS</span>
            </h1>
            <p className="text-muted-foreground font-mono mt-6 max-w-2xl">
              Enterprise-grade cloud infrastructure and DevOps services.
              From deployment to scaling, I handle the complexity so you can focus on building.
            </p>
          </div>

          {/* Status Banner */}
          <div className="bg-secondary/50 border border-border p-6 mb-16 reveal-delayed">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <CloudIcon className="w-8 h-8 text-primary" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <div className="text-mono text-xs text-muted-foreground">SYSTEM_STATUS</div>
                  <div className="text-foreground font-display">All Systems Operational</div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-mono text-xs text-muted-foreground">
                <span>UPTIME: 99.99%</span>
                <span>LATENCY: &lt;50ms</span>
                <span>REGIONS: 12</span>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            {services.map((service, index) => (
              <div
                key={service.title}
                className="group card-glow bg-card border border-border p-8 reveal"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <service.icon className="w-8 h-8 text-primary mb-6 group-hover:animate-pulse" />
                <h3 className="text-xl font-display font-light text-foreground mb-3">
                  {service.title}
                </h3>
                <p className="text-muted-foreground font-mono text-sm">
                  {service.description}
                </p>
              </div>
            ))}
          </div>

          {/* Tech Stack */}
          <div className="border border-border p-8 bg-card reveal-delayed-2">
            <h2 className="text-mono text-sm text-muted-foreground mb-8">// TECH_STACK</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {["AWS", "GCP", "Docker", "Kubernetes", "Terraform", "GitHub Actions", "PostgreSQL", "Redis", "MongoDB", "Nginx", "CloudFlare", "Vercel"].map((tech) => (
                <div
                  key={tech}
                  className="text-mono text-xs text-center py-3 bg-secondary/50 border border-border hover:border-primary/50 hover:text-primary transition-all"
                >
                  {tech}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-20 reveal-delayed-2">
            <p className="text-muted-foreground font-mono mb-6">
              Ready to scale your infrastructure?
            </p>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 glow">
              <Link to="/contact" className="text-mono">
                START_PROJECT
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Cloud;
