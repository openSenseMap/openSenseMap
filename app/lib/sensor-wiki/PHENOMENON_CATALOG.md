# Contributing to the phenomenon catalog

The [phenomenon catalog](./aliases.json) defines the phenomena, units, and
aliases recognized by openSenseMap. It powers sensor suggestions and enrichment
during device creation, as well as phenomenon filtering in Explore. Browse it at
`/phenomenon-catalog`.

## Add or update a mapping

1. Edit `aliases.json`. Add an entry for a new phenomenon or add aliases to an
   existing entry. Each item in `titleAliases`, `unitAliases`, or
   `sensorTypeAliases` must be a separate JSON string; a comma inside a string
   does not separate aliases.
2. Give a new entry a stable `sensorWikiPhenomenon` identifier and, when
   applicable, a `sensorWikiUnit`. The phenomenon/unit pair must be unique.
   `title` is the English fallback label; `unit` is its display unit.
3. Add or update localized display labels in
   `public/locales/<language>/phenomena.json` when available. Matching aliases
   belong in `aliases.json`, including aliases in languages other than English.
4. Run `npx tsx ./app/lib/sensor-wiki/alias-catalog.ts` to validate the catalog,
   then run `npm run typecheck`. The parser rejects duplicate targets and aliases
   that do not resolve to their intended target.
5. Open a pull request against `dev` and describe the intended mapping and any
   potentially ambiguous names or units.

Standard contributions may introduce new phenomena. A real legacy sensor
example or an ontology reference is not required. Reviewers should check that
the identifier, unit, and aliases are clear and that the mapping does not make
an existing alias ambiguous.

Exact aliases are used when canonical phenomenon metadata is assigned to a
sensor. Explore also uses fuzzy matching to group older sensors without that
metadata; fuzzy matches are not automatically persisted as canonical values.
