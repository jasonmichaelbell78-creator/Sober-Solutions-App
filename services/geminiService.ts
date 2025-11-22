import { GoogleGenAI } from "@google/genai";
import { Client, House } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateDailyReport = async (houses: House[], clients: Client[]) => {
  const ai = getAiClient();
  if (!ai) return "Error: API Key missing.";

  // Prepare data context for the AI
  const houseSummary = houses.map(h => {
    const totalBeds = h.rooms.reduce((acc, r) => acc + r.beds.length, 0);
    const occupiedBeds = h.rooms.reduce((acc, r) => acc + r.beds.filter(b => b.occupantId).length, 0);
    return `${h.name}: ${occupiedBeds}/${totalBeds} beds occupied.`;
  }).join('\n');

  const recentActivity = clients.flatMap(c => c.checkInLogs.map(log => ({
    clientName: `${c.firstName} ${c.lastName}`,
    type: log.type,
    time: new Date(log.timestamp).toLocaleString(),
    note: log.notes || 'No notes'
  }))).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

  const activityText = recentActivity.map(a => `- ${a.time}: ${a.clientName} checked into ${a.type} (${a.note})`).join('\n');

  const prompt = `
    You are a House Manager Assistant for a sober living facility.
    Please generate a concise, professional daily shift report based on the following data.
    
    House Status:
    ${houseSummary}

    Recent Activity (Last 10 logs):
    ${activityText || "No recent activity."}

    Format the report with sections: "Occupancy Overview", "Recent Activity Highlights", and "Attention Items" (if any anomalies or lack of check-ins are detected, invent generic reminders if data is normal).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No report generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate report due to an API error.";
  }
};

export const analyzeIntakeRisk = async (intakeData: string) => {
  const ai = getAiClient();
  if (!ai) return "Error: API Key missing.";

  const prompt = `
    Analyze the following intake form data for a new resident in a sober living home. 
    Identify potential risk factors, support needs, and provide a brief summary for the house manager.
    
    Data: ${intakeData}
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text;
  } catch (e) {
      return "Could not analyze intake form.";
  }
}