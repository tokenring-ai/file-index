import TokenRingApp from "@tokenring-ai/app"; 
import {AgentCommandService} from "@tokenring-ai/agent";
import {ChatService} from "@tokenring-ai/chat";
import {TokenRingPlugin} from "@tokenring-ai/app";
import chatCommands from "./chatCommands.ts";
import EphemeralFileIndexProvider from "./EphemeralFileIndexProvider.ts";
import FileIndexService from "./FileIndexService.ts";
import packageJSON from './package.json' with {type: 'json'};
import tools from "./tools.ts";
import { FileIndexConfigSchema } from "./index.ts";


export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    const config = app.getConfigSlice('fileIndex', FileIndexConfigSchema);
    if (config) {
      app.waitForService(ChatService, chatService =>
        chatService.addTools(packageJSON.name, tools)
      );
      app.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(chatCommands)
      );
      const fileIndexService = new FileIndexService();
      app.addServices(fileIndexService);

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
} satisfies TokenRingPlugin;
