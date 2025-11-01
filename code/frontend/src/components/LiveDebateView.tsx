import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Sparkles,
  CheckCircle2,
  Clock,
  MessageSquare,
  User,
  Bot,
  Brain,
  Lightbulb,
  Zap,
  Target,
  Shield,
  UserCircle,
} from "lucide-react";
import type { DebateResponse } from "@/lib/api";
import { getDebateStatus } from "@/lib/api";

interface LiveDebateViewProps {
  debateId: string;
  onComplete?: (debateData: DebateResponse) => void;
}

interface Message {
  message_id: string;
  content: string;
  agent_id: string;
  agent_name: string;
  round_number: number;
  message_type: string;
  timestamp: string;
}

// Generate consistent colors for agents based on their ID
const getAgentColor = (agentId: string): string => {
  const colors = [
    {
      bg: "bg-purple-100",
      text: "text-purple-700",
      border: "border-purple-200",
    },
    { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
    { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
    {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "border-orange-200",
    },
    { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
    { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
  ];

  if (agentId === "orchestrator") {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }

  // Hash the agent_id to get consistent color
  const hash = agentId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % colors.length;
  return `${colors[colorIndex].bg} ${colors[colorIndex].text} ${colors[colorIndex].border}`;
};

// Get agent icon based on their ID
const getAgentIcon = (agentId: string) => {
  // Icons array for consistent assignment
  const icons = [
    Bot,
    Brain,
    Lightbulb,
    User,
    Zap,
    Target,
    UserCircle,
    Sparkles,
  ];

  // Orchestrator gets shield icon
  if (agentId === "orchestrator") {
    return Shield;
  }

  // Hash the agent_id to get consistent icon
  const hash = agentId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const iconIndex = hash % icons.length;
  return icons[iconIndex];
};

export function LiveDebateView({ debateId, onComplete }: LiveDebateViewProps) {
  const [debate, setDebate] = useState<DebateResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && messages.length > lastMessageCountRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      lastMessageCountRef.current = messages.length;
    }
  }, [messages]);

  // Poll for debate updates
  useEffect(() => {
    let isMounted = true;

    const fetchDebateStatus = async () => {
      try {
        const data = await getDebateStatus(debateId);

        if (!isMounted) return;

        setDebate(data);
        setMessages(data.messages || []);
        setIsLoading(false);

        // If debate is complete, stop polling and call onComplete
        if (data.status === "completed" || data.status === "cancelled") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (data.status === "completed" && onComplete) {
            onComplete(data);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch debate status:", err);
        setError(err instanceof Error ? err.message : "Failed to load debate");
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchDebateStatus();

    // Poll every 2 seconds while debate is running
    pollIntervalRef.current = setInterval(fetchDebateStatus, 2000);

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [debateId, onComplete]);

  if (isLoading && !debate) {
    return (
      <Card className="border-2">
        <CardContent className="pt-6 text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <Sparkles className="h-12 w-12 text-primary" />
          </motion.div>
          <p className="mt-4 text-muted-foreground font-medium">
            Initializing debate...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-destructive">
        <CardContent className="pt-6 text-center py-12">
          <p className="text-destructive font-medium">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const isComplete = debate?.status === "completed";
  const isCancelled = debate?.status === "cancelled";
  const currentRound =
    messages.length > 0 ? Math.max(...messages.map((m) => m.round_number)) : 1;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {debate?.agents?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{messages.length}</p>
                <p className="text-xs text-muted-foreground">Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{currentRound}</p>
                <p className="text-xs text-muted-foreground">Round</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {isComplete ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : isCancelled ? (
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-xl">✕</span>
                </div>
              ) : (
                <Sparkles className="h-8 w-8 text-primary" />
              )}
              <div>
                <p className="text-sm font-bold capitalize">
                  {isComplete
                    ? "Complete"
                    : isCancelled
                    ? "Cancelled"
                    : "Active"}
                </p>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Panel */}
      {debate?.agents && debate.agents.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Debate Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {debate.agents
                .filter((agent) => agent.agent_id !== "orchestrator")
                .map((agent) => {
                  const colorClasses = getAgentColor(agent.agent_id);
                  const AgentIcon = getAgentIcon(agent.agent_id);
                  return (
                    <Card key={agent.agent_id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            className={`h-10 w-10 border-2 ${colorClasses}`}
                          >
                            <AvatarFallback className={colorClasses}>
                              <AgentIcon className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <h4 className="font-semibold text-sm">
                            {agent.agent_name}
                          </h4>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Debate Area */}
      <Card className="border-2">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Live Debate
            {!isComplete && !isCancelled && (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="ml-auto"
              >
                <Badge variant="default" className="bg-green-500">
                  <span className="mr-1.5 h-2 w-2 rounded-full bg-white animate-pulse" />
                  Live
                </Badge>
              </motion.div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]" ref={scrollRef}>
            <div className="p-6 space-y-4">
              {/* Loading animation when no messages yet */}
              {!isComplete && !isCancelled && messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center justify-center h-[550px]"
                >
                  <div className="relative">
                    {/* Animated background pulse */}
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-pink-500/20 blur-2xl"
                    />

                    {/* Main icon container */}
                    <div className="relative">
                      <motion.div
                        animate={{
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="h-24 w-24 rounded-2xl bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-lg"
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <Sparkles className="h-12 w-12 text-foreground" />
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Status text */}
                  <div className="mt-8 text-center space-y-2">
                    <motion.p
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-lg font-semibold text-foreground"
                    >
                      Initializing Debate
                    </motion.p>
                    <p className="text-sm text-muted-foreground">
                      AI agents are preparing to join the conversation
                    </p>
                  </div>

                  {/* Animated dots */}
                  <div className="flex gap-2 mt-6">
                    {[0, 1, 2].map((index) => (
                      <motion.div
                        key={index}
                        className="h-2 w-2 rounded-full bg-foreground/60"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: index * 0.2,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((message, index) => {
                  const isOrchestrator = message.agent_id === "orchestrator";
                  const colorClasses = getAgentColor(message.agent_id);
                  const AgentIcon = getAgentIcon(message.agent_id);

                  return (
                    <motion.div
                      key={message.message_id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex gap-4"
                    >
                      <Avatar
                        className={`h-10 w-10 border-2 ${colorClasses} flex-shrink-0`}
                      >
                        {isOrchestrator && (
                          <AvatarImage
                            src="/images/moderator-avatar.png"
                            alt="Moderator"
                          />
                        )}
                        <AvatarFallback className={colorClasses}>
                          <AgentIcon className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {message.agent_name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Round {message.round_number}
                          </Badge>
                          {isOrchestrator && (
                            <Badge variant="secondary" className="text-xs">
                              Moderator
                            </Badge>
                          )}
                        </div>

                        <Card
                          className={`border-l-4 ${
                            isOrchestrator
                              ? "border-l-gray-400 bg-gray-50"
                              : `border-l-${colorClasses.split("-")[1]}-400`
                          }`}
                        >
                          <CardContent className="pt-3 pb-3">
                            <p className="text-sm leading-relaxed">
                              {message.content}
                            </p>
                          </CardContent>
                        </Card>

                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Loading indicator when debate is running but no new messages yet */}
              {!isComplete && !isCancelled && messages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-muted-foreground pl-14"
                >
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
                  <span className="text-sm italic">Agents are thinking...</span>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
