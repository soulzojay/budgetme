
import { BudgetState, Category, GoalType } from '../types';

const STORAGE_KEY = 'stash_app_data';

const DEFAULT_STATE: BudgetState = {
  profile: {
    name: 'Student Explorer',
    monthlyAllowance: 2000,
    currency: 'GH₵'
  },
  expenses: [],
  goals: [
    {
      id: '1',
      title: 'New MacBook',
      targetAmount: 25000,
      currentAmount: 2500,
      // Fix: Added missing properties to match SavingGoal interface
      type: GoalType.LongTerm,
      durationMonths: 12
    }
  ],
  streak: 3,
  notifications: [],
  extraIncome: 0
};

export const storageService = {
  saveData: (data: BudgetState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  loadData: (): BudgetState => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const loaded = JSON.parse(saved);
        return { ...DEFAULT_STATE, ...loaded, extraIncome: loaded.extraIncome ?? 0 };
      } catch (e) {
        return DEFAULT_STATE;
      }
    }
    return DEFAULT_STATE;
  }
};
