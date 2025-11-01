import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageSquare, Mail, Users, MessageCircle, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface DataSource {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requiresOAuth: boolean;
}

const dataSources: DataSource[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Monitor channels for new ideas and discussions",
    icon: <MessageSquare className="h-6 w-6" />,
    requiresOAuth: true,
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Watch team chats and conversations",
    icon: <Users className="h-6 w-6" />,
    requiresOAuth: false,
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Scan emails sent to specific addresses",
    icon: <Mail className="h-6 w-6" />,
    requiresOAuth: false,
  },
  {
    id: "discord",
    name: "Discord",
    description: "Monitor servers for new ideas and conversations",
    icon: <MessageCircle className="h-6 w-6" />,
    requiresOAuth: true,
  },
];

interface DataSourceSelectorProps {
  selectedSources: string[];
  onSourcesChange: (sources: string[]) => void;
}

export function DataSourceSelector({ selectedSources, onSourcesChange }: DataSourceSelectorProps) {
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Check connection status for OAuth sources
    const checkStatus = async () => {
      for (const source of dataSources.filter(s => s.requiresOAuth)) {
        try {
          const response = await fetch(`http://localhost:8000/oauth/status/${source.id}`);
          const data = await response.json();
          setConnectionStatus(prev => ({ ...prev, [source.id]: data.connected }));
        } catch (error) {
          console.error(`Failed to check ${source.id} status:`, error);
        }
      }
    };
    checkStatus();
    
    // Poll for status updates every 2 seconds
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (sourceId: string, requiresOAuth: boolean) => {
    if (!requiresOAuth) {
      // For non-OAuth sources, just toggle selection
      handleToggle(sourceId);
      return;
    }

    // Check if already connected (e.g., via pre-configured bot token)
    if (connectionStatus[sourceId]) {
      // Already connected, just toggle selection
      handleToggle(sourceId);
      return;
    }

    // For OAuth sources, open OAuth flow
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const oauthWindow = window.open(
      `http://localhost:8000/oauth/${sourceId}/initiate`,
      `${sourceId}_oauth`,
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!oauthWindow) {
      toast.error("Please allow popups to connect to " + sourceId);
      return;
    }

    // Check if window closed and update status
    const checkWindowClosed = setInterval(() => {
      if (oauthWindow.closed) {
        clearInterval(checkWindowClosed);
        // Wait a bit for the backend to update, then check status
        setTimeout(async () => {
          try {
            const response = await fetch(`http://localhost:8000/oauth/status/${sourceId}`);
            const data = await response.json();
            if (data.connected) {
              setConnectionStatus(prev => ({ ...prev, [sourceId]: true }));
              handleToggle(sourceId);
              toast.success(`${sourceId.charAt(0).toUpperCase() + sourceId.slice(1)} connected successfully!`);
            }
          } catch (error) {
            console.error(`Failed to check ${sourceId} status:`, error);
          }
        }, 500);
      }
    }, 500);
  };

  const handleToggle = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      onSourcesChange(selectedSources.filter((id) => id !== sourceId));
    } else {
      onSourcesChange([...selectedSources, sourceId]);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {dataSources.map((source) => (
        <Card
          key={source.id}
          className={`transition-all ${
            selectedSources.includes(source.id)
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50"
          }`}
        >
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-start space-x-4 flex-1">
              <div className="text-primary">{source.icon}</div>
              <div className="flex-1 space-y-1">
                <Label className="font-semibold text-foreground">
                  {source.name}
                </Label>
                <p className="text-sm text-muted-foreground">{source.description}</p>
              </div>
            </div>
            <Button
              onClick={() => handleConnect(source.id, source.requiresOAuth)}
              variant={selectedSources.includes(source.id) ? "default" : "outline"}
              className="ml-4"
            >
              {selectedSources.includes(source.id) ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Selected
                </>
              ) : (source.requiresOAuth && connectionStatus[source.id]) ? (
                "Connected - Click to Use"
              ) : (
                "Connect"
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
