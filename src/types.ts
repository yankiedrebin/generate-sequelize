import {
  ModelAttributeColumnOptions,
  IndexesOptions,
  Dialect,
} from "sequelize";
import type { CaseFileOption, CaseOption } from "sequelize-auto/types/types";
import type { Options } from "prettier";

export type JoinTables =
  | string[]
  | Record<string, true | string[] | string[][]>;

export interface GeneratorOptions {
  /** Add null to nullable fields (ex: column?: string | null;) */
  addNullToTypes?: boolean;
  /** Case of file names (default original)*/
  caseFile?: CaseFileOption;
  /** Case of model names (default original)*/
  caseModel?: CaseOption;
  /** Case of property names (default original)*/
  caseProp?: CaseOption;
  /** Database name */
  database?: string;
  /** Database dialect */
  dialect: Dialect;
  /** Dialect-specific options */
  dialectOptions?: {
    options?: any;
  };
  /** Where to write the model files */
  directory: string;
  /** Database host (default localhost)*/
  host?: string;
  /** Whether to avoid creating alias property in relations */
  noAlias?: boolean;
  /** Add explicit DO NOT EDIT warnings to generated headers and region markers */
  generatedWarnings?: boolean;
  /** Whether to skip writing the init-models file */
  noInitModels?: boolean;
  /** Database password */
  password?: string;
  /** Database port (default mysql: 3306, postgres: 5432, mssql: 1433)*/
  port?: number;
  /** Database schema to export */
  schema?: string;
  /** Whether to singularize model names (default false)*/
  singularize?: boolean;
  /** Tables to skip exporting */
  skipTables?: string[];
  /** Fields to skip exporting */
  skipFields?: string[];
  /** FK fields whose relations should not be generated (columns are kept) */
  skipRelations?: string[];
  /** File where database is stored (sqlite only) */
  storage?: string;
  /** Tables to export (default all) */
  tables?: string[];
  /** Database username */
  username?: string;
  /** Whether to export views (default false) */
  views?: boolean;
  /** Primary Key Suffixes to trim (default "id") */
  pkSuffixes?: string[];
  /** Library that output files to be written using (default sequelize)*/
  targetLib?: "sequelize" | "sequelize-typescript" | "@sequelize/core";
  /** Array of replacements to be applied after formatting across all files using file.replace(replacement[0], replacement[1]). replacement[2] can be a list of tables (or init-models) to apply to, replacement[3] can be a list of tables to exclude*/
  replacements?: [
    pattern: RegExp,
    replacement: string,
    tables?: string[] | undefined,
    excludeTables?: string[],
  ][];
  /** Array of tables to be considered as join tables. All foreign keys in these tables will be related to each other via belongsToMany relationship (can also be a record or table names as keys. the value can be either true for all foreign keys, an array of foreign keys, or an array of array of foreign keys to establish specific relationships)*/
  joinTables?: JoinTables;
  /** After the files are processed, prettier will be run to format each file before it is written. Use this option to configure prettier formatting to reflect your prettier config. (default is prettier default options) */
  prettierOptions?: Omit<Options, "parser" | "semi">;
  /** rename relations. example: { users: { tasks: "assigned_to_tasks" } } */
  relationRenames?: Record<string, Record<string, string>>;
  /** When true, relationRenames bypass collision detection and directly overwrite any existing relation with the same target name (pre-1.3.0 behavior). Default false. */
  relationRenamesOverwrite?: boolean;
  /** map renaming for join tables. use foreign key as rewrite target. example: { user_roles: { user_id: "admin" } } */
  joinTableRenames?: Record<string, Record<string, string>>;
}

export type ReferenceData = {
  modelName: string;
  tableName: string;
  key: string;
  fileName: string;
};

export type ColumnData = {
  definition: ModelAttributeColumnOptions;
  tsType: string;
  name: string;
  tableName: string;
  tableModelName: string;
  tsTypeOverride?: string;
  field: string;
  refData?: ReferenceData;
};

export type RelationData = {
  targetName: string;
  targetTableName: string;
  targetFileName: string;
  foreignKey: string;
  optional?: boolean;
} & RelMeta;

type RelMeta =
  | {
      type: "belongsTo" | "hasMany" | "hasOne";
    }
  | {
      type: "belongsToMany";
      through: string;
      throughAlias: string;
      throughFileName: string;
      otherKey: string;
    };

export type Imports = Map<string, Set<string>>;

export type TableData = {
  modelName: string;
  tableName: string;
  schema?: string;
  columns: Map<string, ColumnData>;
  relations: Map<string, RelationData>;
  fileName: string;
  indexes: IndexesOptions[];
};

export type DBData = Map<string, TableData>;
