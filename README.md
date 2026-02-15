
# Stash - Smart Student Budgeting Companion

Stash is a vibrant, AI-powered budgeting application designed specifically for students. It helps users manage their monthly allowances, track spending, and reach savings goals without the complexity of traditional banking apps.

## 🚀 Purpose
Student life is expensive. Stash aims to bridge the gap between "having money" and "managing money" by providing an intuitive, gamified interface coupled with a real-time AI coach that analyzes spending habits.

## ✨ Features
- **Smart Allowance Tracker**: See exactly how much you have left for the month at a glance.
- **Categorized Logging**: Quick-entry for common student expenses like Food, Study, and Social.
- **Goal Setting**: Track progress towards that new laptop or summer trip.
- **AI Smart Coach**: Powered by Google's Gemini 3, the coach provides personalized advice, identifies spending leaks, and suggests realistic cuts.
- **Gamification**: Built-in streaks to encourage daily financial mindfulness.
- **Visual Insights**: Clean charts showing your spending breakdown.

## 🛠 Technology Stack
- **Frontend**: React 18 with TypeScript.
- **Styling**: Tailwind CSS for a modern, responsive UI.
- **Charts**: Recharts for data visualization.
- **AI Engine**: Google Gemini API (`gemini-3-flash-preview`).
- **Persistence**: Local Storage (simulating a DB for client-side demo stability).

## 💻 How to Run Locally
1. Ensure you have Node.js installed.
2. Ensure you have your `API_KEY` for Google Gemini available in your environment.
3. Open the project directory.
4. The application is a Single Page Application. You can run it with `npm start` (if using a standard React template) or serve the build folder.

## 🧠 How AI Budgeting Works
The app aggregates your monthly allowance, current expenses (grouped by category), and your savings goals. This context is sent to the Gemini 3 model, which evaluates:
1. **Burn Rate**: Are you spending too fast for the month?
2. **Category Balance**: Are you spending too much on "Entertainment" compared to "Study"?
3. **Goal Achievability**: Will your current savings rate actually reach your target deadline?

The AI then generates a "Budget Score" and actionable tips in a friendly, supportive tone.

## 🔮 Future Improvements
- **OCR Integration**: Scan receipts automatically using Gemini Vision.
- **Collaborative Budgeting**: Shared budgets for student housing roommates.
- **Local Deals**: Integrate with student discount APIs to suggest savings in high-spend categories.
- **Bank Syncing**: Future integration with Plaid/Open Banking APIs for automated tracking.
