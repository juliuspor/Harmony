import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, MessageSquare, BarChart3 } from "lucide-react";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data - in real app would fetch based on id
  const project = {
    id,
    title: "Make Basel Greener 🌳",
    goal: "Find the best ideas for making our Basel office more sustainable",
    status: "collecting",
    ideasCount: 23,
    lastActivity: "2 hours ago",
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
            <Badge className="bg-accent text-accent-foreground">Collecting Ideas</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Ideas</p>
                <p className="mt-2 text-4xl font-bold text-primary">{project.ideasCount}</p>
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
                <p className="mt-2 text-4xl font-bold text-success">78%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex justify-end">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            <Sparkles className="mr-2 h-5 w-5" />
            Analyze & Synthesize
          </Button>
        </div>

        <Tabs defaultValue="visualization" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visualization">
              <BarChart3 className="mr-2 h-4 w-4" />
              Visualization
            </TabsTrigger>
            <TabsTrigger value="feed">
              <MessageSquare className="mr-2 h-4 w-4" />
              Live Feed
            </TabsTrigger>
            <TabsTrigger value="themes">
              <Sparkles className="mr-2 h-4 w-4" />
              Key Themes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visualization">
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

          <TabsContent value="feed">
            <Card>
              <CardHeader>
                <CardTitle>Recent Ideas</CardTitle>
                <CardDescription>New contributions from your connected sources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">Sample idea from contributor {i}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          This is a placeholder for actual idea content from Slack, email, or other sources...
                        </p>
                      </div>
                      <Badge variant="outline">Slack</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{i} hour{i > 1 ? 's' : ''} ago</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="themes">
            <Card>
              <CardHeader>
                <CardTitle>Identified Themes</CardTitle>
                <CardDescription>AI-generated categories from your collected ideas</CardDescription>
              </CardHeader>
              <CardContent className="flex h-96 items-center justify-center bg-muted/30">
                <div className="text-center">
                  <Sparkles className="mx-auto h-16 w-16 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Run analysis to identify key themes and patterns</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
