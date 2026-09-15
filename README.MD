# Generate Sequelize models

This is a command line tool that generates Sequelize models from a database schema.

## Installation

`npm install generate-sequelize -D`

## Usage

`npx generate-sequelize [path-to-config (default: .generate-sequelize.cjs)]`

For PostgreSQL, generated properties follow each column's database
`ordinal_position`, so repeated generation preserves the database field order.

### AI agent instructions

Set `generatedWarnings: true` in the generator config to add concise warnings
to model headers and mark every generated section with `DO NOT EDIT`.

You can also add matching repository-level guidance to `AGENTS.md`:

```
npx generate-sequelize setup-agents
```

By default, this creates or updates a managed instruction block in
`./AGENTS.md`. Pass a different file as the second argument when needed:

```
npx generate-sequelize setup-agents path/to/AGENTS.md
```

The command preserves all content outside
`<!-- generate-sequelize:start -->` and
`<!-- generate-sequelize:end -->`, and is safe to run repeatedly.

## Example config

```
// ./.generate-sequelize.cjs
/*** @type {import("generate-sequelize").GeneratorOptions} */
module.exports = {
    targetLib: "sequelize",
    database: "database",
    username: "username",
    password: "password",
    host: "localhost",
    dialect: "mysql",
    directory: "models",
    generatedWarnings: true,
    joinTables: ["user_roles"],
    replacements: [[/as: "medium"/g, 'as: "media"']],
    prettierOptions: {
        singleQuote: true,
        trailingComma: "all",
        bracketSpacing: true,
        tabWidth: 4,
    }
}
```

## Example output

```
// models/users.ts
/* auto-generated imports */
import { phones } from './phones';
import { user_roles } from './user_roles';
/* auto-generated imports */
import {
    /* auto-generated sequelize imports */
    /* auto-generated sequelize imports */
    Model,
    Sequelize,
    Optional,
    DataTypes,
} from 'sequelize';

type usersAttributeKeys =
    /* auto-generated attributes */
    | 'id'
    | 'email'
    | 'first_name'
    | 'last_name'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at';
/* auto-generated attributes */

export type usersAttributes = Pick<users, usersAttributeKeys>;

export type usersOptionalAttributes =
    /* auto-generated optional attributes */
    'id';
/* auto-generated optional attributes */

export type usersCreationAttributes = Optional<
    usersAttributes,
    usersOptionalAttributes
>;

export class users
    extends Model<usersAttributes, usersCreationAttributes>
    implements usersAttributes
{
    /* auto-generated properties */
    declare id: number;
    declare email: string;
    declare first_name: string;
    declare last_name: string;
    declare created_at?: Date;
    declare updated_at?: Date;
    declare deleted_at?: Date;
    /* auto-generated properties */

    /* auto-generated associations */
    declare phones: phones[];
    declare user_roles: user_roles[];
    /* auto-generated associations */

    static initModel(sequelize: Sequelize): typeof users {
        return users.init(
            {
                /* auto-generated definitions */
                id: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true,
                },
                email: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                first_name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                last_name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                    defaultValue: DataTypes.NOW,
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                deleted_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                /* auto-generated definitions */
            },
            {
                sequelize,
                indexes: [
                    /* auto-generated indexes */
                    {
                        name: 'users_email_key',
                        unique: true,
                        fields: ['email'],
                    },
                    { name: 'users_first_name', fields: ['first_name'] },
                    { name: 'users_last_name', fields: ['last_name'] },
                    { name: 'users_pkey', unique: true, fields: ['id'] },
                    /* auto-generated indexes */
                ],
            },
        );
    }
}

```

If a file does not exist it will be created using the default template. If it does exist, it will overwrite all regions marked with:

```
/* start auto-generated {{regionName}} — DO NOT EDIT */
// all code inside here will be overwritten
/* end auto-generated {{regionName}} */
```

So if you would like to add to a Model it can be done as follows:

