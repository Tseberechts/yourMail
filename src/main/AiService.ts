import { GoogleGenAI } from "@google/genai";
import { SecureStore } from "./SecureStore";

export class AiService {
  private secureStore: SecureStore;
  // Default fallback
  private defaultModel = "gemini-2.5-flash";

  constructor(secureStore: SecureStore) {
    this.secureStore = secureStore;
  }

  async saveApiKey(apiKey: string): Promise<boolean> {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      // Validate with default model
      await ai.models.generateContent({
        model: this.defaultModel,
        contents: "Hi",
      });
      this.secureStore.setSecret("ai_api_key", apiKey);
      return true;
    } catch (error) {
      console.error("Invalid API Key or Network Error:", error);
      throw new Error("Invalid API Key. Please check and try again.");
    }
  }

  async hasKey(): Promise<boolean> {
    return !!this.getApiKey();
  }

  // [UPDATED] Accept modelName
  async summarizeEmail(emailBody: string, modelName?: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey)
      throw new Error("AI API Key not found. Please configure it in settings.");

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const targetModel = modelName || this.defaultModel;

    console.log(`[AiService] Summarizing using ${targetModel}...`);

    const prompt = `
            You are a helpful executive assistant. 
            Summarize the following email in 3 bullet points or less. 
            Keep it concise and focus on action items or key information.
            
            Email Content:
            "${emailBody.substring(0, 12000)}" 
        `;

    try {
      const result = await ai.models.generateContent({
        model: targetModel,
        contents: prompt,
      });

      return result.text || "No summary generated.";
    } catch (error) {
      console.error("AI Summary Error:", error);
      throw new Error("Failed to generate summary. Check API Key or Quota.");
    }
  }

  // [UPDATED] Accept modelName
  async generateReply(
    emailBody: string,
    userInstruction: string,
    modelName?: string,
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("AI API Key not found.");

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const targetModel = modelName || this.defaultModel;

    console.log(`[AiService] Drafting using ${targetModel}...`);

    const prompt = `
            You are a professional email assistant.
            Write a reply to the email below based on these instructions: "${userInstruction}".
            
            Style: Professional but friendly.
            Sign off: Do not include a placeholder signature (e.g. "[Your Name]"), just end the email body.
            
            Original Email:
            "${emailBody.substring(0, 6000)}"
        `;

    try {
      const result = await ai.models.generateContent({
        model: targetModel,
        contents: prompt,
      });
      return result.text || "No draft generated.";
    } catch (error) {
      console.error("AI Reply Error:", error);
      throw new Error("Failed to generate reply.");
    }
  }

  private getApiKey(): string | null {
    return this.secureStore.getSecret("ai_api_key");
  }
}