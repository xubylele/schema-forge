---
"@xubylele/schema-forge": minor
---

# 🧪 test(safety): implement comprehensive test matrix for safety combinations

- Added full safety behavior matrix coverage:
  - `--safe` ON + destructive operation
  - `--safe` OFF + destructive operation
  - `--safe` + `--force`
  - `CI=true` + destructive operation
  - `CI=true` + `--force`
- Verified deterministic exit codes for each scenario.
- Added snapshot tests for standardized error and warning output.
- Ensured middleware, CLI layer, and CI enforcement paths are fully covered.
- Achieved 100% coverage for safety-related logic (classifier, middleware, prompt, and CI handling).