```
// models/users.ts
/* auto-generated imports */
import { phones } from './phones';
import { user_roles } from './user_roles';
/* auto-generated imports */
import {
    /* auto-generated sequelize imports */
    /* auto-generated sequelize imports */
    Model,
    Sequelize,
    Optional,
    DataTypes,
} from 'sequelize';
import { tasks } from './tasks'; // will not be overwritten

type usersAttributeKeys =
    | 'fullName' // will not be overwritten
    /* auto-generated attributes */
    | 'id'
    | 'email'
    | 'first_name'
    | 'last_name'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at'
/* auto-generated attributes */
    | 'hasTasks'; // will not be overwritten

export type usersAttributes = Pick<users, usersAttributeKeys>;

export type usersOptionalAttributes =
    | 'hasTasks' // will not be overwritten
    /* auto-generated optional attributes */
    | 'id';
/* auto-generated optional attributes */

export type usersCreationAttributes = Optional<
    usersAttributes,
    usersOptionalAttributes
>;

export class users
    extends Model<usersAttributes, usersCreationAttributes>
    implements usersAttributes
{
    /* auto-generated properties */
    declare id: number;
    declare email: string;
    declare first_name: string;
    declare last_name: string;
    declare created_at?: Date;
    declare updated_at?: Date;
    declare deleted_at?: Date;
    /* auto-generated properties */

    declare fullName: string; // will not be overwritten
    declare hasTasks?: string; // will not be overwritten

    /* auto-generated associations */
    declare phones: phones[];
    declare user_roles: user_roles[];
    /* auto-generated associations */

    declares tasks: tasks[]; // will not be overwritten

    static initModel(sequelize: Sequelize): typeof users {
        return users.init(
            {
                /* auto-generated definitions */
                id: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true,
                },
                email: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                first_name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                last_name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                    defaultValue: DataTypes.NOW,
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                deleted_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                },
                /* auto-generated definitions */
                fullName: { // will not be overwritten
                    type: DataTypes.VIRTUAL,
                    get() {
                        return `${this.first_name} ${this.last_name}`;
                    },
                },
                hasTasks: { // will not be overwritten
                    type: DataTypes.VIRTUAL,
                    get() {
                        if (this.tasks) {
                            return this.tasks.length > 0;
                        }
                    },
                },
            },
            {
                sequelize,
                indexes: [
                    /* auto-generated indexes */
                    {
                        name: 'users_email_key',
                        unique: true,
                        fields: ['email'],
                    },
                    { name: 'users_first_name', fields: ['first_name'] },
                    { name: 'users_last_name', fields: ['last_name'] },
                    { name: 'users_pkey', unique: true, fields: ['id'] },
                    /* auto-generated indexes */
                ],
            },
        );
    }
}

```

## Example output using sequelize-typescript

```
import {
    /* auto-generated sequelize imports */
    PrimaryKey,
    AutoIncrement,
    AllowNull,
    Column,
    Default,
    DataType as DataTypes,
    HasMany,
    /* auto-generated sequelize imports */
    Table,
    Model,
} from 'sequelize-typescript';
/* auto-generated imports */
import { phones } from './phones';
import { user_roles } from './user_roles';
/* auto-generated imports */
import { Optional } from 'sequelize';

type usersAttributeKeys =
    /* auto-generated attributes */
    | 'id'
    | 'email'
    | 'first_name'
    | 'last_name'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at';
/* auto-generated attributes */

export type usersAttributes = Pick<users, usersAttributeKeys>;

export type usersOptionalAttributes =
    /* auto-generated optional attributes */
    'id';
/* auto-generated optional attributes */

export type usersCreationAttributes = Optional<
    usersAttributes,
    usersOptionalAttributes
>;

@Table({
    indexes: [
        /* auto-generated indexes */
        { name: 'users_email_key', unique: true, fields: ['email'] },
        { name: 'users_first_name', fields: ['first_name'] },
        { name: 'users_last_name', fields: ['last_name'] },
        { name: 'users_pkey', unique: true, fields: ['id'] },
        /* auto-generated indexes */
    ],
})
export class users
    extends Model<usersAttributes, usersCreationAttributes>
    implements usersAttributes
{
    /* auto-generated properties */
    @PrimaryKey
    @AutoIncrement
    @AllowNull(false)
    @Column(DataTypes.INTEGER)
    declare id: number;

    @AllowNull(false)
    @Column(DataTypes.STRING)
    declare email: string;

    @AllowNull(false)
    @Column(DataTypes.STRING)
    declare first_name: string;

    @AllowNull(false)
    @Column(DataTypes.STRING)
    declare last_name: string;

    @Default(DataTypes.NOW)
    @AllowNull(true)
    @Column(DataTypes.DATE)
    declare created_at?: Date;

    @AllowNull(true)
    @Column(DataTypes.DATE)
    declare updated_at?: Date;

    @AllowNull(true)
    @Column(DataTypes.DATE)
    declare deleted_at?: Date;
    /* auto-generated properties */

    /* auto-generated associations */
    @HasMany(() => phones, 'user_id')
    declare phones: phones[];

    @HasMany(() => user_roles, 'user_id')
    declare user_roles: user_roles[];
    /* auto-generated associations */
}
```

