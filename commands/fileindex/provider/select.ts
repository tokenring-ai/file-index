import Agent from "@tokenring-ai/agent/Agent";
import type {TreeLeaf} from "@tokenring-ai/agent/question";
import FileIndexService from "../../../FileIndexService.ts";
import {FileIndexState} from "../../../state/FileIndexState.ts";

export async function select(remainder: string, agent: Agent): Promise<void> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  const availableProviders = fileIndexService.getAvailableFileIndexProviders();

  if (availableProviders.length === 0) {
    agent.infoMessage("No file index providers are registered.");
    return;
  }

  if (availableProviders.length === 1) {
    fileIndexService.setActiveProvider(availableProviders[0], agent);
    agent.infoMessage(`Only one provider configured, auto-selecting: ${availableProviders[0]}`);
    return;
  }

  const activeProvider = agent.getState(FileIndexState).activeProvider;
  const formattedProviders: TreeLeaf[] = availableProviders.map(name => ({
    name: `${name}${name === activeProvider ? " (current)" : ""}`,
    value: name,
  }));

  const selection = await agent.askQuestion({
    message: "Select an active file index provider",
    question: {
      type: 'treeSelect',
      label: "FileIndex Provider Selection",
      key: "result",
      defaultValue: activeProvider ? [activeProvider] : undefined,
      minimumSelections: 1,
      maximumSelections: 1,
      tree: formattedProviders
    }
  });

  if (selection) {
    const selectedValue = selection[0];
    fileIndexService.setActiveProvider(selectedValue, agent);
    agent.infoMessage(`Active provider set to: ${selectedValue}`);
  } else {
    agent.infoMessage("Provider selection cancelled.");
  }
}
