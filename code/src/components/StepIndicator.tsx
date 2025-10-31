import { Check } from "lucide-react";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.number} className="flex flex-1 items-center">
          <div className="flex items-center">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors ${
                step.number < currentStep
                  ? "border-primary bg-primary text-primary-foreground"
                  : step.number === currentStep
                  ? "border-primary bg-background text-primary"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {step.number < currentStep ? <Check className="h-6 w-6" /> : <span className="text-lg font-bold">{step.number}</span>}
            </div>
            <div className="ml-4">
              <p
                className={`font-semibold ${
                  step.number <= currentStep ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`mx-8 h-0.5 flex-1 transition-colors ${
                step.number < currentStep ? "bg-primary" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
