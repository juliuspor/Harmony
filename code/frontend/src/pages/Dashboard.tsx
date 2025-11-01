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

// Available project images
const PROJECT_IMAGES = [
  "/images/projects/Basel.jpeg",
  "/images/projects/industry.jpeg",
  "/images/projects/teambuilding.jpg",
  "/images/projects/teambuilding.webp",
];

// Function to get a random image
const getRandomImage = (seed: string): string => {
  // Use the campaign ID as a seed for consistent random selection
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PROJECT_IMAGES.length;
  return PROJECT_IMAGES[index];
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
          imageUrl: getRandomImage(campaign.id),
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
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    {totalInsights}
                  </p>
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
            {loading ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Loading campaigns...
              </div>
            ) : projects.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No campaigns yet. Create your first project to get started!
              </div>
            ) : (
              projects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer transition-all hover:shadow-lg overflow-hidden"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={project.imageUrl} 
                      alt={project.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
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
                        {getRelativeTime(project.lastActivityDate)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
              Live Activity Feed
        </h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Ideas submitted by Users
            </CardTitle>
            <CardDescription>
              Real-time feed of ideas submitted across all projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {liveMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                <p>No messages yet. Messages will appear here as they arrive.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scroll-smooth">
                {liveMessages.map((msg, index) => {
                  const isNew = index === 0 && !previousMessageIds.has(msg.id);
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 p-4 rounded-lg border transition-all animate-in slide-in-from-top-2 fade-in duration-500 ${
                        isNew 
                          ? 'border-primary bg-primary/10 hover:bg-primary/15 shadow-lg shadow-primary/20' 
                          : 'border-border bg-muted/30 hover:bg-muted/50'
                      }`}
                      style={{ 
                        animationDelay: `${index * 50}ms`,
                        animationFillMode: 'backwards'
                      }}
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isNew 
                            ? 'bg-primary/20 ring-2 ring-primary animate-pulse' 
                            : 'bg-primary/10 ring-2 ring-primary/20'
                        }`}>
                          <User className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-foreground">
                            Anonymous User
                          </span>
                          {isNew && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium animate-in fade-in">
                              NEW
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-primary font-medium">
                            {msg.project_name}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {msg.timestamp ? getRelativeTime(msg.timestamp) : "just now"}
                          </span>
                        </div>
                        <p className="text-sm text-foreground break-words leading-relaxed">
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
