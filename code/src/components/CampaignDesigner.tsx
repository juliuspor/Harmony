import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";

interface CampaignDesignerProps {
  projectName: string;
  projectGoal: string;
}

export function CampaignDesigner({ projectName, projectGoal }: CampaignDesignerProps) {
  const suggestions = [
    {
      title: "Slack Announcement",
      content: `🌱 Help us ${projectName}!\n\nWe're looking for your ideas: ${projectGoal}\n\nShare your thoughts in this thread 👇`,
    },
    {
      title: "Email Template",
      content: `Subject: Your Ideas Needed - ${projectName}\n\nDear Team,\n\nWe're launching an initiative to ${projectGoal.toLowerCase()}. Your insights are valuable to us!\n\nPlease reply to this email with your ideas and suggestions.\n\nThank you for contributing!`,
    },
    {
      title: "Meeting Questions",
      content: `Discussion guide for: ${projectName}\n\n1. What are your initial thoughts on this initiative?\n2. What challenges do you foresee?\n3. What opportunities excite you most?\n4. What specific actions would you recommend?`,
    },
  ];

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
        {suggestions.map((suggestion, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {suggestion.title}
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
                rows={6}
                className="font-mono text-sm"
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
