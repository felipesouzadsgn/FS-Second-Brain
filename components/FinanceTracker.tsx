import React, { useState, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, CreditCard, DollarSign, Send, Bot, Sparkles, User, MoreHorizontal, Plus, Calendar, Tag, Trash2, X, Check } from 'lucide-react';
import { Transaction } from '../types';
import { GoogleGenAI } from "@google/genai";

const data = [
  { name: 'Week 1', amt: 2400 },
  { name: 'Week 2', amt: 1398 },
  { name: 'Week 3', amt: 9800 },
  { name: 'Week 4', amt: 3908 },
];

const initialTransactions: Transaction[] = [
  { id: '1', description: 'AWS Subscription', amount: 45.00, category: 'Subscription', date: '2023-10-24', type: 'expense' },
  { id: '2', description: 'Freelance Project X', amount: 2400.00, category: 'Income', date: '2023-10-23', type: 'income' },
  { id: '3', description: 'Whole Foods Market', amount: 124.50, category: 'Groceries', date: '2023-10-22', type: 'expense' },
  { id: '4', description: 'Gym Membership', amount: 60.00, category: 'Health', date: '2023-10-20', type: 'expense' },
];

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
}

const FinanceTracker: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
      { id: 'init', role: 'model', text: "Hello. I am your Nexus Financial Advisor. I have access to your current ledger. How can I help you optimize your allocation today?" }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const calculateTotals = () => {
      const income = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
      return { income, expenses, balance: 24592 + (income - expenses) }; // Mock starting balance + flow
  };

  const totals = calculateTotals();

  // CRUD Operations
  const handleSaveTransaction = (transaction: Transaction) => {
      if (editingTransaction) {
          setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
      } else {
          setTransactions(prev => [transaction, ...prev]);
      }
      setIsModalOpen(false);
      setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string) => {
      setTransactions(prev => prev.filter(t => t.id !== id));
      setIsModalOpen(false);
      setEditingTransaction(null);
  };

  const openNewTransactionModal = () => {
      setEditingTransaction(null);
      setIsModalOpen(true);
  };

  const openEditTransactionModal = (t: Transaction) => {
      setEditingTransaction(t);
      setIsModalOpen(true);
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim()) return;

      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
      setChatHistory(prev => [...prev, userMsg]);
      setChatInput('');
      setIsAiLoading(true);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          // Construct Context
          const contextData = {
              currentBalance: totals.balance,
              monthlyIncome: totals.income,
              monthlyExpenses: totals.expenses,
              savingsRate: "62%",
              recentTransactions: transactions.map(t => `${t.date}: ${t.description} ($${t.amount}) - ${t.category} [${t.type}]`).join('\n')
          };

          const prompt = `
            You are the Nexus Financial Advisor, a sophisticated, minimalist AI dedicated to financial literacy and wealth management.
            
            Current Financial Context:
            ${JSON.stringify(contextData, null, 2)}
            
            User Query: "${userMsg.text}"
            
            Guidelines:
            1. Act as a personal CFO. Be concise, objective, and strategic.
            2. Use the provided data to give specific advice (e.g., refer to specific recent transactions).
            3. Educate the user on financial concepts (compound interest, asset allocation) if relevant.
            4. If the user asks to "log" or "add" something, acknowledge it and explain that you've noted it for the strategy (even if you can't modify the database directly yet).
            5. Keep responses short and visually easy to read (use bullet points).
          `;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-latest',
            contents: prompt,
          });

          const aiResponseText = response.text || "I'm analyzing the market data, please hold.";
          
          setChatHistory(prev => [...prev, { 
              id: (Date.now() + 1).toString(), 
              role: 'model', 
              text: aiResponseText 
          }]);

      } catch (error) {
          console.error("AI Error:", error);
          setChatHistory(prev => [...prev, { 
              id: (Date.now() + 1).toString(), 
              role: 'model', 
              text: "Connectivity to financial mainframe interrupted. Please try again." 
          }]);
      } finally {
          setIsAiLoading(false);
      }
  };

  return (
    <div className="h-full flex overflow-hidden relative">
       {/* LEFT SIDE: Visual Dashboard (65%) */}
       <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-r border-nexus-border">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-light text-nexus-text">Financial Overview</h2>
                    <p className="text-sm text-nexus-muted">Cash Flow & Allocation</p>
                </div>
                <button 
                    onClick={openNewTransactionModal}
                    className="flex items-center gap-2 bg-nexus-surface hover:bg-nexus-border text-nexus-text px-4 py-2 rounded-sm text-sm border border-nexus-border transition-all"
                >
                    <Plus size={14} /> Add Transaction
                </button>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-nexus-surface p-5 rounded-lg border border-nexus-border">
                    <p className="text-[10px] text-nexus-muted uppercase tracking-wider mb-2">Total Balance</p>
                    <h3 className="text-xl font-mono text-nexus-text">${totals.balance.toLocaleString()}</h3>
                </div>
                <div className="bg-nexus-surface p-5 rounded-lg border border-nexus-border">
                    <p className="text-[10px] text-nexus-muted uppercase tracking-wider mb-2">Monthly Income</p>
                    <h3 className="text-lg font-mono text-green-500 flex items-center">
                        <ArrowUpRight size={14} className="mr-1"/> ${totals.income.toLocaleString()}
                    </h3>
                </div>
                <div className="bg-nexus-surface p-5 rounded-lg border border-nexus-border">
                    <p className="text-[10px] text-nexus-muted uppercase tracking-wider mb-2">Monthly Expenses</p>
                    <h3 className="text-lg font-mono text-red-400 flex items-center">
                        <ArrowDownRight size={14} className="mr-1"/> ${totals.expenses.toLocaleString()}
                    </h3>
                </div>
                <div className="bg-nexus-surface p-5 rounded-lg border border-nexus-border">
                    <p className="text-[10px] text-nexus-muted uppercase tracking-wider mb-2">Savings Rate</p>
                    <h3 className="text-xl font-mono text-nexus-text">62%</h3>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6">
                {/* Chart */}
                <div className="bg-nexus-surface border border-nexus-border rounded-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-medium text-nexus-muted uppercase tracking-wider">Monthly Spending</h3>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#121212', border: '1px solid #2e2e2e', borderRadius: '4px' }}
                                    itemStyle={{ color: '#e5e5e5', fontFamily: 'monospace' }}
                                    cursor={{fill: '#2e2e2e', opacity: 0.4}}
                                />
                                <Bar dataKey="amt" fill="#e5e5e5" radius={[4, 4, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 2 ? '#ffffff' : '#404040'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Transactions */}
                <div className="bg-nexus-surface border border-nexus-border rounded-lg p-6 flex flex-col">
                    <h3 className="text-sm font-medium text-nexus-muted uppercase tracking-wider mb-4">Recent Transactions</h3>
                    <div className="space-y-3">
                        {transactions.map(t => (
                            <div 
                                key={t.id} 
                                onClick={() => openEditTransactionModal(t)}
                                className="flex items-center justify-between p-2 hover:bg-nexus-bg/50 rounded transition-colors cursor-pointer group border-b border-nexus-border/30 last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full bg-nexus-bg border border-nexus-border flex items-center justify-center transition-colors ${t.type === 'income' ? 'text-green-500' : 'text-nexus-muted group-hover:text-white'}`}>
                                        {t.type === 'income' ? <DollarSign size={14}/> : <CreditCard size={14}/>}
                                    </div>
                                    <div>
                                        <p className="text-sm text-nexus-text">{t.description}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] text-nexus-muted uppercase">{t.category} • {t.date}</p>
                                            {['Subscription', 'Fixed Cost'].includes(t.category) && (
                                                <span className="text-[8px] border border-nexus-border px-1 rounded text-nexus-muted uppercase">Recurring</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-sm font-mono ${t.type === 'income' ? 'text-green-500' : 'text-nexus-text'}`}>
                                    {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
       </div>

       {/* RIGHT SIDE: AI Advisor (35%) */}
       <div className="w-[400px] bg-[#0a0a0a] flex flex-col border-l border-nexus-border shrink-0">
            <div className="h-14 border-b border-nexus-border flex items-center px-6 bg-nexus-surface/50 justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-yellow-500" />
                    <span className="text-sm font-medium text-nexus-text tracking-wide">Nexus Advisor</span>
                </div>
                <MoreHorizontal size={16} className="text-nexus-muted cursor-pointer" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0a0a0a]">
                {chatHistory.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'model' ? 'bg-nexus-surface border-nexus-border text-yellow-500' : 'bg-nexus-text text-nexus-bg border-transparent'}`}>
                            {msg.role === 'model' ? <Bot size={16} /> : <User size={16} />}
                        </div>
                        <div className={`flex flex-col max-w-[85%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-3 rounded-lg text-sm leading-relaxed ${
                                msg.role === 'user' 
                                    ? 'bg-nexus-surface border border-nexus-border text-nexus-text' 
                                    : 'bg-transparent text-nexus-text/90'
                            }`}>
                                {msg.text.split('\n').map((line, i) => (
                                    <p key={i} className={`mb-1 ${line.trim().startsWith('-') ? 'pl-2' : ''}`}>
                                        {line}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {isAiLoading && (
                    <div className="flex gap-3">
                         <div className="w-8 h-8 rounded-full bg-nexus-surface border border-nexus-border text-yellow-500 flex items-center justify-center shrink-0">
                            <Bot size={16} />
                        </div>
                        <div className="flex items-center gap-1 h-8">
                            <span className="w-1.5 h-1.5 bg-nexus-muted rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-nexus-muted rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-nexus-muted rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-nexus-bg border-t border-nexus-border">
                <div className="relative">
                    <input 
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask for advice or log an expense..."
                        className="w-full bg-nexus-surface border border-nexus-border rounded-lg py-3 pl-4 pr-12 text-sm text-nexus-text focus:outline-none focus:border-nexus-muted transition-colors placeholder-nexus-muted"
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isAiLoading}
                        className="absolute right-2 top-2 p-1.5 bg-nexus-text text-nexus-bg rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
       </div>

       {/* Transaction Modal */}
       {isModalOpen && (
           <TransactionModal 
               transaction={editingTransaction}
               onClose={() => setIsModalOpen(false)}
               onSave={handleSaveTransaction}
               onDelete={handleDeleteTransaction}
           />
       )}
    </div>
  );
};

interface TransactionModalProps {
    transaction: Transaction | null;
    onClose: () => void;
    onSave: (t: Transaction) => void;
    onDelete: (id: string) => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ transaction, onClose, onSave, onDelete }) => {
    const [editedTransaction, setEditedTransaction] = useState<Transaction>(
        transaction || {
            id: Date.now().toString(),
            description: '',
            amount: 0,
            category: 'Expense',
            date: new Date().toISOString().split('T')[0],
            type: 'expense'
        }
    );

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleChange = (field: keyof Transaction, value: any) => {
        setEditedTransaction(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#1a1a1a] border border-nexus-border rounded-lg shadow-2xl flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-nexus-border/50">
                    <h3 className="text-lg font-medium text-nexus-text">
                        {transaction ? 'Edit Transaction' : 'New Transaction'}
                    </h3>
                    <button onClick={onClose} className="text-nexus-muted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Amount Input */}
                    <div>
                        <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider block mb-2">Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted">$</span>
                            <input 
                                type="number" 
                                value={editedTransaction.amount || ''}
                                onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
                                className="w-full bg-nexus-surface border border-nexus-border rounded-lg py-3 pl-8 pr-4 text-2xl font-mono text-nexus-text focus:outline-none focus:border-nexus-muted"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider block mb-2">Description</label>
                        <input 
                            type="text" 
                            value={editedTransaction.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="w-full bg-nexus-surface border border-nexus-border rounded px-3 py-2 text-sm text-nexus-text focus:outline-none focus:border-nexus-muted"
                            placeholder="What is this for?"
                        />
                    </div>

                    {/* Grid: Type & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider block mb-2">Type</label>
                            <div className="flex rounded border border-nexus-border overflow-hidden">
                                <button 
                                    onClick={() => handleChange('type', 'expense')}
                                    className={`flex-1 py-2 text-xs font-medium transition-colors ${editedTransaction.type === 'expense' ? 'bg-red-900/20 text-red-400' : 'bg-nexus-surface text-nexus-muted hover:text-nexus-text'}`}
                                >
                                    Expense
                                </button>
                                <div className="w-[1px] bg-nexus-border"></div>
                                <button 
                                    onClick={() => handleChange('type', 'income')}
                                    className={`flex-1 py-2 text-xs font-medium transition-colors ${editedTransaction.type === 'income' ? 'bg-green-900/20 text-green-400' : 'bg-nexus-surface text-nexus-muted hover:text-nexus-text'}`}
                                >
                                    Income
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider block mb-2">Date</label>
                            <input 
                                type="date"
                                value={editedTransaction.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                                className="w-full bg-nexus-surface border border-nexus-border rounded px-3 py-2 text-sm text-nexus-text focus:outline-none focus:border-nexus-muted [&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider block mb-2">Category</label>
                        <select 
                            value={editedTransaction.category}
                            onChange={(e) => handleChange('category', e.target.value)}
                            className="w-full bg-nexus-surface border border-nexus-border rounded px-3 py-2 text-sm text-nexus-text focus:outline-none focus:border-nexus-muted appearance-none cursor-pointer"
                        >
                            <optgroup label="Recurring">
                                <option value="Fixed Cost">Fixed Cost (Rent, Internet)</option>
                                <option value="Subscription">Subscription (SaaS, Media)</option>
                            </optgroup>
                            <optgroup label="Variable">
                                <option value="Groceries">Groceries</option>
                                <option value="Health">Health & Fitness</option>
                                <option value="Entertainment">Entertainment</option>
                                <option value="Transport">Transport</option>
                                <option value="Shopping">Shopping</option>
                                <option value="Software">Software</option>
                            </optgroup>
                            <optgroup label="Income">
                                <option value="Salary">Salary</option>
                                <option value="Freelance">Freelance</option>
                                <option value="Investment">Investment</option>
                            </optgroup>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="p-4 border-t border-nexus-border/50 flex justify-between bg-[#151515] rounded-b-lg">
                    {transaction ? (
                        <button 
                            onClick={() => onDelete(editedTransaction.id)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded transition-colors"
                        >
                            <Trash2 size={14} />
                            <span>Delete</span>
                        </button>
                    ) : <div></div>}
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-nexus-muted hover:text-nexus-text transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => onSave(editedTransaction)}
                            className="px-6 py-2 text-xs font-medium bg-white text-black rounded hover:bg-gray-200 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinanceTracker;