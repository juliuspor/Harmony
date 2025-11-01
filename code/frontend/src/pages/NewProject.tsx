import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Target,
  Sparkles,
  Rocket,
  Zap,
} from "lucide-react";
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
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>(
    {}
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleNext = async () => {
    if (currentStep === 1 && (!projectName || !projectGoal)) {
      toast.error("Please fill in all fields");
      return;
    }
    if (currentStep === 2 && selectedSources.length === 0) {
      toast.error("Please select at least one data source");
      return;
    }

    // When moving from step 2 to step 3, generate AI suggestions
    if (currentStep === 2) {
      setIsGenerating(true);
      try {
        const response = await fetch("http://localhost:8000/suggest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            project_name: projectName,
            project_goal: projectGoal,
            connected_sources: selectedSources,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate campaign suggestions");
        }

        const data = await response.json();
        setAiSuggestions(data.suggestions);
        toast.success("Campaign suggestions generated!");
      } catch (error) {
        console.error("Error generating suggestions:", error);
        toast.error(
          "Failed to generate campaign suggestions. Please try again."
        );
        setIsGenerating(false);
        return;
      } finally {
        setIsGenerating(false);
      }
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

  const handleLaunch = async () => {
    try {
      const response = await fetch("http://localhost:8000/campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_name: projectName,
          project_goal: projectGoal,
          messages: aiSuggestions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to launch campaign");
      }

      toast.success("Project launched successfully!");
      navigate("/");
    } catch (error) {
      console.error("Error launching campaign:", error);
      toast.error("Failed to launch campaign. Please try again.");
    }
  };

  const steps = [
    { number: 1, title: "Define Mission", description: "What & Why" },
    { number: 2, title: "Connect Sources", description: "Where" },
    { number: 3, title: "Launch Campaign", description: "How" },
  ];

  // Get step icon and color
  const getStepIcon = (step: number) => {
    switch (step) {
      case 1:
        return Target;
      case 2:
        return Zap;
      case 3:
        return Rocket;
      default:
        return Target;
    }
  };

  const getStepGradient = () => {
    return "from-blue-500 to-cyan-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-8 py-5">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 -ml-4 text-foreground hover:text-foreground/80 transition-colors font-semibold"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${getStepGradient()} flex items-center justify-center shadow-lg`}
            >
              <Sparkles className="h-7 w-7 text-white" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-1 tracking-tight leading-tight">
                Create New Project
              </h1>
              <p className="text-base text-muted-foreground font-medium">
                Launch your Harmony campaign in three simple steps
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-8 py-12 relative z-10">
        {/* Enhanced Step Indicator */}
        <div className="mb-12 max-w-6xl mx-auto">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        {/* Step Content with Animation */}
        <div className="mt-10 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2 bg-card/95 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden">
                  {/* Gradient Header */}
                  <div
                    className={`h-2 bg-gradient-to-r ${getStepGradient()}`}
                  />

                  <CardHeader className="pb-6 pt-8 px-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${getStepGradient()} flex items-center justify-center shadow-lg`}
                      >
                        <Target className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl font-bold tracking-tight">
                          Define Your Mission
                        </CardTitle>
                        <CardDescription className="text-base mt-1">
                          Tell us what you want to achieve and why it matters
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-8 px-8 pb-8">
                    <div className="space-y-3">
                      <Label
                        htmlFor="project-name"
                        className="text-sm font-semibold flex items-center gap-2"
                      >
                        <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                          1
                        </span>
                        Project Name
                      </Label>
                      <Input
                        id="project-name"
                        placeholder="e.g., Make Basel Greener"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="h-12 text-base border-2 focus:border-blue-400 transition-colors"
                      />
                      <p className="text-xs text-muted-foreground">
                        Choose a clear, memorable name for your project
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="project-goal"
                        className="text-sm font-semibold flex items-center gap-2"
                      >
                        <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                          2
                        </span>
                        Project Goal
                      </Label>
                      <Textarea
                        id="project-goal"
                        placeholder="Describe your mission in detail. What question are you trying to answer? What problem are you solving? What impact do you want to make?"
                        rows={8}
                        value={projectGoal}
                        onChange={(e) => setProjectGoal(e.target.value)}
                        className="text-base border-2 focus:border-blue-400 transition-colors resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        Be specific about your objectives and desired outcomes
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2 bg-card/95 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden">
                  {/* Gradient Header */}
                  <div
                    className={`h-2 bg-gradient-to-r ${getStepGradient()}`}
                  />

                  <CardHeader className="pb-6 pt-8 px-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${getStepGradient()} flex items-center justify-center shadow-lg`}
                      >
                        <Zap className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl font-bold tracking-tight">
                          Connect Data Sources
                        </CardTitle>
                        <CardDescription className="text-base mt-1">
                          Choose where your community ideas will come from
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-8 pb-8">
                    <DataSourceSelector
                      selectedSources={selectedSources}
                      onSourcesChange={setSelectedSources}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2 bg-card/95 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden">
                  {/* Gradient Header */}
                  <div
                    className={`h-2 bg-gradient-to-r ${getStepGradient()}`}
                  />

                  <CardHeader className="pb-6 pt-8 px-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${getStepGradient()} flex items-center justify-center shadow-lg`}
                      >
                        <Rocket className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl font-bold tracking-tight">
                          Launch Your Campaign
                        </CardTitle>
                        <CardDescription className="text-base mt-1">
                          AI-powered messages crafted for your audience
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-8 pb-8">
                    <CampaignDesigner
                      projectName={projectName}
                      projectGoal={projectGoal}
                      selectedSources={selectedSources}
                      aiSuggestions={aiSuggestions}
                      onSuggestionsChange={setAiSuggestions}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <motion.div
          className={`mt-12 flex max-w-6xl mx-auto ${
            currentStep === 1 ? "justify-end" : "justify-between"
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isGenerating}
              size="lg"
              className="h-12 px-8 font-semibold border-2"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back
            </Button>
          )}

          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={isGenerating}
              size="lg"
              className="h-12 px-8 font-semibold"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating AI Suggestions...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleLaunch}
              size="lg"
              className="h-12 px-8 font-semibold"
            >
              <Rocket className="mr-2 h-5 w-5" />
              Launch Campaign
            </Button>
          )}
        </motion.div>

        {/* Progress Indicator */}
        <div className="mt-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? `w-12 bg-gradient-to-r ${getStepGradient()}`
                    : step < currentStep
                    ? "w-8 bg-primary/50"
                    : "w-8 bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-3">
            Step {currentStep} of 3
          </p>
        </div>
      </main>
    </div>
  );
}
