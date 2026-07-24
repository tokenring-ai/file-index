import { AgentCommandService } from "@tokenring-ai/agent";
import type { TokenRingPlugin } from "@tokenring-ai/app";
import { ChatService } from "@tokenring-ai/chat";
import { z } from "zod";
import agentCommands from "./commands.ts";
import EphemeralFileIndexProvider from "./EphemeralFileIndexProvider.ts";
import FileIndexService from "./FileIndexService.ts";
import packageJSON from "./package.json" with { type: "json" };
import { FileIndexServiceConfigSchema } from "./schema.ts";
import tools from "./tools.ts";

const packageConfigSchema = z.object({
  fileIndex: FileIndexServiceConfigSchema.prefault({}),
});

export default {
  name: packageJSON.name,
  displayName: "File Indexing",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    const fileIndexService = new FileIndexService(config.fileIndex);
    app.addServices(fileIndexService);

    fileIndexService.registerFileIndexProvider("ephemeral", new EphemeralFileIndexProvider());

    app.waitForService(ChatService, chatService => chatService.addTools(...tools));
    app.waitForService(AgentCommandService, agentCommandService => agentCommandService.addAgentCommands(agentCommands));
  },
  configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
