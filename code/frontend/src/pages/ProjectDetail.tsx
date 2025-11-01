import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, BarChart3, Network, Users } from "lucide-react";
import { DebateSimulation } from "@/components/DebateSimulation";
import type { ConsensusResult } from "@/components/DebateSimulation";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ConsensusResult | null>(null);
  const loadingSectionRef = useRef<HTMLDivElement>(null);
  const synthesizeSectionRef = useRef<HTMLDivElement>(null);

  // Mock data - in real app would fetch based on id
  const projectsData: Record<string, any> = {
    "1": {
      id: "1",
      title: "Green City Basel 🌳",
      goal: "Collecting the best ideas for making Basel more sustainable",
      status: "collecting",
      ideasCount: 23,
      lastActivity: "2 hours ago",
    },
    "2": {
      id: "2",
      title: "Team-Building Adventure ⛹🏻‍♂️",
      goal: "Ideation on the best team-building activities for the next quarter.",
      status: "synthesizing",
      ideasCount: 45,
      lastActivity: "1 day ago",
    },
    "3": {
      id: "3",
      title: "From Chemical Plants to Food Production 🏭",
      goal: "Ideating on how to bring together industry professionals from diverse backgrounds?",
      status: "synthesizing",
      ideasCount: 23,
      lastActivity: "3 days ago",
    },
  };

  const project = projectsData[id || "1"] || projectsData["1"];

  // Handler for starting analysis
  const handleStartAnalysis = () => {
    if (analysisResult) {
      // Reset and start fresh
      setAnalysisResult(null);
      setIsAnalyzing(true);
    } else {
      setIsAnalyzing(true);
    }
    
    // Scroll to loading animation after a short delay to ensure it's rendered
    setTimeout(() => {
      loadingSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  // Handler for when analysis completes
  const handleAnalysisComplete = (result: ConsensusResult) => {
    setAnalysisResult(result);
    setIsAnalyzing(false);
    
    // Scroll to synthesize section to move the analysis UI to the top
    // Use a small delay to ensure the result is rendered
    setTimeout(() => {
      synthesizeSectionRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{project.title}</h1>
              <p className="mt-1 text-muted-foreground">{project.goal}</p>
            </div>
            <Badge className="bg-accent text-accent-foreground">Active</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Ideas</p>
                <p className="mt-2 text-4xl font-bold text-foreground">{project.ideasCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Contributors</p>
                <p className="mt-2 text-4xl font-bold text-foreground">12</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Themes Identified</p>
                <p className="mt-2 text-4xl font-bold text-foreground">5</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Consensus Score</p>
                <p className="mt-2 text-4xl font-bold text-foreground">78%</p>
              </div>
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

            <TabsContent value="clusters">
              <Card>
                <CardHeader>
                  <CardTitle>Idea Clusters</CardTitle>
                  <CardDescription>Interactive visualization of collected ideas grouped by similarity</CardDescription>
                </CardHeader>
                <CardContent className="flex h-96 items-center justify-center bg-muted/30">
                  <div className="text-center">
                    <BarChart3 className="mx-auto h-16 w-16 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">
                      Visualization will appear here once you run the analysis
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="debate">
              {!isAnalyzing && !analysisResult ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Synthesize</CardTitle>
                    <CardDescription>AI agents simulate debate to form consensus from your collected ideas</CardDescription>
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
                <div ref={loadingSectionRef} className="w-full overflow-visible">
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
