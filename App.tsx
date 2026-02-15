
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Target, 
  BrainCircuit, 
  Trophy,
  ArrowUpCircle,
  ArrowDownCircle,
  Coins,
  ChevronRight,
  TrendingUp,
  X,
  Bell,
  AlertTriangle,
  Clock,
  Calendar,
  Wallet,
  Sparkles,
  ArrowRight,
  Pencil,
  Banknote,
  LogOut
} from 'lucide-react';
import { getSession, logout as authLogout } from './auth';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip
} from 'recharts';
import { storageService } from './services/storageService';
import { getBudgetAdvice } from './services/aiService';
import { BudgetState, Expense, Category, SavingGoal, AIAdvice, GoalType, Notification } from './types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#64748b'];

/** Generate a unique id; works in older browsers and non-HTTPS contexts where crypto.randomUUID may be missing */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// --- Enhanced Helper Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 ${className}`}>
    {children}
  </div>
);

const CategoryBadge: React.FC<{ category: Category }> = ({ category }) => {
  const styles: Record<string, string> = {
    [Category.Food]: 'bg-amber-100 text-amber-700',
    [Category.Transport]: 'bg-blue-100 text-blue-700',
    [Category.Study]: 'bg-indigo-100 text-indigo-700',
    [Category.Social]: 'bg-rose-100 text-rose-700',
    [Category.Entertainment]: 'bg-purple-100 text-purple-700',
    [Category.Bills]: 'bg-red-100 text-red-700',
    [Category.Other]: 'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[category]}`}>
      {category}
    </span>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{ touchAction: 'manipulation' }}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'manipulation' }}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-800">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors touch-manipulation"
            style={{ touchAction: 'manipulation' }}
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function App() {
  const navigate = useNavigate();
  const session = getSession()!;
  const [data, setData] = useState<BudgetState>(() => {
    const loaded = storageService.loadData(session.email);
    return {
      ...loaded,
      notifications: loaded.notifications || [],
      profile: { ...loaded.profile, name: session.name },
    };
  });
  const [activeTab, setActiveTab] = useState<'dash' | 'goals' | 'coach' | 'notifs'>('dash');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [customGoalAmounts, setCustomGoalAmounts] = useState<Record<string, string>>({});
  const [aiAdvice, setAiAdvice] = useState<AIAdvice | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // Financial Stats
  const totalSpent = useMemo(() => data.expenses.reduce((sum, e) => sum + e.amount, 0), [data.expenses]);
  const extraIncome = data.extraIncome ?? 0;
  const availableBudget = data.profile.monthlyAllowance + extraIncome;
  const isInDebt = totalSpent > availableBudget;
  const remaining = availableBudget - totalSpent;
  const progressPercent = availableBudget > 0 ? Math.min((totalSpent / availableBudget) * 100, 100) : 0;
  
  const totalGoalTarget = useMemo(() => data.goals.reduce((sum, g) => sum + (g.targetAmount / g.durationMonths), 0), [data.goals]);

  const chartData = useMemo(() => {
    const summary = data.expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(summary).map(([name, value]) => ({ name, value }));
  }, [data.expenses]);

  useEffect(() => {
    storageService.saveData(data, session.email);
  }, [data, session.email]);

  const addNotification = (title: string, message: string, type: Notification['type']) => {
    const newNotif: Notification = {
      id: generateId(),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    setData(prev => ({ ...prev, notifications: [newNotif, ...prev.notifications] }));
  };

  const handleAddExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const newExpense: Expense = {
      id: generateId(),
      amount,
      category: formData.get('category') as Category,
      description: (formData.get('description') as string) || (formData.get('category') as string),
      date: new Date().toISOString(),
    };
    
    setData(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses] }));
    setIsAddExpenseOpen(false);

    if (totalSpent + amount > data.profile.monthlyAllowance) {
      addNotification('Limit Reached!', 'You just exceeded your monthly allowance. Take a breath and check the coach.', 'alert');
    } else {
      addNotification('Logged!', 'Expense successfully added to your stash.', 'success');
    }
  };

  const handleGoalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const targetAmount = Number(formData.get('targetAmount'));
    const type = formData.get('type') as GoalType;
    const durationMonths = Number(formData.get('durationMonths'));

    if (editingGoalId) {
      setData(prev => ({
        ...prev,
        goals: prev.goals.map(g =>
          g.id === editingGoalId
            ? { ...g, title, targetAmount, type, durationMonths }
            : g
        ),
      }));
      setIsAddGoalOpen(false);
      setEditingGoalId(null);
      addNotification('Goal Updated', `"${title}" has been updated.`, 'success');
    } else {
      const newGoal: SavingGoal = {
        id: generateId(),
        title,
        targetAmount,
        currentAmount: 0,
        type,
        durationMonths,
      };
      setData(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
      setIsAddGoalOpen(false);
      addNotification('Goal Unlocked', `Let's go! You're now saving for ${newGoal.title}.`, 'success');
    }
  };

  const askCoach = async () => {
    setIsThinking(true);
    const advice = await getBudgetAdvice(data);
    setAiAdvice(advice);
    setIsThinking(false);
    setActiveTab('coach');
  };

  const deleteExpense = (id: string) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id)
    }));
  };

  const handleAddIncome = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const source = (formData.get('source') as string)?.trim() || 'Extra income';
    setData(prev => ({ ...prev, extraIncome: (prev.extraIncome ?? 0) + amount }));
    setIsAddIncomeOpen(false);
    addNotification('Income added', `${data.profile.currency}${amount.toLocaleString()} from ${source} added to your available spending.`, 'success');
  };

  const unreadCount = data.notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen pb-32 max-w-2xl mx-auto px-6 pt-10">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-[900] text-slate-900 tracking-tight leading-tight">Stash</h1>
          <p className="text-slate-500 font-bold text-sm">Welcome back, {session.name.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => {
              setActiveTab('notifs');
              setData(prev => ({ ...prev, notifications: prev.notifications.map(n => ({...n, read: true})) }));
            }}
            className="relative p-4 bg-white rounded-3xl text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 transition-all active:scale-95"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-3 right-3 w-3 h-3 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </button>
          <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2.5 sm:px-5 sm:py-3 rounded-3xl border border-amber-200 shadow-sm">
            <Trophy size={20} />
            <span className="font-extrabold text-sm">{data.streak} Days</span>
          </div>
          <button
            onClick={() => {
              authLogout();
              navigate('/login', { replace: true });
            }}
            className="p-4 bg-white rounded-3xl text-slate-400 hover:text-rose-600 shadow-sm border border-slate-100 transition-all active:scale-95"
            title="Log out"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="space-y-8">
        
        {activeTab === 'dash' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Main Balance Card */}
            <div className={`relative overflow-hidden rounded-[3rem] p-1 shadow-2xl transition-all duration-500 ${isInDebt ? 'bg-rose-500' : 'bg-indigo-600'}`}>
               <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent z-0"></div>
               <div className="relative z-10 bg-white/5 backdrop-blur-xl p-10 text-white flex flex-col items-center text-center">
                  <div className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                    {isInDebt ? 'Account Deficit' : 'Available Spending'}
                  </div>
                  <h2 className="text-6xl font-[900] mb-8 tracking-tighter">
                    {data.profile.currency} {Math.abs(remaining).toLocaleString()}
                  </h2>
                  
                  <div className="w-full space-y-4">
                    <div className="flex justify-between items-end text-xs font-bold uppercase tracking-widest text-white/60">
                      <span>Budget</span>
                      <span className="text-white">{data.profile.currency} {availableBudget.toLocaleString()}</span>
                    </div>
                    {extraIncome > 0 && (
                      <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Includes {data.profile.currency}{extraIncome.toLocaleString()} extra income</p>
                    )}
                    <div className="h-5 w-full bg-black/10 rounded-full overflow-hidden p-1">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isInDebt ? 'bg-rose-300' : 'bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)]'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-black text-white/50 px-1">
                      <span>0%</span>
                      <span>{Math.round(progressPercent)}% SPENT</span>
                      <span>100%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddIncomeOpen(true)}
                      className="mt-2 w-full py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-black uppercase tracking-widest border border-white/20 transition-all active:scale-[0.98]"
                    >
                      + Add income
                    </button>
                  </div>
               </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-5">
              <button 
                onClick={() => setIsAddExpenseOpen(true)}
                className="group flex flex-col items-start gap-4 bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all touch-manipulation"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                type="button"
              >
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <PlusCircle size={28} />
                </div>
                <span className="font-extrabold text-slate-800 text-lg">Log Spending</span>
              </button>
              <button 
                onClick={() => setIsAddIncomeOpen(true)}
                className="group flex flex-col items-start gap-4 bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Banknote size={28} />
                </div>
                <span className="font-extrabold text-slate-800 text-lg">Add Income</span>
              </button>
              <button 
                onClick={askCoach}
                disabled={isThinking}
                className="group flex flex-col items-start gap-4 bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all col-span-2"
              >
                <div className={`p-4 bg-purple-50 text-purple-600 rounded-3xl group-hover:bg-purple-600 group-hover:text-white transition-all ${isThinking ? 'animate-pulse' : ''}`}>
                  <BrainCircuit size={28} />
                </div>
                <span className="font-extrabold text-slate-800 text-lg">AI Insight</span>
              </button>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="h-full flex flex-col">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-500" />
                  Categories
                </h3>
                <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
                  {chartData.length > 0 ? (
                    <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                          {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                       <span className="text-xl font-black text-slate-800">{data.profile.currency}{totalSpent.toLocaleString()}</span>
                    </div>
                    </>
                  ) : <p className="text-slate-300 font-bold text-sm">Add spending to see charts</p>}
                </div>
              </Card>

              <Card className="flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-black text-slate-900">Recent</h3>
                   <span className="text-indigo-600 font-bold text-xs cursor-pointer hover:underline">View All</span>
                </div>
                <div className="space-y-5 flex-1 overflow-y-auto max-h-[240px] pr-2">
                  {data.expenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-300">
                      <Wallet size={32} className="mb-2 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">Clear stash</p>
                    </div>
                  ) : data.expenses.slice(0, 10).map(exp => (
                    <div key={exp.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CategoryBadge category={exp.category} />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm leading-tight">{exp.description}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(exp.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-700 text-sm">-{data.profile.currency}{exp.amount}</span>
                        <button onClick={() => deleteExpense(exp.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <header className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Your Dreams</h2>
                <p className="text-slate-500 font-bold text-sm">Saving for what matters most.</p>
              </div>
              <button 
                onClick={() => { setEditingGoalId(null); setIsAddGoalOpen(true); }}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 active:scale-95 transition-all"
              >
                New Goal
              </button>
            </header>

            <div className="grid gap-6">
              {data.goals.length === 0 ? (
                <div className="text-center py-20 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <Target size={64} className="mx-auto text-slate-200 mb-6" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active goals found</p>
                </div>
              ) : data.goals.map(goal => (
                <Card key={goal.id} className="group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                     <Target size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-black text-2xl text-slate-900 tracking-tight">{goal.title}</h4>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${goal.type === GoalType.ShortTerm ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                            {goal.type}
                          </span>
                          <button
                            onClick={() => { setEditingGoalId(goal.id); setIsAddGoalOpen(true); }}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                            title="Edit goal"
                          >
                            <Pencil size={18} />
                          </button>
                        </div>
                        <div className="flex items-center gap-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-300"/> {goal.durationMonths} Months left</span>
                          <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-amber-400"/> Target: {data.profile.currency}{goal.targetAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Progress</p>
                          <span className="text-3xl font-black text-emerald-600">{data.profile.currency}{goal.currentAmount.toLocaleString()}</span>
                        </div>
                        <span className="text-xl font-black text-slate-800 bg-slate-100 px-4 py-1.5 rounded-2xl">{Math.round((goal.currentAmount / goal.targetAmount) * 100)}%</span>
                      </div>
                      <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden p-1.5 border border-slate-200/50">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%` }} />
                      </div>
                    </div>

                    <div className="mt-8 space-y-3">
                      <div className="flex gap-3">
                        {[500, 1000].map(val => (
                          <button 
                            key={val}
                            onClick={() => setData(prev => ({
                              ...prev,
                              goals: prev.goals.map(g => g.id === goal.id ? { ...g, currentAmount: g.currentAmount + val } : g)
                            }))}
                            className="flex-1 py-4 rounded-2xl bg-white border border-slate-200 text-xs font-black text-slate-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all active:scale-95 shadow-sm"
                          >
                            ADD {data.profile.currency}{val}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{data.profile.currency}</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Custom amount"
                          value={customGoalAmounts[goal.id] ?? ''}
                          onChange={e => setCustomGoalAmounts(prev => ({ ...prev, [goal.id]: e.target.value }))}
                          className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-800 placeholder:text-slate-300 focus:border-emerald-500 focus:bg-white outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = Number(customGoalAmounts[goal.id]);
                            if (!Number.isNaN(val) && val > 0) {
                              setData(prev => ({
                                ...prev,
                                goals: prev.goals.map(g => g.id === goal.id ? { ...g, currentAmount: g.currentAmount + val } : g)
                              }));
                              setCustomGoalAmounts(prev => ({ ...prev, [goal.id]: '' }));
                            }
                          }}
                          disabled={!customGoalAmounts[goal.id] || Number(customGoalAmounts[goal.id]) <= 0}
                          className="py-3.5 px-5 rounded-2xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'coach' && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <header className="flex items-center gap-6">
              <div className="p-5 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-200">
                <BrainCircuit size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">AI Coach</h2>
                <p className="text-slate-500 font-bold text-sm">Student Intelligence at work.</p>
              </div>
            </header>

            {isThinking ? (
              <div className="text-center py-24 flex flex-col items-center">
                <div className="relative mb-8">
                   <div className="w-24 h-24 border-8 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                   <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" size={28} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Analyzing your Stash...</h3>
                <p className="text-slate-400 font-bold text-sm animate-pulse uppercase tracking-[0.2em]">Running Financial Simulations</p>
              </div>
            ) : !aiAdvice ? (
              <Card className="text-center py-20 flex flex-col items-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8">
                  <BrainCircuit size={48} className="text-indigo-400" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Want a financial check-up?</h3>
                <p className="text-slate-500 mb-10 max-w-sm font-medium leading-relaxed">Our AI analyzes your spending speed, goal progress, and categories to give you actionable student hacks.</p>
                <button onClick={askCoach} className="bg-indigo-600 text-white px-12 py-5 rounded-3xl font-black shadow-2xl shadow-indigo-200 hover:scale-105 transition-all active:scale-95">Get AI Analysis</button>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className={`p-10 rounded-[2.5rem] shadow-xl border-2 ${aiAdvice.isDebtWarning ? 'bg-rose-50 border-rose-100 text-rose-900' : 'bg-indigo-600 text-white border-transparent'}`}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-3xl font-black leading-tight tracking-tight">{aiAdvice.headline}</h3>
                    <div className={`${aiAdvice.isDebtWarning ? 'bg-rose-200 text-rose-800' : 'bg-white/20 text-white'} px-5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest`}>
                      Score: {aiAdvice.achievabilityScore}%
                    </div>
                  </div>
                  <p className="font-bold opacity-90 text-sm leading-relaxed mb-6">{aiAdvice.summary}</p>
                  <div className={`h-2 w-full rounded-full ${aiAdvice.isDebtWarning ? 'bg-rose-200' : 'bg-white/20'}`}>
                    <div className={`h-full rounded-full ${aiAdvice.isDebtWarning ? 'bg-rose-600' : 'bg-white'}`} style={{ width: `${aiAdvice.achievabilityScore}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <Card className="border-emerald-100 bg-emerald-50/10">
                    <h4 className="font-black text-emerald-900 mb-6 flex items-center gap-3 text-lg">
                      <ArrowUpCircle size={24} className="text-emerald-500" /> Insight Tips
                    </h4>
                    <ul className="space-y-4">
                      {aiAdvice.tips.map((tip, i) => (
                        <li key={i} className="flex gap-4 text-sm font-bold text-emerald-800 items-start">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-[10px]">
                            {i+1}
                          </div>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                  
                  {aiAdvice.suggestedReductions.length > 0 && (
                    <Card className="border-rose-100 bg-rose-50/10">
                      <h4 className="font-black text-rose-900 mb-6 flex items-center gap-3 text-lg">
                        <ArrowDownCircle size={24} className="text-rose-500" /> Recommended Cuts
                      </h4>
                      <div className="grid gap-4">
                        {aiAdvice.suggestedReductions.map((red, i) => (
                          <div key={i} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-rose-100">
                            <div className="flex justify-between items-center mb-3">
                               <span className="font-black text-rose-700 text-sm uppercase tracking-widest">{red.category}</span>
                               <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-black">-{data.profile.currency}{red.amount}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-500">{red.reason}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifs' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Activity Log</h2>
            <div className="space-y-4">
              {data.notifications.length === 0 ? (
                <div className="text-center py-20 text-slate-300 flex flex-col items-center">
                   <Bell size={48} className="opacity-10 mb-4" />
                   <p className="font-black uppercase tracking-widest text-xs">No notifications yet</p>
                </div>
              ) : data.notifications.map(notif => (
                <Card key={notif.id} className="relative group transition-all hover:shadow-lg">
                  <div className="flex gap-6 items-center">
                    <div className={`p-4 rounded-3xl shrink-0 ${notif.type === 'alert' ? 'bg-rose-100 text-rose-600' : notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      {notif.type === 'alert' ? <AlertTriangle size={24} /> : notif.type === 'success' ? <Trophy size={24} /> : <Sparkles size={24} />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 text-lg leading-tight">{notif.title}</h4>
                      <p className="text-sm font-bold text-slate-500 mt-1">{notif.message}</p>
                      <p className="text-[10px] font-black text-slate-300 uppercase mt-4 tracking-widest">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <ChevronRight className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modern Floating Modals */}
      <Modal isOpen={isAddExpenseOpen} onClose={() => setIsAddExpenseOpen(false)} title="Log Transaction">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleAddExpense(e);
          }} 
          className="space-y-8"
          noValidate
        >
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Amount</label>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-3xl text-slate-300 transition-colors group-focus-within:text-indigo-600">{data.profile.currency}</span>
              <input 
                name="amount" 
                type="number" 
                step="0.01" 
                required 
                autoFocus 
                className="w-full pl-24 pr-8 py-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-600 focus:bg-white transition-all font-black text-4xl text-slate-800 outline-none" 
                placeholder="0.00"
                inputMode="decimal"
                style={{ touchAction: 'manipulation' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
             <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Category</label>
               <select 
                 name="category" 
                 className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white font-bold appearance-none outline-none"
                 style={{ touchAction: 'manipulation', WebkitAppearance: 'none', MozAppearance: 'none' }}
                 defaultValue={Category.Food}
                 required
               >
                 {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">What's it for?</label>
               <input 
                 name="description" 
                 type="text" 
                 className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white font-bold outline-none" 
                 placeholder="Lunch at campus..."
                 style={{ touchAction: 'manipulation' }}
               />
             </div>
          </div>
          <button 
            type="submit" 
            className="w-full py-6 bg-indigo-600 text-white font-black text-lg rounded-[2rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] active:scale-95 transition-all touch-manipulation"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            Add to Stash
          </button>
        </form>
      </Modal>

      <Modal isOpen={isAddGoalOpen} onClose={() => { setIsAddGoalOpen(false); setEditingGoalId(null); }} title={editingGoalId ? 'Edit Goal' : 'Start New Goal'}>
        <form key={editingGoalId ?? 'new'} onSubmit={handleGoalSubmit} className="space-y-6">
          {(() => {
            const goalToEdit = editingGoalId ? data.goals.find(g => g.id === editingGoalId) : null;
            return (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">What are you saving for?</label>
                  <input name="title" type="text" required defaultValue={goalToEdit?.title ?? ''} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 font-bold outline-none" placeholder="New MacBook, Trip to Europe..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Target ({data.profile.currency})</label>
                    <input name="targetAmount" type="number" required defaultValue={goalToEdit?.targetAmount ?? ''} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 font-black outline-none" placeholder="5000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Months</label>
                    <input name="durationMonths" type="number" required defaultValue={goalToEdit?.durationMonths ?? ''} className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 font-black outline-none" placeholder="6" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Goal Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center justify-center p-5 border-2 border-slate-100 rounded-[1.5rem] cursor-pointer hover:bg-slate-50 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 transition-all">
                      <input type="radio" name="type" value={GoalType.ShortTerm} defaultChecked={!goalToEdit || goalToEdit.type === GoalType.ShortTerm} className="hidden" />
                      <span className="text-xs font-black uppercase tracking-widest">Short-term</span>
                    </label>
                    <label className="flex items-center justify-center p-5 border-2 border-slate-100 rounded-[1.5rem] cursor-pointer hover:bg-slate-50 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 transition-all">
                      <input type="radio" name="type" value={GoalType.LongTerm} defaultChecked={goalToEdit?.type === GoalType.LongTerm} className="hidden" />
                      <span className="text-xs font-black uppercase tracking-widest">Long-term</span>
                    </label>
                  </div>
                </div>
                <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black text-lg rounded-[2rem] shadow-[0_20px_40px_rgba(79,70,229,0.3)] mt-4 active:scale-95 transition-all">{editingGoalId ? 'Save Changes' : 'Unlock Goal'}</button>
              </>
            );
          })()}
        </form>
      </Modal>

      <Modal isOpen={isAddIncomeOpen} onClose={() => setIsAddIncomeOpen(false)} title="Add income">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleAddIncome(e);
          }} 
          className="space-y-6"
          noValidate
        >
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Amount</label>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-3xl text-slate-300 transition-colors group-focus-within:text-emerald-600">{data.profile.currency}</span>
              <input 
                name="amount" 
                type="number" 
                step="0.01" 
                min="0.01" 
                required 
                autoFocus 
                className="w-full pl-24 pr-8 py-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-emerald-600 focus:bg-white transition-all font-black text-4xl text-slate-800 outline-none" 
                placeholder="0.00"
                inputMode="decimal"
                style={{ touchAction: 'manipulation' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Source (optional)</label>
            <input 
              name="source" 
              type="text" 
              className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-emerald-600 focus:bg-white font-bold outline-none" 
              placeholder="Side gig, gift, refund..."
              style={{ touchAction: 'manipulation' }}
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-6 bg-emerald-600 text-white font-black text-lg rounded-[2rem] shadow-[0_20px_40px_rgba(5,150,105,0.3)] active:scale-95 transition-all touch-manipulation"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            Add to available spending
          </button>
        </form>
      </Modal>

      {/* Floating Navigation Dock */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/70 backdrop-blur-2xl rounded-full p-2 border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex justify-between items-center z-40 transition-all duration-500">
        <button 
          onClick={() => setActiveTab('dash')} 
          className={`flex-1 py-4 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'dash' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <LayoutDashboard size={22} strokeWidth={activeTab === 'dash' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('goals')} 
          className={`flex-1 py-4 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'goals' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Target size={22} strokeWidth={activeTab === 'goals' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Goals</span>
        </button>
        <button 
          onClick={() => setActiveTab('coach')} 
          className={`flex-1 py-4 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'coach' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <BrainCircuit size={22} strokeWidth={activeTab === 'coach' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Coach</span>
        </button>
        <button 
          onClick={() => setActiveTab('notifs')} 
          className={`flex-1 py-4 rounded-full flex flex-col items-center gap-1 transition-all ${activeTab === 'notifs' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Bell size={22} strokeWidth={activeTab === 'notifs' ? 2.5 : 2} />
          <span className="text-[8px] font-black uppercase tracking-[0.15em]">Log</span>
        </button>
      </nav>
    </div>
  );
}
