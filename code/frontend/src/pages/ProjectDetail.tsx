import { useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  similarity: number;
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
  silhouetteScore: number
): ClusterVisualizationData[] {
  return clusters.map((ideas, index) => ({
    id: index + 1,
    theme: extractTheme(ideas),
    color: CLUSTER_COLORS[index % CLUSTER_COLORS.length],
    similarity: Math.round((silhouetteScore + 1) * 50),
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
  const loadingSectionRef = useRef<HTMLDivElement>(null);
  const synthesizeSectionRef = useRef<HTMLDivElement>(null);

  const projectsData: Record<string, any> = {
    "1": {
      id: "1",
      title: "Green City Basel",
      goal: "Collecting the best ideas for making Basel more sustainable",
      status: "collecting",
      ideasCount: 23,
      lastActivity: "2 hours ago",
    },
    "2": {
      id: "2",
      title: "Team-Building Adventure",
      goal: "Ideation on the best team-building activities for the next quarter.",
      status: "synthesizing",
      ideasCount: 45,
      lastActivity: "1 day ago",
    },
    "3": {
      id: "3",
      title: "From Chemical Plants to Food Production",
      goal: "Ideating on how to bring together industry professionals from diverse backgrounds?",
      status: "synthesizing",
      ideasCount: 23,
      lastActivity: "3 days ago",
    },
  };

  const project = projectsData[id || "1"] || projectsData["1"];

  const mockBackendResponse = {
    clusters: [
      [
        "Create more rooftop gardens on public buildings",
        "Transform parking lots into pocket parks",
        "Plant vertical gardens on building facades",
        "Install green walls at bus stops",
      ],
      [
        "Expand bike lane network across the city",
        "Implement electric bus fleet",
        "Create car-free zones in downtown",
        "Build more park-and-ride facilities",
        "Introduce bike-sharing stations",
      ],
      [
        "Install solar panels on all municipal buildings",
        "Create community solar programs",
        "Subsidize residential solar installations",
      ],
      [
        "Implement city-wide composting program",
        "Ban single-use plastics in restaurants",
        "Create repair cafes for electronics",
        "Establish zero-waste grocery stores",
      ],
      [
        "Host monthly sustainability workshops",
        "Create neighborhood green teams",
        "Launch eco-challenge campaigns",
      ],
    ],
    num_clusters: 5,
    silhouette_score: 0.73,
  };

  const clusterData = useMemo(
    () =>
      transformClustersToVisualization(
        mockBackendResponse.clusters,
        mockBackendResponse.silhouette_score
      ),
    []
  );

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
    setTimeout(() => {
      synthesizeSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

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
                {project.ideasCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Contributors
              </p>
              <p className="mt-2 text-4xl font-bold text-foreground">12</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Themes Identified
              </p>
              <p className="mt-2 text-4xl font-bold text-foreground">5</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Consensus Score
              </p>
              <p className="mt-2 text-4xl font-bold text-foreground">78%</p>
            </CardContent>
          </Card>
        </div>

        {/* Synthesize Section */}
        <div ref={synthesizeSectionRef} className="mt-8">
          <Tabs defaultValue="clusters" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="clusters">
                <Network className="mr-2 h-4 w-4" />
                Cluster Info
              </TabsTrigger>
              <TabsTrigger value="debate">
                <Users className="mr-2 h-4 w-4" />
                Agent Debate
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clusters" className="space-y-4">
              {/* Header */}
              <div className="text-center mb-2">
                <h3 className="text-2xl font-bold mb-1">Idea Islands</h3>
                <p className="text-muted-foreground text-sm">
                  {clusterData.length} groups of similar ideas · Click to
                  explore
                </p>
              </div>

              {/* Bubble Circle */}
              <div className="relative z-10 rounded-2xl bg-gradient-to-br from-slate-50/50 to-gray-100/50 dark:from-slate-900/20 dark:to-gray-900/20 py-4 mb-8 overflow-visible">
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
                                <div className="text-4xl font-bold mb-2">
                                  {cluster.ideas.length}
                                </div>
                                <div className="text-sm font-semibold px-2 line-clamp-2">
                                  {cluster.theme}
                                </div>
                                <div className="text-xs mt-2 opacity-90">
                                  {cluster.similarity}% similar
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
                              clusterData.find((c) => c.id === expandedCluster)
                                ?.ideas.length
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
                              {
                                clusterData.find(
                                  (c) => c.id === expandedCluster
                                )?.similarity
                              }
                              % similarity · All ideas in this group
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
                    duration={5000}
                    autoStart={true}
                    onComplete={handleAnalysisComplete}
                  />
                </div>
              ) : analysisResult ? (
                <div className="w-full overflow-visible pb-4">
                  <DebateSimulation result={analysisResult} autoStart={false} />
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
