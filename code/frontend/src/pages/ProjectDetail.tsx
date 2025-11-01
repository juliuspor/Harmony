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
  color: string;
  ideas: { text: string }[];
}

// Neutral color palette for clusters
const CLUSTER_COLORS = [
  "hsl(200, 25%, 55%)", // Slate Blue
  "hsl(180, 20%, 50%)", // Muted Teal
  "hsl(260, 25%, 55%)", // Soft Purple
  "hsl(20, 30%, 55%)", // Warm Taupe
  "hsl(160, 22%, 52%)", // Sage Green
  "hsl(220, 20%, 50%)", // Cool Gray-Blue
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
  titles?: string[]
): ClusterVisualizationData[] {
  return clusters.map((ideas, index) => ({
    id: index + 1,
    theme: titles && titles[index] ? titles[index] : extractTheme(ideas),
    color: CLUSTER_COLORS[index % CLUSTER_COLORS.length],
    similarity: Math.round((0.75 + Math.random() * 0.2) * 100), // Mock similarity for now
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
        clustersData.titles
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
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {project.title}
              </h1>
              <p className="mt-1 text-muted-foreground">{project.goal}</p>
            </div>
            <Badge className="bg-accent text-accent-foreground">Active</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Total Ideas
              </p>
              <p className="mt-2 text-4xl font-bold text-foreground">
                {submissionsCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Contributors
              </p>
              <p className="mt-2 text-4xl font-bold text-foreground">
                {contributorsCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Themes Identified
              </p>
              <p className="mt-2 text-4xl font-bold text-foreground">
                {clustersData?.num_clusters || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Consensus Score
              </p>
              <p className="mt-2 text-4xl font-bold text-foreground">
                {clustersData?.silhouette_score 
                  ? `${Math.round((clustersData.silhouette_score + 1) * 50)}%`
                  : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Synthesize Section */}
        <div ref={synthesizeSectionRef} className="mt-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="clusters">
                <Network className="mr-2 h-4 w-4" />
                Cluster Info
              </TabsTrigger>
              <TabsTrigger value="debate">
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

            <TabsContent value="clusters" className="space-y-4">
              {clusterData.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center py-12">
                    <Network className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No clusters available yet. Ideas will be clustered once enough submissions are collected.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-border/50 shadow-sm bg-card text-card-foreground rounded-lg">
                  <CardContent className="pt-6">
                    {/* Header */}
                    <div className="text-center mb-2">
                      <h3 className="text-2xl font-bold mb-1">Idea Islands</h3>
                      <p className="text-muted-foreground text-sm">
                        {clusterData.length} groups of similar ideas · Click to
                        explore
                      </p>
                    </div>

                  {/* Bubble Circle */}
                  <div className="relative z-10 rounded-lg border border-border/50 pb-4 mb-8 overflow-visible">
                    <div className="flex items-center justify-center">
                      <div className="relative w-[520px] h-[420px]">
                        <div className="relative w-full h-full">
                          {clusterData.map((cluster, index) => {
                            const isExpanded = expandedCluster === cluster.id;
                            const size = 90 + cluster.ideas.length * 15;

                            // Centered radial layout
                            const angle =
                              (index * 2 * Math.PI) / clusterData.length -
                              Math.PI / 2;
                            const radius = 30; // circle radius
                            const centerX = 35; // move circle more to the left
                            const centerY = 38; // move circle up slightly
                            const left = centerX + radius * Math.cos(angle);
                            const top = centerY + radius * Math.sin(angle);

                            return (
                              <div
                                key={cluster.id}
                                className="absolute z-0"
                                style={{
                                  left: `${left}%`,
                                  top: `${top}%`,
                                  transform: "translate(-50%, -50%)",
                                  animation: `float ${
                                    3 + index * 0.5
                                  }s ease-in-out infinite`,
                                }}
                              >
                                <div
                                  className="rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-2xl"
                                  style={{
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    backgroundColor: cluster.color,
                                    opacity: isExpanded ? 1 : 0.9,
                                    transform: isExpanded
                                      ? "scale(1.15)"
                                      : "scale(1)",
                                  }}
                                  onClick={() =>
                                    setExpandedCluster(
                                      isExpanded ? null : cluster.id
                                    )
                                  }
                                >
                                  <div className="text-center text-white p-4">
                                    <div className="text-base font-bold px-2 line-clamp-3 leading-tight">
                                      {cluster.theme}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details (well below bubbles, no overlap) */}
                  {expandedCluster !== null && (
                    <div className="relative z-20 mt-4">
                      <Card
                        className="border-4 animate-in slide-in-from-bottom-4"
                        style={{
                          borderColor:
                            clusterData.find((c) => c.id === expandedCluster)
                              ?.color || "transparent",
                        }}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div
                                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                                style={{
                                  backgroundColor: clusterData.find(
                                    (c) => c.id === expandedCluster
                                  )?.color,
                                }}
                              >
                                {
                                  clusterData.find(
                                    (c) => c.id === expandedCluster
                                  )?.ideas.length
                                }
                              </div>
                              <div>
                                <CardTitle className="text-2xl">
                                  {
                                    clusterData.find(
                                      (c) => c.id === expandedCluster
                                    )?.theme
                                  }
                                </CardTitle>
                                <CardDescription className="text-base mt-1">
                                  All ideas in this group
                                </CardDescription>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedCluster(null)}
                            >
                              Close
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 md:grid-cols-2">
                            {clusterData
                              .find((c) => c.id === expandedCluster)
                              ?.ideas.map((idea, i) => (
                                <div
                                  key={i}
                                  className="p-4 rounded-lg border-l-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                                  style={{
                                    borderLeftColor: clusterData.find(
                                      (c) => c.id === expandedCluster
                                    )?.color,
                                  }}
                                >
                                  <p className="text-sm">{idea.text}</p>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  </CardContent>
                </Card>
              )}

              <style>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-10px); }
                }
              `}</style>
            </TabsContent>

            <TabsContent value="debate">
              {!isAnalyzing && !analysisResult ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Synthesize</CardTitle>
                    <CardDescription>
                      AI agents simulate debate to form consensus from your
                      collected ideas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex h-96 items-center justify-center bg-muted/30">
                    <div className="text-center">
                      <Sparkles className="mx-auto h-16 w-16 text-muted-foreground" />
                      <p className="mt-4 text-muted-foreground mb-6">
                        Start the simulated debate to synthesize insights
                      </p>
                      <Button
                        size="lg"
                        className="bg-primary hover:bg-primary/90"
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
