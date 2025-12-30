import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import createSubcommandRouter from "@tokenring-ai/agent/util/subcommandRouter";
import provider from "./fileindex/provider.ts";
import {search} from "./fileindex/search.ts";

const description = "/fileindex [action] [subaction] - Manage file index providers and search";

const help: string = `# FileIndex Command

Manage file index providers and search across files.

## Usage

\`/fileindex [action] [subaction]\`

## Actions

### Provider Management

#### \`provider get\`
Display the currently active file index provider.

#### \`provider set <name>\`
Set a specific file index provider by name.

#### \`provider default\`
Display the default file index provider.

#### \`provider select\`
Select an active file index provider interactively.

### Search

#### \`search <query>\`
Search for text across files in the project.
- Searches across all indexed files
- Returns up to 10 matching results
- Shows file paths and matching content

## Examples

\`\`\`
/fileindex provider get
/fileindex provider set ephemeral
/fileindex provider select
/fileindex search function getUser
\`\`\`
`;

const execute = createSubcommandRouter({
  provider,
  search
});

export default {
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand;
