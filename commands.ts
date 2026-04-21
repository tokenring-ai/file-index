import providerGet from "./commands/fileindex/provider/get.ts";
import providerReset from "./commands/fileindex/provider/reset.ts";
import providerSelect from "./commands/fileindex/provider/select.ts";
import providerSet from "./commands/fileindex/provider/set.ts";
import search from "./commands/fileindex/search.ts";

export default [providerGet, providerSet, providerSelect, providerReset, search];