## Example output using @sequelize/core (version 7, alpha)

```
import {
    /* auto-generated sequelize imports */
    PrimaryKey,
    AutoIncrement,
    NotNull,
    Attribute,
    AllowNull,
    Default,
    HasMany,
    /* auto-generated sequelize imports */
    Table,
} from '@sequelize/core/decorators-legacy';
/* auto-generated imports */
import { phones } from './phones';
import { user_roles } from './user_roles';
/* auto-generated imports */
import { Model, DataTypes } from '@sequelize/core';

type usersAttributeKeys =
    /* auto-generated attributes */
    | 'id'
    | 'email'
    | 'first_name'
    | 'last_name'
    | 'created_at'
    | 'updated_at'
    | 'deleted_at';
/* auto-generated attributes */

export type usersAttributes = Pick<users, usersAttributeKeys>;

export type usersOptionalAttributes =
    /* auto-generated optional attributes */
    'id';
/* auto-generated optional attributes */

export type usersCreationAttributes = Omit<
    usersAttributes,
    usersOptionalAttributes
> &
    Partial<Pick<usersAttributes, usersOptionalAttributes>>;

@Table({
    indexes: [
        /* auto-generated indexes */
        { name: 'users_email_key', unique: true, fields: ['email'] },
        { name: 'users_first_name', fields: ['first_name'] },
        { name: 'users_last_name', fields: ['last_name'] },
        { name: 'users_pkey', unique: true, fields: ['id'] },
        /* auto-generated indexes */
    ],
})
export class users
    extends Model<usersAttributes, usersCreationAttributes>
    implements usersAttributes
{
    /* auto-generated properties */
    @PrimaryKey
    @AutoIncrement
    @NotNull
    @Attribute(DataTypes.INTEGER)
    declare id: number;

    @NotNull
    @Attribute(DataTypes.STRING)
    declare email: string;

    @NotNull
    @Attribute(DataTypes.STRING)
    declare first_name: string;

    @NotNull
    @Attribute(DataTypes.STRING)
    declare last_name: string;

    @Default(DataTypes.NOW)
    @AllowNull
    @Attribute(DataTypes.DATE)
    declare created_at?: Date;

    @AllowNull
    @Attribute(DataTypes.DATE)
    declare updated_at?: Date;

    @AllowNull
    @Attribute(DataTypes.DATE)
    declare deleted_at?: Date;
    /* auto-generated properties */

    /* auto-generated associations */
    @HasMany(() => phones, 'user_id')
    declare phones: phones[];

    @HasMany(() => user_roles, 'user_id')
    declare user_roles: user_roles[];
    /* auto-generated associations */
}
```

## Config Options

```
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
  /** Array of replacements to be applied after formatting across all files using file.replace(replacement[0], replacement[1]) */
  replacements?: [RegExp, string][];
  /** Array of tables to be considered as join tables. All foreign keys in these tables will be related to each other via belongsToMany relationship (can also be a record or table names as keys. the value can be either true for all foreign keys, an array of foreign keys, or an array of array of foreign keys to establish specific relationships)*/
  joinTables?: JoinTables;
  /** After the files are processed, prettier will be run to format each file before it is written. Use this option to configure prettier formatting to reflect your prettier config. (default is prettier default options) */
  prettierOptions?: Omit<Options, "parser" | "semi">;
}
```
