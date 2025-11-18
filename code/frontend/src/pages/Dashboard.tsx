import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Lightbulb, ArrowUpDown, MessageSquare, Sparkles, Target } from "lucide-react";
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

interface LiveMessage {
  id: string;
  message: string;
  project_id: string;
  project_name: string;
  timestamp: string;
  user_id?: string;
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
  const dateString = isoDate.endsWith("Z") ? isoDate : `${isoDate}Z`;
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins === 0) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("recent");
  const [totalInsights, setTotalInsights] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
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

    // Refresh every 500ms for real-time updates
    const interval = setInterval(fetchLiveMessages, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <img src="/images/adobe-logo.svg" alt="Adobe Logo" className="h-12 w-12" />
              </motion.div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-foreground tracking-tight">Harmony</h1>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    AI-Powered
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Transforming community opinions into collective intelligence
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate("/projects/new")}
              size="lg"
              className="h-12 px-6 font-semibold"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-8 py-12 relative z-10">
        <div className="mb-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2">
                Your Projects
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage and monitor your active campaigns
              </p>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] border-2">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="ideas">Most Ideas</SelectItem>
                <SelectItem value="name">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full text-center py-20"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="inline-block mb-4"
                >
                  <Sparkles className="h-12 w-12 text-primary" />
                </motion.div>
                <p className="text-muted-foreground font-medium">Loading campaigns...</p>
              </motion.div>
            ) : projects.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2 border-dashed rounded-3xl bg-muted/20">
                  <CardContent className="text-center py-20">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-6">
                      <Target className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">No Projects Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Get started by creating your first project to collect and analyze community
                      ideas
                    </p>
                    <Button onClick={() => navigate("/projects/new")} size="lg">
                      <Plus className="mr-2 h-5 w-5" />
                      Create Your First Project
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {[...projects]
                  .sort((a, b) => {
                    switch (sortBy) {
                      case "recent":
                        return (
                          new Date(b.lastActivityDate).getTime() -
                          new Date(a.lastActivityDate).getTime()
                        );
                      case "ideas":
                        return b.ideasCount - a.ideasCount;
                      case "name":
                        return a.title.localeCompare(b.title);
                      default:
                        return 0;
                    }
                  })
                  .map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                      <Card
                        className="group cursor-pointer transition-all duration-300 hover:shadow-2xl overflow-hidden border-2 rounded-3xl bg-card hover:border-primary/50 h-full"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div className="relative w-full h-52 overflow-hidden">
                          <img
                            src={project.imageUrl}
                            alt={project.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                          {/* Floating Stats */}
                          <motion.div
                            className="absolute bottom-4 right-4"
                            whileHover={{ scale: 1.05 }}
                          >
                            <div className="px-4 py-2 rounded-full bg-white/95 backdrop-blur-md text-sm font-bold text-foreground flex items-center gap-2 shadow-xl">
                              <Lightbulb className="h-4 w-4 text-amber-500" strokeWidth={2.5} />
                              {project.ideasCount}
                              <span className="text-xs font-normal text-muted-foreground">
                                ideas
                              </span>
                            </div>
                          </motion.div>

                          {/* Status Badge */}
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-green-500/90 backdrop-blur-sm text-white border-0 shadow-lg">
                              <div className="h-2 w-2 rounded-full bg-white animate-pulse mr-2" />
                              Active
                            </Badge>
                          </div>
                        </div>

                        <CardHeader className="pb-3 pt-6">
                          <CardTitle className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
                            {project.title}
                          </CardTitle>
                          <CardDescription className="mt-2 line-clamp-2 text-sm leading-relaxed">
                            {project.goal}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="pb-6">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium">
                              Updated {getRelativeTime(project.lastActivityDate)}
                            </span>
                            <motion.div
                              className="text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                              whileHover={{ x: 5 }}
                            >
                              View →
                            </motion.div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Live Activity Feed */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2">
              Live Activity Feed
            </h2>
            <p className="text-sm text-muted-foreground">
              Real-time community contributions across all projects
            </p>
          </div>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-2"
          >
            <Badge className="bg-green-500 text-white border-0 shadow-lg">
              <div className="h-2 w-2 rounded-full bg-white animate-pulse mr-2" />
              Live
            </Badge>
          </motion.div>
        </div>

        <Card className="border-2 rounded-3xl overflow-hidden bg-card/95 backdrop-blur-sm shadow-xl">
          <CardContent className="p-0">
            {liveMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6">
                  <MessageSquare className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">No Activity Yet</h3>
                <p className="font-medium text-sm">Community ideas will appear here in real-time</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <AnimatePresence initial={false}>
                  {liveMessages.map((msg, index) => {
                    const isNew = index === 0 && !previousMessageIds.has(msg.id);
                    return (
                      <motion.div
                        key={msg.id}
                        initial={
                          isNew
                            ? { opacity: 0, x: -20, backgroundColor: "rgba(var(--primary), 0.1)" }
                            : false
                        }
                        animate={{ opacity: 1, x: 0, backgroundColor: "transparent" }}
                        transition={{ duration: 0.5 }}
                        className={`flex gap-4 px-6 py-5 border-b last:border-b-0 transition-all ${
                          isNew
                            ? "bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary"
                            : "hover:bg-muted/30 border-l-4 border-l-transparent"
                        }`}
                      >
                        <div className="flex-shrink-0 pt-0.5">
                          <motion.div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                              isNew
                                ? "bg-gradient-to-br from-[#5865F2]/20 to-[#5865F2]/10"
                                : "bg-[#5865F2]/10"
                            }`}
                            whileHover={{ scale: 1.05, rotate: 5 }}
                          >
                            <svg
                              className={`h-5 w-5 ${isNew ? "text-[#5865F2]" : "text-[#5865F2]/70"}`}
                              viewBox="0 0 127.14 96.36"
                              fill="currentColor"
                            >
                              <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" />
                            </svg>
                          </motion.div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">
                              {msg.user_id || "Anonymous"}
                            </span>
                            {isNew && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white font-bold shadow-sm"
                              >
                                NEW
                              </motion.span>
                            )}
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground font-medium">
                              {msg.timestamp ? getRelativeTime(msg.timestamp) : "just now"}
                            </span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {msg.project_name}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">{msg.message}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
