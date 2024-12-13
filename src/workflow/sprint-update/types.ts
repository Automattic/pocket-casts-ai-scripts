export type ProgressStep = {
  step: number;
  totalSteps: number;
  message: string;
  detail?: string;
  isComplete?: boolean;
};

export type TeamName = "Android" | "iOS" | "Web" | "Backend";

export interface GithubSummary {
  reportContent: string;
  pullRequests: any[]; // Keeping the existing type for now
} 