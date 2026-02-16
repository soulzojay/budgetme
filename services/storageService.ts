
import { BudgetState, Category, GoalType } from '../types';

const STORAGE_KEY_PREFIX = 'stash_app_data';

function getStorageKey(userEmail?: string): string {
  return userEmail ? `${STORAGE_KEY_PREFIX}_${encodeURIComponent(userEmail)}` : STORAGE_KEY_PREFIX;
}

const DEFAULT_STATE: BudgetState = {
  profile: {
    name: 'Student Explorer',
    monthlyAllowance: 0,
    currency: 'GH₵'
  },
  expenses: [],
  goals: [],
  streak: 0,
  notifications: [],
  extraIncome: 0
};

export const storageService = {
  saveData: (data: BudgetState, userEmail?: string) => {
    localStorage.setItem(getStorageKey(userEmail), JSON.stringify(data));
  },
  loadData: (userEmail?: string): BudgetState => {
    const saved = localStorage.getItem(getStorageKey(userEmail));
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
