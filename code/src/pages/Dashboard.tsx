import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Lightbulb, Users, TrendingUp } from "lucide-react";

interface Project {
  id: string;
  title: string;
  goal: string;
  status: "designing" | "collecting" | "synthesizing" | "complete";
  ideasCount: number;
  lastActivity: string;
}

const mockProjects: Project[] = [
  {
    id: "1",
    title: "Make Basel Greener 🌳",
    goal: "Find the best ideas for making our Basel office more sustainable",
    status: "collecting",
    ideasCount: 23,
    lastActivity: "2 hours ago",
  },
  {
    id: "2",
    title: "Next Team-Building Adventure 🚀",
    goal: "Discover exciting team activities for Q2",
    status: "synthesizing",
    ideasCount: 45,
    lastActivity: "1 day ago",
  },
];

const statusConfig = {
  designing: { label: "Designing", color: "bg-muted text-muted-foreground" },
  collecting: { label: "Collecting Ideas", color: "bg-accent text-accent-foreground" },
  synthesizing: { label: "Synthesizing", color: "bg-primary text-primary-foreground" },
  complete: { label: "Complete", color: "bg-success text-success-foreground" },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects] = useState<Project[]>(mockProjects);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">The Wisdom Hub</h1>
              <p className="mt-1 text-muted-foreground">Transform diverse opinions into clear, actionable wisdom</p>
            </div>
            <Button onClick={() => navigate("/projects/new")} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create New Project
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{projects.length}</p>
                </div>
                <Lightbulb className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Ideas</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    {projects.reduce((sum, p) => sum + p.ideasCount, 0)}
                  </p>
                </div>
                <Users className="h-12 w-12 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Insights Generated</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">12</p>
                </div>
                <TrendingUp className="h-12 w-12 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Your Wisdom Projects</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-all hover:shadow-lg"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{project.title}</CardTitle>
                    <Badge className={statusConfig[project.status].color}>
                      {statusConfig[project.status].label}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">{project.goal}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-primary">{project.ideasCount}</span> new ideas
                    </span>
                    <span className="text-muted-foreground">{project.lastActivity}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
