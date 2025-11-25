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
  return "/images/projects/adobe_sneaker.jpg";
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

const SlackIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 124 124"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M26.3996 78.3998C26.3996 84.8998 21.0996 90.1998 14.5996 90.1998C8.09961 90.1998 2.79961 84.8998 2.79961 78.3998C2.79961 71.8998 8.09961 66.5998 14.5996 66.5998H26.3996V78.3998Z"
      fill="#E01E5A"
    />
    <path
      d="M32.2998 78.3998C32.2998 71.8998 37.5998 66.5998 44.0998 66.5998C50.5998 66.5998 55.8998 71.8998 55.8998 78.3998V109.6C55.8998 116.1 50.5998 121.4 44.0998 121.4C37.5998 121.4 32.2998 116.1 32.2998 109.6V78.3998Z"
      fill="#E01E5A"
    />
    <path
      d="M44.0998 26.3998C37.5998 26.3998 32.2998 21.0998 32.2998 14.5998C32.2998 8.09981 37.5998 2.79981 44.0998 2.79981C50.5998 2.79981 55.8998 8.09981 55.8998 14.5998V26.3998H44.0998Z"
      fill="#36C5F0"
    />
    <path
      d="M44.0998 32.2998C50.5998 32.2998 55.8998 37.5998 55.8998 44.0998C55.8998 50.5998 50.5998 55.8998 44.0998 55.8998H12.7998C6.29981 55.8998 0.999805 50.5998 0.999805 44.0998C0.999805 37.5998 6.29981 32.2998 12.7998 32.2998H44.0998Z"
      fill="#36C5F0"
    />
    <path
      d="M97.5996 44.0998C97.5996 37.5998 102.9 32.2998 109.4 32.2998C115.9 32.2998 121.2 37.5998 121.2 44.0998C121.2 50.5998 115.9 55.8998 109.4 55.8998H97.5996V44.0998Z"
      fill="#2EB67D"
    />
    <path
      d="M91.6998 44.0998C91.6998 50.5998 86.3998 55.8998 79.8998 55.8998C73.3998 55.8998 68.0998 50.5998 68.0998 44.0998V12.7998C68.0998 6.29981 73.3998 0.999805 79.8998 0.999805C86.3998 0.999805 91.6998 6.29981 91.6998 12.7998V44.0998Z"
      fill="#2EB67D"
    />
    <path
      d="M79.8998 97.5998C86.3998 97.5998 91.6998 102.9 91.6998 109.4C91.6998 115.9 86.3998 121.2 79.8998 121.2C73.3998 121.2 68.0998 115.9 68.0998 109.4V97.5998H79.8998Z"
      fill="#ECB22E"
    />
    <path
      d="M79.8998 91.6998C73.3998 91.6998 68.0998 86.3998 68.0998 79.8998C68.0998 73.3998 73.3998 68.0998 79.8998 68.0998H111.2C117.7 68.0998 123 73.3998 123 79.8998C123 86.3998 117.7 91.6998 111.2 91.6998H79.8998Z"
      fill="#ECB22E"
    />
  </svg>
);

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
    <div className="min-h-screen bg-[#1E1E1E]">
      <header className="bg-[#1E1E1E] backdrop-blur-sm sticky top-0 z-50 h-14">
        <div className="px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="flex items-center gap-3"
            >
              <img src="/images/adobe-logo.svg" alt="Adobe Logo" className="h-7 w-7" />
              <h1 className="text-xl font-semibold text-white">Adobe Harmony</h1>
            </motion.div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/10"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              className="h-9 px-4 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10"
            >
              Sign in
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full bg-[#1E1E1E] min-h-screen px-3">
        <div
          className="w-full rounded-t-2xl px-32 py-24 min-h-screen relative bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/images/bg.webp)" }}
        >
          <div className="mb-12 relative z-10">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-foreground tracking-tight">
                    Your Campaigns
                  </h2>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-medium px-2 py-0.5 bg-secondary/50"
                  >
                    AI-Powered
                  </Badge>
                </div>
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
                  className="col-span-full"
                >
                  <Card className="bg-card/95 backdrop-blur-sm rounded-3xl shadow-xl">
                    <CardContent className="text-center py-20">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="inline-block mb-4"
                      >
                        <Sparkles className="h-12 w-12 text-primary" />
                      </motion.div>
                      <p className="text-muted-foreground font-medium">Loading campaigns...</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : projects.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-2 border-dashed rounded-3xl bg-card/95 backdrop-blur-sm">
                    <CardContent className="text-center py-20">
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-6">
                        <Target className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">No Campaigns Yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Get started by creating your first campaign to collect and analyze community
                        ideas
                      </p>
                      <Button onClick={() => navigate("/projects/new")} size="lg">
                        <Plus className="mr-2 h-5 w-5" />
                        Create Your First Campaign
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
                          className="group cursor-pointer transition-all duration-300 hover:shadow-2xl overflow-hidden border-2 rounded-3xl bg-card/95 backdrop-blur-sm hover:border-primary/50 h-full"
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
                              <div className="px-4 py-2 rounded-full bg-slate-900/90 text-white border border-white/10 backdrop-blur-md text-sm font-semibold flex items-center gap-2 shadow-lg shadow-black/40">
                                <Lightbulb className="h-4 w-4 text-amber-500" strokeWidth={2.5} />
                                <span className="text-base font-bold leading-none">
                                  {project.ideasCount}
                                </span>
                                <span className="text-[11px] font-medium text-white/70 uppercase tracking-[0.2em]">
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
                  <p className="font-medium text-sm">
                    Community ideas will appear here in real-time
                  </p>
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
                                  ? "bg-white/10 backdrop-blur-sm"
                                  : "bg-white/5"
                              }`}
                              whileHover={{ scale: 1.05, rotate: 5 }}
                            >
                              <SlackIcon className={`h-7 w-7 ${isNew ? "" : "opacity-70"}`} />
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
        </div>
      </main>
    </div>
  );
}
