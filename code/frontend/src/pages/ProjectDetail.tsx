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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ConsensusResult | null>(
    null
  );
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);
  const [debateId, setDebateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("clusters");
  const loadingSectionRef = useRef<HTMLDivElement>(null);
  const synthesizeSectionRef = useRef<HTMLDivElement>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [clustersData, setClustersData] = useState<any>(null);
  const [contributorsCount, setContributorsCount] = useState(0);

  // Fetch project data from backend
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        // Fetch all campaigns
        const campaignsResponse = await fetch("http://localhost:8000/campaigns");
        const campaignsData = await campaignsResponse.json();
        
        // Find the campaign with matching ID
        const campaign = campaignsData.campaigns.find((c: any) => c.id === id);
        
        if (campaign) {
          setProject({
            id: campaign.id,
            title: campaign.project_name,
            goal: campaign.project_goal,
            status: "collecting",
          });
          
          // Fetch submissions count
          try {
            const submissionsResponse = await fetch(
              `http://localhost:8000/submissions?project_id=${id}`
            );
            const submissionsData = await submissionsResponse.json();
            setSubmissionsCount(submissionsData.count || 0);
          } catch (error) {
            console.error("Failed to fetch submissions:", error);
          }
          
          // Fetch clusters if available
          try {
            const clustersResponse = await fetch(
              `http://localhost:8000/projects/${id}/clusters`
            );
            if (clustersResponse.ok) {
              const clustersResult = await clustersResponse.json();
              setClustersData(clustersResult);
              
              // Update campaign with cluster count (fire and forget)
              fetch(`http://localhost:8000/campaigns/${id}/clusters?num_clusters=${clustersResult.num_clusters}`, {
                method: 'PATCH',
              }).catch(err => console.log("Failed to update campaign cluster count:", err));
            }
          } catch (error) {
            console.log("No clusters available yet:", error);
          }
          
          // Fetch contributors count
          try {
            const contributorsResponse = await fetch(
              `http://localhost:8000/projects/${id}/contributors`
            );
            if (contributorsResponse.ok) {
              const contributorsResult = await contributorsResponse.json();
              setContributorsCount(contributorsResult.contributors || 0);
            }
          } catch (error) {
            console.log("Failed to fetch contributors:", error);
          }
        } else {
          console.error("Campaign not found");
          // Navigate back to dashboard if project not found
          navigate("/");
        }
      } catch (error) {
        console.error("Failed to fetch project data:", error);
        navigate("/");
      } finally {
        setLoading(false);
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

  const handleStartAnalysis = () => {
    if (analysisResult) setAnalysisResult(null);
    setIsAnalyzing(true);
    setTimeout(() => {
      loadingSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-border bg-card shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 -ml-4 text-foreground hover:text-foreground/80 transition-colors font-semibold"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-start justify-between gap-12 pb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight leading-tight">
                {project.title}
              </h1>
              <p className="text-base text-muted-foreground max-w-3xl leading-relaxed font-medium mb-3">{project.goal}</p>
              <div className="flex items-center gap-5 text-sm">
                <span className="text-muted-foreground font-medium">
                  <span className="text-foreground font-bold text-base">{submissionsCount}</span> ideas
                </span>
                <span className="text-muted-foreground font-bold">•</span>
                <span className="text-muted-foreground font-medium">
                  <span className="text-foreground font-bold text-base">{contributorsCount}</span> contributors
                </span>
                <span className="text-muted-foreground font-bold">•</span>
                <span className="text-muted-foreground font-medium">
                  <span className="text-foreground font-bold text-base">{clustersData?.num_clusters || 0}</span> clusters
                </span>
                {clustersData?.silhouette_score && (
                  <>
                    <span className="text-muted-foreground font-bold">•</span>
                    <span className="text-muted-foreground font-medium">
                      <span className="text-foreground font-bold text-base">{Math.round((clustersData.silhouette_score + 1) * 50)}%</span> consensus
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-sm text-foreground font-bold">Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-8 py-12">
        {/* Tabs Section */}
        <div className="mb-8">
          <Tabs 
            defaultValue="clusters" 
            className="space-y-8"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12 p-1 bg-muted rounded-xl border-2">
              <TabsTrigger value="clusters" className="rounded-lg font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Network className="mr-2 h-4 w-4" />
                Cluster Info
              </TabsTrigger>
              <TabsTrigger value="debate" className="rounded-lg font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
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

            <TabsContent value="clusters" className="space-y-8">
              {clusterData.length === 0 ? (
                <Card className="border-2">
                  <CardContent className="pt-6 text-center py-12">
                    <Network className="mx-auto h-16 w-16 text-muted-foreground mb-4" strokeWidth={1.5} />
                    <p className="text-muted-foreground font-medium">
                      No clusters available yet. Ideas will be clustered once enough submissions are collected.
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
                      AI-powered thematic analysis of {submissionsCount} community submissions
                    </p>
                  </div>

                  {/* Cluster Cards Grid */}
                  <div 
                    className={`grid gap-5 ${
                      clusterData.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                      clusterData.length === 3 ? 'grid-cols-1 lg:grid-cols-3' :
                      clusterData.length === 4 ? 'grid-cols-1 md:grid-cols-2' :
                      clusterData.length === 5 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                      'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    }`}
                  >
                    {clusterData.map((cluster) => {
                      const isExpanded = expandedCluster === cluster.id;
                      
                      return (
                        <Card
                          key={cluster.id}
                          className={`group relative overflow-hidden transition-all duration-500 border-0 shadow-sm hover:shadow-xl rounded-3xl ${
                            isExpanded ? 'shadow-2xl' : ''
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
                            onClick={() =>
                              setExpandedCluster(
                                isExpanded ? null : cluster.id
                              )
                            }
                          >
                            {/* Decorative element */}
                            <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10" />
                            
                            <div className="relative z-10 flex items-center gap-4 flex-1">
                              <div className="h-14 w-14 rounded-xl bg-white/95 flex items-center justify-center shadow-lg">
                                <span className="text-2xl font-bold" style={{ color: cluster.gradient.from }}>
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
                                isExpanded ? 'rotate-180' : ''
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
                                onClick={() => setExpandedCluster(cluster.id)}
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
                                  <h5 className="font-semibold text-sm">All Ideas</h5>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedCluster(null);
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
                                    <span className="font-medium text-muted-foreground mr-2">#{i + 1}</span>
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
                    <CardTitle className="text-2xl font-bold">Synthesize</CardTitle>
                    <CardDescription className="text-base">
                      AI agents simulate debate to form consensus from your
                      collected ideas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex h-96 items-center justify-center bg-muted/30 rounded-xl">
                    <div className="text-center">
                      <Sparkles className="mx-auto h-16 w-16 text-muted-foreground mb-4" strokeWidth={1.5} />
                      <p className="text-muted-foreground mb-6 font-medium">
                        Start the simulated debate to synthesize insights
                      </p>
                      <Button
                        size="lg"
                        onClick={handleStartAnalysis}
                      >
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
                  />
                </div>
              ) : analysisResult ? (
                <div className="w-full overflow-visible pb-4">
                  <DebateSimulation key="debate-result" result={analysisResult} autoStart={false} />
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
