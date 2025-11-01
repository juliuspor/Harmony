import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Copy, MessageSquare, Mail, Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface CampaignDesignerProps {
  projectName: string;
  projectGoal: string;
  selectedSources: string[];
  aiSuggestions: Record<string, string>;
}

// Mapping of source IDs to display information
const sourceDisplayInfo: Record<string, { name: string; icon: React.ReactNode }> = {
  slack: {
    name: "Slack",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  teams: {
    name: "Microsoft Teams",
    icon: <Users className="h-5 w-5" />,
  },
  outlook: {
    name: "Outlook Email",
    icon: <Mail className="h-5 w-5" />,
  },
  discord: {
    name: "Discord",
    icon: <MessageCircle className="h-5 w-5" />,
  },
};

export function CampaignDesigner({ projectName, projectGoal, selectedSources, aiSuggestions }: CampaignDesignerProps) {
  // Create suggestions array based on selected sources and AI suggestions
  const suggestions = selectedSources
    .filter((source) => sourceDisplayInfo[source])
    .map((source) => ({
      id: source,
      title: sourceDisplayInfo[source].name,
      icon: sourceDisplayInfo[source].icon,
      content: aiSuggestions[source] || `Loading suggestions for ${sourceDisplayInfo[source].name}...`,
    }));

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <div className="flex items-start space-x-3">
            <Sparkles className="mt-1 h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">AI Campaign Assistant</CardTitle>
              <CardDescription className="mt-1">
                Based on your goal "{projectGoal}", here are some campaign ideas to get you started
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {suggestions.map((suggestion) => (
          <Card key={suggestion.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center space-x-2">
                  <span className="text-primary">{suggestion.icon}</span>
                  <span>{suggestion.title}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(suggestion.content)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={suggestion.content}
                readOnly
                rows={8}
                className="text-sm whitespace-pre-wrap"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Or Create Your Own</CardTitle>
          <CardDescription>Write a custom campaign message</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Write your custom campaign message here..."
            rows={6}
          />
        </CardContent>
      </Card>
    </div>
  );
}
