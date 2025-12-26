import {AgentCommandService} from "@tokenring-ai/agent";
import {TokenRingPlugin} from "@tokenring-ai/app";
import {ChatService} from "@tokenring-ai/chat";
import {z} from "zod";
import chatCommands from "./chatCommands.ts";
import EphemeralFileIndexProvider from "./EphemeralFileIndexProvider.ts";
import FileIndexService from "./FileIndexService.ts";
import {FileIndexConfigSchema} from "./index.ts";
import packageJSON from './package.json' with {type: 'json'};
import tools from "./tools.ts";

const packageConfigSchema = z.object({
  fileIndex: FileIndexConfigSchema.optional(),
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    // const config = app.getConfigSlice('fileIndex', FileIndexConfigSchema);
    if (config.fileIndex) {
      app.waitForService(ChatService, chatService =>
        chatService.addTools(packageJSON.name, tools)
      );
      app.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(chatCommands)
      );
      const fileIndexService = new FileIndexService();
      app.addServices(fileIndexService);

      if (config.fileIndex.providers) {
        for (const name in config.fileIndex.providers) {
          const fileIndexConfig = config.fileIndex.providers[name];
          switch (fileIndexConfig.type) {
            case "ephemeral":
              fileIndexService.registerFileIndexProvider(name, new EphemeralFileIndexProvider());
              break;
          }
        }
      }
    }
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
