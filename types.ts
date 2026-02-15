
export enum Category {
  Food = 'Food',
  Transport = 'Transport',
  Study = 'Study',
  Social = 'Social',
  Entertainment = 'Entertainment',
  Bills = 'Bills',
  Other = 'Other'
}

export enum GoalType {
  ShortTerm = 'Short-term', // e.g., Monthly/Semester
  LongTerm = 'Long-term'    // e.g., Yearly/Multi-month
}

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
}

export interface SavingGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  type: GoalType;
  durationMonths: number;
  deadline?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'reminder' | 'alert' | 'success';
  timestamp: string;
  read: boolean;
}

export interface UserProfile {
  name: string;
  monthlyAllowance: number;
  currency: string;
}

export interface BudgetState {
  profile: UserProfile;
  expenses: Expense[];
  goals: SavingGoal[];
  streak: number;
  notifications: Notification[];
  /** Extra income added (e.g. side gig, gift) — increases available spending */
  extraIncome: number;
}

export interface AIAdvice {
  status: 'excellent' | 'good' | 'warning' | 'critical';
  headline: string;
  summary: string;
  tips: string[];
  suggestedReductions: { category: Category; amount: number; reason: string }[];
  isDebtWarning: boolean;
  achievabilityScore: number; // 0-100
}
