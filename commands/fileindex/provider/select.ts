import Agent from "@tokenring-ai/agent/Agent";
import type {TreeLeaf} from "@tokenring-ai/agent/question";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import FileIndexService from "../../../FileIndexService.ts";
import {FileIndexState} from "../../../state/FileIndexState.ts";

async function execute(_remainder: string, agent: Agent): Promise<string> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  const available = fileIndexService.getAvailableFileIndexProviders();
  if (available.length === 0) return "No file index providers are registered.";
  if (available.length === 1) {
    fileIndexService.setActiveProvider(available[0], agent);
    return `Only one provider configured, auto-selecting: ${available[0]}`;
  }
  const activeProvider = agent.getState(FileIndexState).activeProvider;
  const tree: TreeLeaf[] = available.map(name => ({ name: `${name}${name === activeProvider ? " (current)" : ""}`, value: name }));
  const selection = await agent.askQuestion({
    message: "Select an active file index provider",
    question: { type: 'treeSelect', label: "FileIndex Provider Selection", key: "result", defaultValue: activeProvider ? [activeProvider] : undefined, minimumSelections: 1, maximumSelections: 1, tree },
  });
  if (selection) {
    fileIndexService.setActiveProvider(selection[0], agent);
    return `Active provider set to: ${selection[0]}`;
  }
  return "Provider selection cancelled.";
}

export default {
  name: "fileindex provider select", description: "Interactively select a provider", help: `# /fileindex provider select

Interactively select the active file index provider. Auto-selects if only one provider is configured.

## Example

/fileindex provider select`, execute } satisfies TokenRingAgentCommand;
