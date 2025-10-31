import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { StepIndicator } from "@/components/StepIndicator";
import { DataSourceSelector } from "@/components/DataSourceSelector";
import { CampaignDesigner } from "@/components/CampaignDesigner";

type Step = 1 | 2 | 3;

export default function NewProject() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [projectName, setProjectName] = useState("");
  const [projectGoal, setProjectGoal] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const handleNext = () => {
    if (currentStep === 1 && (!projectName || !projectGoal)) {
      toast.error("Please fill in all fields");
      return;
    }
    if (currentStep === 2 && selectedSources.length === 0) {
      toast.error("Please select at least one data source");
      return;
    }
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleLaunch = () => {
    toast.success("Project launched successfully!");
    navigate("/");
  };

  const steps = [
    { number: 1, title: "Define Mission", description: "What & Why" },
    { number: 2, title: "Connect Sources", description: "Where" },
    { number: 3, title: "Design Campaign", description: "How" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Create New Project</h1>
          <p className="mt-1 text-muted-foreground">Let's set up your wisdom gathering campaign</p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <StepIndicator steps={steps} currentStep={currentStep} />

        <div className="mt-8">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Define Your Mission</CardTitle>
                <CardDescription>Tell us about your project and what you're trying to achieve</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    placeholder="e.g., Make Basel Greener"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-goal">Project Goal</Label>
                  <Textarea
                    id="project-goal"
                    placeholder="Describe your mission. What question are you trying to answer? What problem are you solving?"
                    rows={5}
                    value={projectGoal}
                    onChange={(e) => setProjectGoal(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Connect Data Sources</CardTitle>
                <CardDescription>Where will your ideas come from? Select one or more sources</CardDescription>
              </CardHeader>
              <CardContent>
                <DataSourceSelector selectedSources={selectedSources} onSourcesChange={setSelectedSources} />
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Design Your Campaign</CardTitle>
                <CardDescription>Let our AI help you create the perfect campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <CampaignDesigner projectName={projectName} projectGoal={projectGoal} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {currentStep < 3 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleLaunch} className="bg-success hover:bg-success/90">
              <Check className="mr-2 h-4 w-4" />
              Launch Campaign
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
