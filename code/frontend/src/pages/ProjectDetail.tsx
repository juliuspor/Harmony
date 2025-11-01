import { useState, useRef, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, Network, Users } from "lucide-react";
import { DebateSimulation } from "@/components/DebateSimulation";
import type { ConsensusResult } from "@/components/DebateSimulation";
import { createDebate, estimateDebateDuration } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Interfaces
interface ClusterVisualizationData {
  id: number;
  theme: string;
  summary: string;
  gradient: { from: string; to: string; accent: string };
  ideas: { text: string }[];
}

// Modern gradient color palette for clusters
const CLUSTER_GRADIENTS = [
  { from: "#667eea", to: "#764ba2", accent: "#667eea" }, // Purple
  { from: "#f093fb", to: "#f5576c", accent: "#f093fb" }, // Pink
  { from: "#4facfe", to: "#00f2fe", accent: "#4facfe" }, // Cyan
  { from: "#43e97b", to: "#38f9d7", accent: "#43e97b" }, // Green
  { from: "#fa709a", to: "#fee140", accent: "#fa709a" }, // Coral
  { from: "#30cfd0", to: "#330867", accent: "#30cfd0" }, // Teal-Purple
];

function extractTheme(ideas: string[]): string {
  if (ideas.length === 0) return "Group";
  const first = ideas[0];
  const words = first.split(" ").slice(0, 4).join(" ");
  return (
    words.charAt(0).toUpperCase() +
    words.slice(1) +
    (first.split(" ").length > 4 ? "..." : "")
  );
}

