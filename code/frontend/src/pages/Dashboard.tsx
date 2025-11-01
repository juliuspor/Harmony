import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Lightbulb, TrendingUp, ArrowUpDown, Filter, MessageSquare, User } from "lucide-react";
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
  lastActivityDate: string; // ISO date string
  imageUrl: string;
}

const trendData = [
  { month: "Jun", project1: 12, project2: 15 },
  { month: "Jul", project1: 18, project2: 22 },
  { month: "Aug", project1: 23, project2: 30 },
  { month: "Sep", project1: 20, project2: 35 },
  { month: "Oct", project1: 31, project2: 45 },
];

// Use Basel image for all projects
const getProjectImage = (): string => {
  return "/images/projects/Basel.jpeg";
};

// Function to calculate relative time
const getRelativeTime = (isoDate: string): string => {
  const now = new Date();
  // Ensure the ISO date is treated as UTC by appending 'Z' if not present
  const dateString = isoDate.endsWith('Z') ? isoDate : `${isoDate}Z`;
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins === 0) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
};


export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("recent");
  const [filterBy, setFilterBy] = useState<string>("all");
  const [totalInsights, setTotalInsights] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [previousMessageIds, setPreviousMessageIds] = useState<Set<string>>(new Set());

  // Fetch campaigns from backend
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch("http://localhost:8000/campaigns");
        const data = await response.json();
        
        // Transform backend campaigns to frontend projects
        const transformedProjects: Project[] = data.campaigns.map((campaign: any) => ({
          id: campaign.id,
          title: campaign.project_name,
          goal: campaign.project_goal,
          status: "collecting" as const, // Default status, can be enhanced later
          ideasCount: 0, // Will be fetched from submissions endpoint
          lastActivityDate: campaign.created_at || new Date().toISOString(),
          imageUrl: getProjectImage(),
        }));
        
        // Fetch submission counts for each project
        const projectsWithCounts = await Promise.all(
          transformedProjects.map(async (project) => {
            try {
              const submissionsResponse = await fetch(
                `http://localhost:8000/submissions?project_id=${project.id}`
              );
              const submissionsData = await submissionsResponse.json();
              return {
                ...project,
                ideasCount: submissionsData.count || 0,
              };
            } catch (error) {
              console.error(`Failed to fetch submissions for project ${project.id}:`, error);
              return project;
            }
          })
        );
        
        setProjects(projectsWithCounts);
        
        // Calculate total insights from campaign data (no expensive API calls)
        const totalThemes = data.campaigns.reduce((sum: number, campaign: any) => {
          return sum + (campaign.num_clusters || 0);
        }, 0);
        setTotalInsights(totalThemes);
      } catch (error) {
        console.error("Failed to fetch campaigns:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  // Update current time every minute to keep relative times fresh
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch live messages feed
  useEffect(() => {
    const fetchLiveMessages = async () => {
      try {
        const response = await fetch("http://localhost:8000/live-feed?limit=20");
        const data = await response.json();
        const messages = data.messages || [];
        
        // Track which messages are new
        const newMessageIds = new Set<string>(messages.map((m: any) => m.id));
        setPreviousMessageIds(newMessageIds);
        
        setLiveMessages(messages);
      } catch (error) {
        console.error("Failed to fetch live messages:", error);
      }
    };

    // Initial fetch
    fetchLiveMessages();

    // Refresh every 2 seconds for real-time updates
    const interval = setInterval(fetchLiveMessages, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-border bg-card shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Harmony</h1>
                <img src="/harmony_logo.png" alt="Harmony Logo" className="h-8 w-8" />
              </div>
              <div className="flex items-center gap-6">
                <p className="text-sm text-muted-foreground font-medium">
                  Transforming community opinions into collective intelligence
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground font-medium">
                    <span className="text-foreground font-bold text-base">{projects.length}</span> active
                  </span>
                  <span className="text-muted-foreground font-bold">•</span>
                  <span className="text-muted-foreground font-medium">
                    <span className="text-foreground font-bold text-base">{totalInsights}</span> insights
                  </span>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => navigate("/projects/new")} 
              size="lg"
              className="font-semibold"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-8 py-12">
        <div className="mb-12">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-3xl font-semibold text-foreground tracking-tight">
              Your projects
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
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                Loading campaigns...
              </div>
            ) : projects.length === 0 ? (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                No campaigns yet. Create your first project to get started!
              </div>
            ) : (
              projects.map((project) => (
                <Card
                  key={project.id}
                  className="group cursor-pointer transition-all duration-300 hover:shadow-2xl overflow-hidden border-2 rounded-2xl bg-card hover:border-primary/50"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="relative w-full h-48 overflow-hidden">
                    <img 
                      src={project.imageUrl} 
                      alt={project.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 right-4">
                      <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-xs font-semibold text-foreground flex items-center gap-1.5 shadow-lg">
                        <Lightbulb className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                        {project.ideasCount}
                      </div>
                    </div>
                  </div>
                  <CardHeader className="pb-3 pt-5">
                    <CardTitle className="text-xl font-bold tracking-tight">
                      {project.title}
                    </CardTitle>
                    <CardDescription className="mt-2 line-clamp-2 text-sm leading-relaxed">
                      {project.goal}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-5">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        Active
                      </span>
                      <span>
                        {getRelativeTime(project.lastActivityDate)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-semibold text-foreground tracking-tight">
            Live activity
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        </div>
        <Card className="border-2 rounded-2xl overflow-hidden bg-card">
          <CardContent className="p-0">
            {liveMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                <p className="font-medium">No messages yet. Ideas will appear here as they arrive.</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {liveMessages.map((msg, index) => {
                  const isNew = index === 0 && !previousMessageIds.has(msg.id);
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-4 px-6 py-5 border-b last:border-b-0 transition-all ${
                        isNew 
                          ? 'bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary' 
                          : 'hover:bg-muted/50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex-shrink-0 pt-0.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isNew ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <User className={`h-4 w-4 ${isNew ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={2} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-sm text-foreground">
                            Anonymous
                          </span>
                          {isNew && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500 text-white font-bold">
                              NEW
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {msg.timestamp ? getRelativeTime(msg.timestamp) : "just now"}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto truncate max-w-[200px] font-medium">
                            {msg.project_name}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
