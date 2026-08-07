// Flat-config ESLint resolves relative to cwd, not per linted file - lint-staged runs from the
// repo root, so a root config is required even though each package also has its own (used when
// `pnpm --filter <pkg> lint` is invoked with cwd inside that package).
import preset from "@duomatch/config/eslint-preset.js";

export default preset;