function transformClustersToVisualization(
  clusters: string[][],
  titles?: string[],
  summaries?: string[]
): ClusterVisualizationData[] {
  return clusters.map((ideas, index) => ({
    id: index + 1,
    theme: titles && titles[index] ? titles[index] : extractTheme(ideas),
    summary: summaries && summaries[index] ? summaries[index] : "",
    gradient: CLUSTER_GRADIENTS[index % CLUSTER_GRADIENTS.length],
    ideas: ideas.map((text) => ({ text })),
  }));
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ConsensusResult | null>(
    null
  );
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(
    new Set()
  );
  const [debateId, setDebateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("clusters");
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>(
    undefined
  );
  const loadingSectionRef = useRef<HTMLDivElement>(null);
  const synthesizeSectionRef = useRef<HTMLDivElement>(null);
  const [project, setProject] = useState<any>(null);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [clustersData, setClustersData] = useState<any>(null);
  const [clustersLoading, setClustersLoading] = useState(true);
  const [contributorsCount, setContributorsCount] = useState(0);

  // Fetch project data from backend
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        // Fetch all campaigns
        const campaignsResponse = await fetch(
          "http://localhost:8000/campaigns"
        );
        const campaignsData = await campaignsResponse.json();

        // Find the campaign with matching ID
        const campaign = campaignsData.campaigns.find((c: any) => c.id === id);

        if (campaign) {
          // Set project immediately to show page structure
          setProject({
            id: campaign.id,
            title: campaign.project_name,
            goal: campaign.project_goal,
            status: "collecting",
          });

          // Fetch submissions count (non-blocking)
          fetch(`http://localhost:8000/submissions?project_id=${id}`)
            .then((res) => res.json())
            .then((data) => setSubmissionsCount(data.count || 0))
            .catch((error) =>
              console.error("Failed to fetch submissions:", error)
            );

          // Fetch clusters if available (non-blocking)
          fetch(`http://localhost:8000/projects/${id}/clusters`)
            .then((res) => {
              if (res.ok) return res.json();
              throw new Error("No clusters yet");
            })
            .then((clustersResult) => {
              setClustersData(clustersResult);
              // Update campaign with cluster count (fire and forget)
              fetch(
                `http://localhost:8000/campaigns/${id}/clusters?num_clusters=${clustersResult.num_clusters}`,
                {
                  method: "PATCH",
                }
              ).catch((err) =>
                console.log("Failed to update campaign cluster count:", err)
              );
            })
            .catch((error) => console.log("No clusters available yet:", error))
            .finally(() => setClustersLoading(false));

          // Fetch contributors count (non-blocking)
          fetch(`http://localhost:8000/projects/${id}/contributors`)
            .then((res) => {
              if (res.ok) return res.json();
              throw new Error("Failed to fetch contributors");
            })
            .then((contributorsResult) =>
              setContributorsCount(contributorsResult.contributors || 0)
            )
            .catch((error) =>
              console.log("Failed to fetch contributors:", error)
            );
        } else {
          console.error("Campaign not found");
          // Navigate back to dashboard if project not found
          navigate("/");
        }
      } catch (error) {
        console.error("Failed to fetch project data:", error);
        navigate("/");
      }
    };

    if (id) {
      fetchProjectData();
    }
  }, [id, navigate]);

  // Use actual clusters data if available, otherwise show empty state
  const clusterData = useMemo(() => {
    if (clustersData && clustersData.clusters) {
      return transformClustersToVisualization(
        clustersData.clusters,
        clustersData.titles,
        clustersData.summaries
      );
    }
    return [];
  }, [clustersData]);

  const handleStartAnalysis = async () => {
    if (!id) return;

    try {
      if (analysisResult) setAnalysisResult(null);

      // Switch to debate tab
      setActiveTab("debate");

      // Estimate duration for display
      const maxRounds = 3;
      const maxMessages = 15;
      const estimated = estimateDebateDuration(maxRounds, maxMessages);
      setEstimatedTime(estimated);

      // Start the debate
      const response = await createDebate(id, maxRounds, maxMessages);
      setDebateId(response.debate_id);
      setIsAnalyzing(true);

      // Scroll to the debate section
      setTimeout(() => {
        loadingSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (error) {
      console.error("Failed to start debate:", error);
      toast({
        title: "Failed to start debate",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  const handleAnalysisComplete = (result: ConsensusResult) => {
    setAnalysisResult(result);
    setIsAnalyzing(false);
    setDebateId(null);

    // Scroll to synthesize section to move the analysis UI to the top
    setTimeout(() => {
      synthesizeSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="text-foreground hover:text-foreground/80 transition-colors font-semibold"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  {project.title}
                </h1>
                <Badge className="bg-green-500/90 backdrop-blur-sm text-white border-0 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse mr-2" />
                  Active
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-8 py-8">
        {/* Tabs Section */}
        <div className="mb-8">
          <Tabs
            defaultValue="clusters"
            className="space-y-8"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <div className="flex justify-center mb-8">
              <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-muted p-1 border-2">
                <TabsTrigger
                  value="clusters"
                  className="rounded-lg font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm px-6"
                >
                  <Network className="mr-2 h-4 w-4" />
                  Cluster Info
                </TabsTrigger>
                <TabsTrigger
                  value="debate"
                  className="rounded-lg font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm px-6"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Agent Debate
                  {isAnalyzing && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-2 h-2 w-2 rounded-full bg-primary"
                    />
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="clusters" className="space-y-8">
              {clustersLoading ? (
                <Card className="border-2 overflow-hidden">
                  <CardContent className="pt-12">
                    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
                      {/* Animated Network Icon */}
                      <div className="relative">
                        {/* Pulsing background circles */}
                        <motion.div
                          className="absolute inset-0 -m-8"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.1, 0.2, 0.1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl" />
                        </motion.div>

                        {/* Icon container */}
                        <motion.div
                          animate={{
                            rotate: [0, 360],
                          }}
                          transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <motion.div
                            animate={{
                              scale: [1, 1.05, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          >
                            <div className="relative p-6 rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-2 border-blue-200/50 dark:border-blue-800/30">
                              <motion.div
                                animate={{
                                  rotate: [0, -360],
                                }}
                                transition={{
                                  duration: 8,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                              >
                                <Network
                                  className="h-16 w-16 text-blue-600 dark:text-blue-400"
                                  strokeWidth={1.5}
                                />
                              </motion.div>
                            </div>
                          </motion.div>
                        </motion.div>
                      </div>

                      {/* Static loading text */}
                      <motion.p
                        className="text-lg text-foreground/80 text-center tracking-tight font-light"
                        style={{
                          fontFamily:
                            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
                          letterSpacing: "-0.01em",
                        }}
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        Analyzing community insights...
                      </motion.p>
                    </div>
                  </CardContent>
                </Card>
              ) : clusterData.length === 0 ? (
                <Card className="border-2">
                  <CardContent className="pt-6 text-center py-12">
                    <Network
                      className="mx-auto h-16 w-16 text-muted-foreground mb-4"
                      strokeWidth={1.5}
                    />
                    <p className="text-muted-foreground font-medium">
                      No clusters available yet. Ideas will be clustered once
                      enough submissions are collected.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-10">
                  {/* Prominent Header Section */}
                  <div className="text-center">
                    <h2 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
                      {clusterData.length} idea clusters discovered
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      AI-powered thematic analysis of {submissionsCount}{" "}
                      community submissions
                    </p>
                  </div>

                  {/* Cluster Cards Grid */}
                  <div
                    className={`grid gap-5 items-start ${
                      clusterData.length === 2
                        ? "grid-cols-1 lg:grid-cols-2"
                        : clusterData.length === 3
                        ? "grid-cols-1 lg:grid-cols-3"
                        : clusterData.length === 4
                        ? "grid-cols-1 md:grid-cols-2"
                        : clusterData.length === 5
                        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    }`}
                  >
                    {clusterData.map((cluster) => {
                      const isExpanded = expandedClusters.has(cluster.id);

                      return (
                        <Card
                          key={cluster.id}
                          className={`group relative overflow-hidden transition-all duration-500 border-0 shadow-sm hover:shadow-xl rounded-3xl ${
                            isExpanded ? "shadow-2xl" : ""
                          }`}
                          style={
                            isExpanded
                              ? {
                                  boxShadow: `0 0 0 1px ${cluster.gradient.accent}, 0 0 0 5px transparent`,
                                }
                              : undefined
                          }
                        >
                          {/* Gradient Header with Cluster Number */}
                          <div
                            className="relative h-24 px-6 py-4 flex items-center justify-between overflow-hidden cursor-pointer"
                            style={{
                              background: `linear-gradient(135deg, ${cluster.gradient.from} 0%, ${cluster.gradient.to} 100%)`,
                            }}
                            onClick={() => {
                              setExpandedClusters((prev) => {
                                const newSet = new Set(prev);
                                if (isExpanded) {
                                  newSet.delete(cluster.id);
                                } else {
                                  newSet.add(cluster.id);
                                }
                                return newSet;
                              });
                            }}
                          >
                            {/* Decorative element */}
                            <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10" />

                            <div className="relative z-10 flex items-center gap-4 flex-1">
                              <div className="h-14 w-14 rounded-xl bg-white/95 flex items-center justify-center shadow-lg">
                                <span
                                  className="text-2xl font-bold"
                                  style={{ color: cluster.gradient.from }}
                                >
                                  {cluster.id}
                                </span>
                              </div>
                              <div className="text-white flex-1">
                                <h4 className="text-xl font-bold mb-1 drop-shadow-md">
                                  {cluster.theme}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    {cluster.ideas.length} contributions
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div
                              className={`relative z-10 transform transition-transform duration-300 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            >
                              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Summary Section - Always Visible */}
                          <CardContent className="pt-7 pb-6 px-7">
                            {cluster.summary && (
                              <div className="mb-5">
                                <p className="text-base text-foreground/70 leading-relaxed font-normal">
                                  {cluster.summary}
                                </p>
                              </div>
                            )}

                            {!isExpanded && (
                              <button
                                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                                onClick={() => {
                                  setExpandedClusters((prev) =>
                                    new Set(prev).add(cluster.id)
                                  );
                                }}
                              >
                                View all {cluster.ideas.length} ideas →
                              </button>
                            )}
                          </CardContent>

                          {/* Expanded Ideas List */}
                          {isExpanded && (
                            <CardContent className="pt-0 pb-6 animate-in slide-in-from-top-2">
                              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                                <div className="flex items-center justify-between mb-3 sticky top-0 bg-card py-2 border-b">
                                  <h5 className="font-semibold text-sm">
                                    All Ideas
                                  </h5>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedClusters((prev) => {
                                        const newSet = new Set(prev);
                                        newSet.delete(cluster.id);
                                        return newSet;
                                      });
                                    }}
                                  >
                                    Collapse
                                  </Button>
                                </div>
                                {cluster.ideas.map((idea, i) => (
                                  <div
                                    key={i}
                                    className="p-3 rounded-lg border-l-4 bg-muted/40 hover:bg-muted/60 transition-colors text-sm"
                                    style={{
                                      borderLeftColor: cluster.gradient.accent,
                                    }}
                                  >
                                    <span className="font-medium text-muted-foreground mr-2">
                                      #{i + 1}
                                    </span>
                                    {idea.text}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="debate">
              {!isAnalyzing && !analysisResult ? (
                <Card className="border-2 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold">
                      Synthesize
                    </CardTitle>
                    <CardDescription className="text-base">
                      AI agents simulate debate to form consensus from your
                      collected ideas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex h-96 items-center justify-center bg-muted/30 rounded-xl">
                    <div className="text-center">
                      <Sparkles
                        className="mx-auto h-16 w-16 text-muted-foreground mb-4"
                        strokeWidth={1.5}
                      />
                      <p className="text-muted-foreground mb-6 font-medium">
                        Start the simulated debate to synthesize insights
                      </p>
                      <Button size="lg" onClick={handleStartAnalysis}>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Start Simulation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : isAnalyzing && !analysisResult ? (
                <div
                  ref={loadingSectionRef}
                  className="w-full overflow-visible"
                >
                  <DebateSimulation
                    key={debateId || "debate-loading"}
                    duration={0} // No auto-complete, wait for real results
                    autoStart={true}
                    onComplete={handleAnalysisComplete}
                    debateId={debateId || undefined}
                    processingTime={estimatedTime}
                  />
                </div>
              ) : analysisResult ? (
                <div className="w-full overflow-visible pb-4">
                  <DebateSimulation
                    key="debate-result"
                    result={analysisResult}
                    autoStart={false}
                  />
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
