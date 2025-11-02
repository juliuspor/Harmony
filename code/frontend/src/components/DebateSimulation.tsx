import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  Zap,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { LiveDebateView } from "./LiveDebateView";
import { getConsensusResults } from "@/lib/api";
import type { DebateResponse } from "@/lib/api";

export interface ConsensusResult {
  score: number;
  confidence?: number; // Optional for backward compatibility, maps to semantic_alignment
  keyInsights: string[];
  keyAlignments?: string[];
  proArguments?: string[];
  conArguments?: string[];
  semanticAlignment?: number;
  agreementRatio?: number;
  convergenceScore?: number;
  resolutionRate?: number;
  sentiment: "positive" | "neutral" | "negative";
  processingTime?: number; // Optional
}

interface DebateSimulationProps {
  /** Duration in milliseconds for the simulation phase */
  duration?: number;
  /** Callback when simulation completes */
  onComplete?: (result: ConsensusResult) => void;
  /** Whether to auto-start the simulation */
  autoStart?: boolean;
  /** Custom result data (if provided, will be used instead of generating mock data) */
  result?: ConsensusResult;
  /** Estimated processing time in seconds (for display) */
  processingTime?: number;
  /** Optional debate ID for session persistence */
  debateId?: string;
}

export function DebateSimulation({
  duration = 4000,
  onComplete,
  autoStart = true,
  result: customResult,
  processingTime,
  debateId,
}: DebateSimulationProps) {
  const [isLoading, setIsLoading] = useState(autoStart);
  const [result, setResult] = useState<ConsensusResult | null>(customResult || null);
  const [progress, setProgress] = useState(0);
  const [showLiveView, setShowLiveView] = useState(false);
  const [completedDebateId, setCompletedDebateId] = useState<string | null>(null);
  // Use refs to track if loading has started and preserve state across re-renders
  const loadingStartedRef = useRef(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create a unique key for this debate session based on props
  const sessionKey = debateId
    ? `debate-loading-${debateId}`
    : `debate-loading-${duration}-${processingTime}`;

  // Handle debate completion from LiveDebateView
  const handleDebateComplete = async (debateData: DebateResponse) => {
    try {
      // Fetch consensus results
      if (!debateId) return;

      const consensus = await getConsensusResults(debateId);

      const consensusResult: ConsensusResult = {
        score: Math.round(consensus.consensus_score),
        semanticAlignment: consensus.semantic_alignment,
        agreementRatio: consensus.agreement_ratio,
        convergenceScore: consensus.convergence_score,
        resolutionRate: consensus.resolution_rate,
        sentiment: consensus.sentiment as "positive" | "neutral" | "negative",
        keyInsights: consensus.key_insights,
        keyAlignments: consensus.key_alignments,
        proArguments: consensus.pro_arguments,
        conArguments: consensus.con_arguments,
      };

      setResult(consensusResult);
      setIsLoading(false);
      setShowLiveView(false);
      setCompletedDebateId(debateId);

      // Clear session storage
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(`${sessionKey}-progress`);

      onComplete?.(consensusResult);
    } catch (error) {
      console.error("Failed to fetch consensus results:", error);
      // Still mark as complete even if consensus fetch fails
      setIsLoading(false);
      setShowLiveView(false);
    }
  };

  useEffect(() => {
    // If we have a debateId and autoStart is true, show live view immediately
    if (debateId && autoStart && !customResult) {
      setShowLiveView(true);
      setIsLoading(false);
      return;
    }

    // If custom result is provided or autoStart is false, don't start loading
    if (!autoStart || customResult) {
      loadingStartedRef.current = false;
      // Clear session storage when we have a result
      if (customResult) {
        sessionStorage.removeItem(sessionKey);
      }
      return;
    }

    // Check if loading has already started in this session (survives remounts)
    const hasStarted = sessionStorage.getItem(sessionKey) === "true";
    if (hasStarted) {
      loadingStartedRef.current = true;
      setIsLoading(true);
      // Restore progress from session storage if available
      const savedProgress = sessionStorage.getItem(`${sessionKey}-progress`);
      if (savedProgress) {
        const progressValue = parseFloat(savedProgress);
        if (!isNaN(progressValue)) {
          setProgress(progressValue);
        }
      }

      // Restart the progress interval if duration is 0 or negative
      if (duration <= 0) {
        progressIntervalRef.current = setInterval(() => {
          setProgress((prev) => {
            const next = prev >= 90 ? 90 : prev + (90 - prev) * 0.02;
            sessionStorage.setItem(`${sessionKey}-progress`, next.toString());
            return next;
          });
        }, 2000);
        return () => {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        };
      }

      // If duration is positive, we shouldn't be restoring (it should have completed)
      // But if we are restoring, just continue with the interval
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = Math.min(prev + 2, 100);
          sessionStorage.setItem(`${sessionKey}-progress`, next.toString());
          return next;
        });
      }, duration / 50);

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      };
    }

    // If loading has already started in this component instance, don't restart it
    if (loadingStartedRef.current) {
      return;
    }

    loadingStartedRef.current = true;
    sessionStorage.setItem(sessionKey, "true");

    // If duration is 0 or negative, stay in loading state indefinitely
    // (waiting for external result via customResult prop)
    if (duration <= 0) {
      setIsLoading(true);
      // More realistic progress: slower increment, cap at 90%
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          // Slow exponential progress that approaches 90% asymptotically
          const next = prev >= 90 ? 90 : prev + (90 - prev) * 0.02;
          // Persist progress to session storage
          sessionStorage.setItem(`${sessionKey}-progress`, next.toString());
          return next;
        });
      }, 2000); // Update every 2 seconds
      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      };
    }

    // Simulate progress for positive duration
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 2, 100);
        // Persist progress to session storage
        sessionStorage.setItem(`${sessionKey}-progress`, next.toString());
        return next;
      });
    }, duration / 50);

    // Complete simulation after duration
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      const generatedResult: ConsensusResult = {
        score: 87,
        confidence: 92,
        keyInsights: [
          "Strong alignment on core objectives",
          "Divergent perspectives on implementation timeline",
          "Consensus reached on resource allocation",
        ],
        sentiment: "positive" as const,
        processingTime: duration / 1000,
      };
      setResult(generatedResult);
      // Clear session storage when completed
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(`${sessionKey}-progress`);
      onComplete?.(generatedResult);
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [duration, onComplete, autoStart, customResult, sessionKey, debateId]);

  // If custom result is provided, show it immediately
  useEffect(() => {
    if (customResult) {
      setIsLoading(false);
      setResult(customResult);
      // Reset loading started flag when we receive a result
      loadingStartedRef.current = false;
      // Clear session storage when we receive a result
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(`${sessionKey}-progress`);
    }
  }, [customResult, sessionKey]);

  // Show live debate view if we have a debateId (either during debate or when revisiting)
  if (showLiveView && (debateId || completedDebateId)) {
    const isRevisiting = Boolean(completedDebateId || (debateId && result));
    return (
      <div className="space-y-6">
        {isRevisiting && (
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                Debate Transcript
              </h2>
              <p className="text-muted-foreground">Review the conversation between AI agents</p>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowLiveView(false)}
              className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/50 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Summary
            </Button>
          </div>
        )}
        <LiveDebateView
          debateId={(debateId || completedDebateId)!}
          onComplete={handleDebateComplete}
          viewOnly={isRevisiting}
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-visible">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <Card className="border-2 border-primary/30 rounded-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      rotate: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      },
                      scale: {
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }}
                  >
                    <Sparkles className="h-6 w-6 text-primary" />
                  </motion.div>
                  <div>
                    <CardTitle className="text-lg">Analyzing Your Ideas</CardTitle>
                    <CardDescription className="mt-1">
                      We're processing your ideas and finding patterns...
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Casual Loading Animation */}
                <div className="flex flex-col items-center justify-center py-12">
                  {/* Animated Icons */}
                  <div className="relative flex items-center justify-center gap-6 mb-8">
                    {[
                      { icon: MessageSquare, delay: 0 },
                      { icon: Sparkles, delay: 0.2 },
                      { icon: Zap, delay: 0.4 },
                    ].map(({ icon: Icon, delay }, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: [0.4, 1, 0.4],
                          y: [0, -10, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: delay,
                          ease: "easeInOut",
                        }}
                        className="p-4 rounded-full bg-primary/10"
                      >
                        <Icon className="h-8 w-8 text-primary" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Loading Dots */}
                  <div className="flex gap-2 mb-6">
                    {[0, 1, 2].map((index) => (
                      <motion.div
                        key={index}
                        className="h-3 w-3 rounded-full bg-primary"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: index * 0.2,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full max-w-md">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {progress < 30
                          ? "Creating AI agents..."
                          : progress < 60
                            ? "Simulating debate..."
                            : progress < 90
                              ? "Analyzing consensus..."
                              : "Finalizing results..."}
                      </span>
                      <span className="font-medium text-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-accent"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Status Messages */}
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {["Creating AI agents", "Running debate simulation", "Analyzing consensus"].map(
                      (msg, i) => (
                        <motion.div
                          key={msg}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{
                            opacity: progress > (i + 1) * 25 ? 1 : 0.4,
                            scale: progress > (i + 1) * 25 ? 1 : 0.9,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <Badge variant="secondary" className="text-xs">
                            {msg}
                          </Badge>
                        </motion.div>
                      )
                    )}
                  </div>

                  {/* Time estimate */}
                  {progress < 90 && processingTime !== undefined && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                      className="mt-6 flex items-center justify-center gap-2"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                      </motion.div>
                      <span className="text-xs text-muted-foreground/80 font-medium">
                        {processingTime < 120 ? (
                          <>~{Math.round(processingTime)} seconds</>
                        ) : (
                          <>
                            ~{Math.ceil(processingTime / 60)} minute
                            {Math.ceil(processingTime / 60) > 1 ? "s" : ""}
                          </>
                        )}
                      </span>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="mb-2"
                  >
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Consensus Reached
                    </h2>
                  </motion.div>
                  <p className="text-muted-foreground">
                    AI agents have synthesized collective intelligence
                  </p>
                </div>

                {/* Button to view transcript - always show when we have a debate ID */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowLiveView(true)}
                    disabled={!completedDebateId && !debateId}
                    className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/50 rounded-xl"
                  >
                    <MessageSquare className="h-4 w-4" />
                    View Transcript
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-6 md:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="relative overflow-hidden shadow-md bg-card border border-primary/30 rounded-2xl">
                  <CardContent className="pt-6 pb-6 relative">
                    <div>
                      <p className="text-sm font-semibold text-primary mb-3">Consensus Score</p>
                      <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                        {result.score}
                      </p>
                      <p className="text-xs font-medium text-primary">out of 100</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="relative overflow-hidden shadow-md bg-card border border-primary/30 rounded-2xl">
                  <CardContent className="pt-6 pb-6 relative">
                    <div>
                      <p className="text-sm font-semibold text-primary mb-3">
                        {result.semanticAlignment !== undefined ? "Alignment" : "Confidence"}
                      </p>
                      <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                        {result.confidence !== undefined
                          ? `${Math.round(result.confidence)}%`
                          : result.semanticAlignment !== undefined
                            ? `${Math.round(result.semanticAlignment)}%`
                            : "N/A"}
                      </p>
                      <p className="text-xs font-medium text-primary">
                        {result.semanticAlignment !== undefined ? "semantic match" : "reliability"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="relative overflow-hidden shadow-md bg-card border border-primary/30 rounded-2xl">
                  <CardContent className="pt-6 pb-6 relative">
                    <div>
                      <p className="text-sm font-semibold text-primary mb-3">Sentiment</p>
                      <p className="text-4xl font-bold capitalize bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                        {result.sentiment}
                      </p>
                      <p className="text-xs font-medium text-primary">overall tone</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="shadow-md bg-card border border-primary/30 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-foreground">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {result.keyInsights.map((insight, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-start gap-3 text-sm text-foreground leading-relaxed"
                      >
                        <div className="mt-2 h-2 w-2 rounded-full bg-gradient-to-r from-primary to-accent flex-shrink-0" />
                        <span>{insight}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Popular/Unpopular Ideas Grid */}
            {((result.proArguments && result.proArguments.length > 0) ||
              (result.conArguments && result.conArguments.length > 0)) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid gap-4 md:grid-cols-2"
              >
                {/* Popular Ideas */}
                {result.proArguments && result.proArguments.length > 0 && (
                  <Card className="shadow-md bg-card border border-green-200/50 dark:border-green-800/50 transition-shadow duration-300 hover:shadow-lg rounded-2xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-bold text-green-700 dark:text-green-400">
                        Popular Ideas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.proArguments.map((argument, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            className="flex items-start gap-3 text-sm text-foreground leading-relaxed"
                          >
                            <div className="mt-2 h-2 w-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex-shrink-0" />
                            <span>{argument}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Unpopular Ideas */}
                {result.conArguments && result.conArguments.length > 0 && (
                  <Card className="shadow-md bg-card border border-red-200/50 dark:border-red-800/50 transition-shadow duration-300 hover:shadow-lg rounded-2xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-bold text-red-700 dark:text-red-400">
                        Unpopular Ideas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.conArguments.map((argument, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            className="flex items-start gap-3 text-sm text-foreground leading-relaxed"
                          >
                            <div className="mt-2 h-2 w-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex-shrink-0" />
                            <span>{argument}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
