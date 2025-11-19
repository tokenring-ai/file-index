import {AgentCommandService, AgentTeam, TokenRingPackage} from "@tokenring-ai/agent";
import {ChatService} from "@tokenring-ai/chat";
import {z} from "zod";
import * as chatCommands from "./chatCommands.ts";
import EphemeralFileIndexProvider from "./EphemeralFileIndexProvider.ts";
import FileIndexService from "./FileIndexService.ts";
import packageJSON from './package.json' with {type: 'json'};
import * as tools from "./tools.ts";

export const FileIndexConfigSchema = z.object({
  providers: z.record(z.string(), z.any())
}).optional();

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(agentTeam: AgentTeam) {
    const config = agentTeam.getConfigSlice('fileIndex', FileIndexConfigSchema);
    if (config) {
      agentTeam.waitForService(ChatService, chatService =>
        chatService.addTools(packageJSON.name, tools)
      );
      agentTeam.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(chatCommands)
      );
      const fileIndexService = new FileIndexService();
      agentTeam.addServices(fileIndexService);

      if (config.providers) {
        for (const name in config.providers) {
          const fileIndexConfig = config.providers[name];
          switch (fileIndexConfig.type) {
            case "ephemeral":
              fileIndexService.registerFileIndexProvider(name, new EphemeralFileIndexProvider());
              break;
          }
        }
      }
    }
  }
} as TokenRingPackage;

export {default as FileIndexService} from "./FileIndexService.ts";
export {default as FileIndexProvider} from "./FileIndexProvider.ts";
export {default as EphemeralFileIndexProvider} from "./EphemeralFileIndexProvider.ts";
