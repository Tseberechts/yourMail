import { ipcMain } from "electron";
import { AiService } from "../services/AiService";

export function registerAiHandlers(aiService: AiService) {
  ipcMain.handle("ai:hasKey", async () => await aiService.hasKey());

  ipcMain.handle("ai:saveKey", async (_e, key: string) => {
    try {
      await aiService.saveApiKey(key);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle(
    "ai:summarize",
    async (_e, data: { body: string; model: string }) => {
      try {
        const summary = await aiService.summarizeEmail(data.body, data.model);
        return { success: true, text: summary };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
  );

  ipcMain.handle(
    "ai:draft",
    async (_e, data: { body: string; instruction: string; model: string }) => {
      try {
        const draft = await aiService.generateReply(
          data.body,
          data.instruction,
          data.model,
        );
        return { success: true, text: draft };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
  );
}
