export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  link?: {
    type: string;
    repo: string;
  };
  latestDeployments?: Array<{
    url: string;
    alias?: string[];
    readyState: string;
  }>;
  targets?: {
    production?: {
      alias?: string[];
      url?: string;
    };
  };
  updatedAt: number;
}

export interface SelectedProject {
  id: string;
  name: string;
  framework: string | null;
  productionUrl: string | null;
  repoUrl: string | null;
  updatedAt: number;
}

const VERCEL_TOKEN_KEY = "vercel_api_token";
const SELECTED_PROJECTS_KEY = "vercel_selected_projects";

export function getVercelToken(): string | null {
  return localStorage.getItem(VERCEL_TOKEN_KEY);
}

export function setVercelToken(token: string): void {
  localStorage.setItem(VERCEL_TOKEN_KEY, token);
}

export function clearVercelToken(): void {
  localStorage.removeItem(VERCEL_TOKEN_KEY);
  localStorage.removeItem(SELECTED_PROJECTS_KEY);
}

export function getSelectedProjects(): SelectedProject[] {
  const stored = localStorage.getItem(SELECTED_PROJECTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function setSelectedProjects(projects: SelectedProject[]): void {
  localStorage.setItem(SELECTED_PROJECTS_KEY, JSON.stringify(projects));
}

export async function fetchVercelProjects(token: string): Promise<VercelProject[]> {
  const res = await fetch("https://api.vercel.com/v9/projects?limit=100", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(res.status === 403 || res.status === 401 ? "Neplatný token" : "Chyba pri načítaní projektov");
  }

  const data = await res.json();
  return data.projects || [];
}

export function getProductionUrl(project: VercelProject): string | null {
  const alias = project.targets?.production?.alias?.[0];
  if (alias) return `https://${alias}`;
  
  const deployment = project.latestDeployments?.find(d => d.readyState === "READY");
  if (deployment?.alias?.[0]) return `https://${deployment.alias[0]}`;
  if (deployment?.url) return `https://${deployment.url}`;
  
  return null;
}

export function getScreenshotUrl(url: string): string {
  return `https://v1.screenshot.11ty.dev/${encodeURIComponent(url)}/opengraph/`;
}

export function getRepoUrl(project: VercelProject): string | null {
  if (project.link?.type === "github" && project.link.repo) {
    return `https://github.com/${project.link.repo}`;
  }
  return null;
}

export function toSelectedProject(project: VercelProject): SelectedProject {
  return {
    id: project.id,
    name: project.name,
    framework: project.framework,
    productionUrl: getProductionUrl(project),
    repoUrl: getRepoUrl(project),
    updatedAt: project.updatedAt,
  };
}
