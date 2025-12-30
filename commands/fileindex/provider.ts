import createSubcommandRouter from "@tokenring-ai/agent/util/subcommandRouter";
import {defaultProvider} from "./provider/default.ts";
import {get} from "./provider/get.ts";
import {select} from "./provider/select.ts";
import {set} from "./provider/set.ts";

export default createSubcommandRouter({
  get,
  set,
  default: defaultProvider,
  select,
});
