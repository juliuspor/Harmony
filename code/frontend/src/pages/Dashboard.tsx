import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Lightbulb, TrendingUp, ArrowUpDown, Filter } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  title: string;
  goal: string;
  status: "designing" | "collecting" | "synthesizing" | "complete";
  ideasCount: number;
  lastActivity: string;
}

const trendData = [
  { month: "Jun", project1: 12, project2: 15 },
  { month: "Jul", project1: 18, project2: 22 },
  { month: "Aug", project1: 23, project2: 30 },
  { month: "Sep", project1: 20, project2: 35 },
  { month: "Oct", project1: 31, project2: 45 },
];

const mockProjects: Project[] = [
  {
    id: "1",
    title: "Green City Basel",
    goal: "Collecting the best ideas for making Basel more sustainable",
    status: "collecting",
    ideasCount: 23,
    lastActivity: "2 hours ago",
  },
  {
    id: "2",
    title: "Team-Building Adventure",
    goal: "Ideation on the best team-building activities for the next quarter.",
    status: "synthesizing",
    ideasCount: 45,
    lastActivity: "1 day ago",
  },
  {
    id: "3",
    title: "From Chemical Plants to Food Production",
    goal: "Ideating on how to bring together industry professionals from diverse backgrounds?",
    status: "synthesizing",
    ideasCount: 23,
    lastActivity: "3 days ago",
  },
];

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex items-center justify-center gap-6 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects] = useState<Project[]>(mockProjects);
  const [sortBy, setSortBy] = useState<string>("recent");
  const [filterBy, setFilterBy] = useState<string>("all");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-foreground">Harmony</h1>
                <img src="/harmony_logo.png" alt="Harmony Logo" className="h-8 w-8" />
              </div>
              <p className="mt-1 text-muted-foreground">
                Transforming opinions into intelligence
              </p>
            </div>
            <Button onClick={() => navigate("/projects/new")} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create New Project
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Projects
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    {projects.length}
                  </p>
                </div>
                <Lightbulb className="h-12 w-12 text-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Insights Generated
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">12</p>
                </div>
                <TrendingUp className="h-12 w-12 text-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              Your Projects
            </h2>
            <div className="flex gap-3">
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="ideas">Most Ideas</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-all hover:shadow-lg overflow-hidden"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                {project.id === "1" && (
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src="/images/projects/Basel.jpeg" 
                      alt="Basel" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {project.id === "2" && (
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src="/images/projects/teambuilding.jpg" 
                      alt="Team Building" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {project.id === "3" && (
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src="/images/projects/industry.jpeg" 
                      alt="Industry" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{project.title}</CardTitle>
                  <CardDescription className="mt-2 h-10 line-clamp-2">
                    {project.goal}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">
                        {project.ideasCount}
                      </span>
                      <span className="text-muted-foreground">new ideas</span>
                    </div>
                    <span className="text-muted-foreground">
                      {project.lastActivity}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
              Insights
        </h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>
              Ideas collected per project and month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="month" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <RechartsTooltip />
                <Legend iconType="square" content={<CustomLegend />} />
                <Line
                  type="monotone"
                  dataKey="project1"
                  stroke="hsl(0, 70%, 40%)"
                  name="Make Basel Greener"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="project2"
                  stroke="hsl(220, 80%, 45%)"
                  name="Team-Building"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
