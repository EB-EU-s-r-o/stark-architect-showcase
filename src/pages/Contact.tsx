import Navigation from "@/components/Navigation";
import { Mail, Github, Linkedin, Twitter, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Message sent!", description: "I'll get back to you soon." });
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mb-20 reveal">
            <span className="text-mono text-primary text-sm">// GET_IN_TOUCH</span>
            <h1 className="text-4xl md:text-6xl font-display font-light text-foreground mt-4 text-display">
              LET'S <span className="text-primary glow-text">CONNECT</span>
            </h1>
          </div>
          <div className="grid lg:grid-cols-2 gap-16">
            <form onSubmit={handleSubmit} className="space-y-6 reveal-delayed">
              <div>
                <label className="text-mono text-xs text-muted-foreground block mb-2">NAME</label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-secondary border-border focus:border-primary text-foreground font-mono" required />
              </div>
              <div>
                <label className="text-mono text-xs text-muted-foreground block mb-2">EMAIL</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-secondary border-border focus:border-primary text-foreground font-mono" required />
              </div>
              <div>
                <label className="text-mono text-xs text-muted-foreground block mb-2">MESSAGE</label>
                <Textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="bg-secondary border-border focus:border-primary text-foreground font-mono min-h-[150px]" required />
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow">
                <Send className="w-4 h-4 mr-2" /><span className="text-mono">SEND_MESSAGE</span>
              </Button>
            </form>
            <div className="space-y-4 reveal-delayed-2">
              {[{ icon: Github, label: "GitHub" }, { icon: Linkedin, label: "LinkedIn" }, { icon: Twitter, label: "Twitter" }, { icon: Mail, label: "Email" }].map((s) => (
                <a key={s.label} href="#" className="flex items-center gap-4 p-4 bg-card border border-border hover:border-primary/50 hover:text-primary transition-all card-glow">
                  <s.icon className="w-5 h-5 text-primary" />
                  <span className="text-mono text-sm text-foreground">{s.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;