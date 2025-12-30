import Agent from "@tokenring-ai/agent/Agent";
import FileIndexService from "../../../FileIndexService.ts";
import {FileIndexState} from "../../../state/FileIndexState.ts";

export async function select(remainder: string, agent: Agent): Promise<void> {
  const fileIndexService = agent.requireServiceByType(FileIndexService);
  const availableProviders = fileIndexService.getAvailableFileIndexProviders();

  if (availableProviders.length === 0) {
    agent.infoLine("No file index providers are registered.");
    return;
  }

  if (availableProviders.length === 1) {
    fileIndexService.setActiveProvider(availableProviders[0], agent);
    agent.infoLine(`Only one provider configured, auto-selecting: ${availableProviders[0]}`);
    return;
  }

  const activeProvider = agent.getState(FileIndexState).activeProvider;
  const formattedProviders = availableProviders.map(name => ({
    name: `${name}${name === activeProvider ? " (current)" : ""}`,
    value: name,
  }));

  const selectedValue = await agent.askHuman({
    type: "askForSingleTreeSelection",
    title: "FileIndex Provider Selection",
    message: "Select an active file index provider",
    tree: {name: "Available Providers", children: formattedProviders}
  });

  if (selectedValue) {
    fileIndexService.setActiveProvider(selectedValue, agent);
    agent.infoLine(`Active provider set to: ${selectedValue}`);
  } else {
    agent.infoLine("Provider selection cancelled.");
  }
}
