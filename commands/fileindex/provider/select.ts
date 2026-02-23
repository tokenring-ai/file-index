import Agent from "@tokenring-ai/agent/Agent";
import type {TreeLeaf} from "@tokenring-ai/agent/question";
import FileIndexService from "../../../FileIndexService.ts";
import {FileIndexState} from "../../../state/FileIndexState.ts";

export async function select(remainder: string, agent: Agent): Promise<string> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  const availableProviders = fileIndexService.getAvailableFileIndexProviders();

  if (availableProviders.length === 0) {
    return "No file index providers are registered.";
  }

  if (availableProviders.length === 1) {
    fileIndexService.setActiveProvider(availableProviders[0], agent);
    return `Only one provider configured, auto-selecting: ${availableProviders[0]}`;
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
    return `Active provider set to: ${selectedValue}`;
  } else {
    return "Provider selection cancelled.";
  }
}
