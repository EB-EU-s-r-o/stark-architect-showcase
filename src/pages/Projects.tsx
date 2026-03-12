import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { ExternalLink, Github, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import VercelTokenDialog from "@/components/VercelTokenDialog";
import { getSelectedProjects, getScreenshotUrl, type SelectedProject } from "@/lib/vercel";

const hardcodedProjects = [
  {
    title: "Cloud Dashboard",
    description: "Real-time infrastructure monitoring with React and WebSocket integration",
    tech: ["React", "TypeScript", "WebSocket", "TailwindCSS"],
    github: "#",
    live: "#",
    featured: true,
  },
  {
    title: "AI Code Assistant",
    description: "Intelligent code completion powered by machine learning models",
    tech: ["Python", "FastAPI", "OpenAI", "React"],
    github: "#",
    live: "#",
    featured: true,
  },
  {
    title: "E-Commerce Platform",
    description: "Full-stack marketplace with payments and real-time inventory",
    tech: ["Next.js", "Stripe", "PostgreSQL", "Redis"],
    github: "#",
    live: "#",
    featured: true,
  },
  {
    title: "DevOps Pipeline",
    description: "Automated CI/CD pipeline with container orchestration",
    tech: ["Docker", "Kubernetes", "GitHub Actions", "Terraform"],
    github: "#",
  },
  {
    title: "Real-time Chat",
    description: "Scalable messaging platform with end-to-end encryption",
    tech: ["Node.js", "Socket.io", "MongoDB", "Redis"],
    github: "#",
  },
  {
    title: "Analytics Engine",
    description: "High-performance data processing and visualization",
    tech: ["Go", "ClickHouse", "React", "D3.js"],
    github: "#",
  },
];

const Projects = () => {
  const [vercelProjects, setVercelProjects] = useState<SelectedProject[]>([]);

  useEffect(() => {
    setVercelProjects(getSelectedProjects());
  }, []);

  const hasVercel = vercelProjects.length > 0;
  const featuredProjects = hardcodedProjects.filter((p) => p.featured);
  const otherProjects = hardcodedProjects.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="max-w-4xl mb-16 reveal">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-mono text-primary text-sm">// PORTFOLIO</span>
                <h1 className="text-4xl md:text-6xl font-display font-light text-foreground mt-4 text-display">
                  SELECTED
                  <br />
                  <span className="text-primary glow-text">PROJECTS</span>
                </h1>
              </div>
              <VercelTokenDialog onProjectsChange={setVercelProjects} />
            </div>
            <p className="text-muted-foreground font-mono mt-6 max-w-2xl">
              {hasVercel
                ? "Reálne projekty z Vercel platformy."
                : "A collection of projects showcasing expertise in full-stack development, cloud infrastructure, and modern web technologies."}
            </p>
          </div>

          {hasVercel ? (
            /* Vercel Projects Grid */
            <div className="grid md:grid-cols-2 gap-6">
              {vercelProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="group card-glow bg-card border border-border overflow-hidden reveal"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {project.productionUrl && (
                    <div className="aspect-video bg-secondary overflow-hidden">
                      <img
                        src={getScreenshotUrl(project.productionUrl)}
                        alt={project.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-display font-light text-foreground">
                        {project.name}
                      </h3>
                      <div className="flex gap-2">
                        {project.repoUrl && (
                          <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-primary hover:bg-primary/10">
                              <Github className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        {project.productionUrl && (
                          <a href={project.productionUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-primary hover:bg-primary/10">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                    {project.framework && (
                      <span className="text-mono text-xs px-3 py-1 bg-secondary border border-border text-muted-foreground">
                        {project.framework}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Featured Projects */}
              <div className="grid gap-8 mb-20">
                {featuredProjects.map((project, index) => (
                  <div
                    key={project.title}
                    className="group card-glow bg-card border border-border p-8 reveal"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Folder className="w-5 h-5 text-primary" />
                          <span className="text-mono text-xs text-muted-foreground">FEATURED</span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-display font-light text-foreground mb-3">
                          {project.title}
                        </h3>
                        <p className="text-muted-foreground font-mono text-sm mb-4">
                          {project.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {project.tech.map((tech) => (
                            <span
                              key={tech}
                              className="text-mono text-xs px-3 py-1 bg-secondary border border-border text-muted-foreground"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/10">
                          <Github className="w-5 h-5" />
                        </Button>
                        {project.live && (
                          <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/10">
                            <ExternalLink className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Other Projects */}
              <div>
                <h2 className="text-mono text-sm text-muted-foreground mb-8">// OTHER_PROJECTS</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherProjects.map((project, index) => (
                    <div
                      key={project.title}
                      className="group card-glow bg-card border border-border p-6 reveal"
                      style={{ animationDelay: `${(index + 3) * 0.1}s` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <Folder className="w-5 h-5 text-primary" />
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-primary">
                            <Github className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="text-lg font-display font-light text-foreground mb-2">
                        {project.title}
                      </h3>
                      <p className="text-muted-foreground font-mono text-xs mb-4">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {project.tech.slice(0, 3).map((tech) => (
                          <span
                            key={tech}
                            className="text-mono text-[10px] text-muted-foreground"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Projects;
