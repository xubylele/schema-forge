# SchemaForge

CLI tool for schema management and SQL generation.

## Installation

```bash
npm install
```

## Development

Build the project:

```bash
npm run build
```

Run in development mode:

```bash
npm run dev -- [command]
```

Run tests:

```bash
npm test
```

## Commands

### Initialize a new project

```bash
schemaforge init [options]

Options:
  -d, --dir <directory>  Target directory (default: ".")
  -f, --force            Force initialization even if files exist
```

### Generate SQL from schemas

```bash
schemaforge generate [options]

Options:
  -i, --input <path>     Input schema file or directory (default: "./schemas")
  -o, --output <path>    Output SQL file (default: "./output.sql")
  -t, --type <type>      Database type: postgres, mysql, sqlite (default: "postgres")
  --dry-run              Show generated SQL without writing to file
```

### Compare schemas and generate migrations

```bash
schemaforge diff <source> <target> [options]

Arguments:
  source                 Source schema file or directory
  target                 Target schema file or directory

Options:
  -o, --output <path>    Output migration SQL file
  -t, --type <type>      Database type: postgres, mysql, sqlite (default: "postgres")
  --format <format>      Output format: sql, json (default: "sql")
```

## Project Structure

```
schema-forge/
├── src/
│   ├── cli.ts                    # CLI entrypoint
│   ├── commands/
│   │   ├── init.ts               # Init command
│   │   ├── generate.ts           # Generate command
│   │   └── diff.ts               # Diff command
│   ├── core/
│   │   ├── types.ts              # Type definitions
│   │   ├── paths.ts              # Path utilities
│   │   ├── fs.ts                 # File system utilities
│   │   ├── parser.ts             # Schema parser
│   │   ├── validator.ts          # Schema validator
│   │   ├── state-manager.ts      # State management
│   │   └── diff.ts               # Schema diff calculator
│   └── generator/
│       └── sql-generator.ts      # SQL generator
├── package.json
├── tsconfig.json
└── README.md
```

## Schema Format

Schemas are defined in JSON format with `.schema.json` extension:

```json
{
  "version": "1.0.0",
  "database": "postgres",
  "tables": [
    {
      "name": "users",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "required": true,
          "unique": true
        },
        {
          "name": "email",
          "type": "string",
          "required": true,
          "unique": true,
          "length": 255
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "length": 255
        },
        {
          "name": "created_at",
          "type": "datetime",
          "required": true
        }
      ],
      "indexes": [
        {
          "name": "idx_users_email",
          "fields": ["email"],
          "unique": true
        }
      ]
    }
  ]
}
```

## Supported Field Types

- `string` - Variable-length string
- `text` - Long text
- `number` - Floating point number
- `integer` - Integer number
- `boolean` - Boolean value
- `date` - Date without time
- `datetime` - Date with time
- `uuid` - UUID/GUID
- `json` - JSON data
- `enum` - Enumerated values

## Supported Databases

- PostgreSQL (`postgres`)
- MySQL (`mysql`)
- SQLite (`sqlite`)

## License

ISC
