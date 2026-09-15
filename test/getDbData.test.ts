import { describe, it, expect } from "vitest";
import { TableData as TData } from "sequelize-auto";
import getTableData from "../src/getDbData";
import { GeneratorOptions } from "../src/types";

/**
 * Regression tests for getDbData relation handling.
 *
 * These reproduce the crashes that occurred when tables were excluded via
 * `skipTables`/`tables`: sequelize-auto still emits `relations` that reference
 * the excluded tables, and the FK column lookup can come up empty. Previously
 * getDbData used non-null assertions (`db.get(...)!`, `find(...)!`) and threw:
 *   - "Cannot read properties of undefined (reading 'definition')"
 *   - "Cannot read properties of undefined (reading 'relations')"
 */

const options: GeneratorOptions = {
  dialect: "postgres",
  directory: "out",
  caseModel: "p",
  caseFile: "p",
  caseProp: "o",
  singularize: false,
};

// Minimal column descriptor matching sequelize-auto's TSField shape.
function col(type: string, overrides: Record<string, unknown> = {}) {
  return {
    type,
    allowNull: true,
    primaryKey: false,
    autoIncrement: false,
    defaultValue: null,
    comment: null,
    special: [],
    elementType: "",
    ...overrides,
  };
}

// Build a TData with the given tables and relations; empty fk/index metadata.
function makeTData(
  tables: TData["tables"],
  relations: TData["relations"],
  indexes: TData["indexes"] = {},
): TData {
  return {
    tables,
    foreignKeys: {},
    indexes,
    hasTriggerTables: {},
    relations,
  } as unknown as TData;
}

describe("getTableData column order", () => {
  it("uses PostgreSQL ordinal positions instead of introspection order", () => {
    const td = makeTData(
      {
        users: {
          email: col("text"),
          created_at: col("timestamp"),
          id: col("integer", { primaryKey: true }),
        },
      },
      [],
    );
    const columnOrder = new Map([
      [
        "users",
        new Map([
          ["id", 1],
          ["email", 2],
          ["created_at", 3],
        ]),
      ],
    ]);

    const table = getTableData(td, options, columnOrder).get("users")!;

    expect([...table.columns.keys()]).toEqual(["id", "email", "created_at"]);
  });
});

describe("getTableData relations", () => {
  it("wires belongsTo + hasMany for a normal relation between present tables", () => {
    const td = makeTData(
      {
        users: { id: col("integer", { primaryKey: true }) },
        posts: {
          id: col("integer", { primaryKey: true }),
          user_id: col("integer"),
        },
      },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "user_id",
          childTable: "posts",
          childModel: "Post",
          childProp: "posts",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    const db = getTableData(td, options);

    const posts = db.get("posts")!;
    const users = db.get("users")!;
    expect(posts.relations.get("user")?.type).toBe("belongsTo");
    expect(posts.relations.get("user")?.targetTableName).toBe("users");
    expect(users.relations.get("posts")?.type).toBe("hasMany");
    expect(users.relations.get("posts")?.targetTableName).toBe("posts");
  });

  it("does not throw when a relation references a skipped/absent parent table", () => {
    // `source_chunks` is excluded (not in tables), but a relation to it remains.
    const td = makeTData(
      {
        source_citations: {
          id: col("integer", { primaryKey: true }),
          chunk_id: col("integer"),
        },
      },
      [
        {
          parentTable: "source_chunks",
          parentModel: "SourceChunk",
          parentProp: "sourceChunk",
          parentId: "chunk_id",
          childTable: "source_citations",
          childModel: "SourceCitation",
          childProp: "sourceCitations",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    let db!: ReturnType<typeof getTableData>;
    expect(() => {
      db = getTableData(td, options);
    }).not.toThrow();

    // The present table is still emitted; no bogus relation to the skipped one.
    expect(db.get("source_citations")).toBeDefined();
    expect(db.has("source_chunks")).toBe(false);
    expect(db.get("source_citations")!.relations.size).toBe(0);
  });

  it("does not throw when a relation references a skipped/absent child table", () => {
    const td = makeTData(
      { users: { id: col("integer", { primaryKey: true }) } },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "user_id",
          childTable: "source_chunks",
          childModel: "SourceChunk",
          childProp: "sourceChunks",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    let db!: ReturnType<typeof getTableData>;
    expect(() => {
      db = getTableData(td, options);
    }).not.toThrow();
    expect(db.get("users")!.relations.size).toBe(0);
  });

  it("does not throw when the FK column is missing from the child table", () => {
    // Composite-PK join tables surfaced relations whose parentId did not map
    // to a single resolvable column, leaving the FK lookup empty.
    const td = makeTData(
      {
        users: { id: col("integer", { primaryKey: true }) },
        memberships: {
          user_id: col("integer", { primaryKey: true }),
          org_id: col("integer", { primaryKey: true }),
        },
      },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "missing_fk_column",
          childTable: "memberships",
          childModel: "Membership",
          childProp: "memberships",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    let db!: ReturnType<typeof getTableData>;
    expect(() => {
      db = getTableData(td, options);
    }).not.toThrow();
    // Relation skipped because the FK column could not be resolved.
    expect(db.get("memberships")!.relations.size).toBe(0);
    expect(db.get("users")!.relations.size).toBe(0);
  });
});

describe("getTableData association aliases", () => {
  it("suffixes an association alias that collides with a column", () => {
    const td = makeTData(
      {
        task_types: { id: col("integer", { primaryKey: true }) },
        crm_tasks: {
          id: col("integer", { primaryKey: true }),
          task_type_id: col("integer"),
          task_type: col("text"),
        },
      },
      [
        {
          parentTable: "task_types",
          parentModel: "TaskType",
          parentProp: "task_type",
          parentId: "task_type_id",
          childTable: "crm_tasks",
          childModel: "CrmTask",
          childProp: "crm_tasks",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    const tasks = getTableData(td, options).get("crm_tasks")!;

    expect(tasks.columns.get("task_type")?.name).toBe("task_type");
    expect(tasks.relations.has("task_type")).toBe(false);
    expect(tasks.relations.get("task_type_relation")?.type).toBe("belongsTo");
  });
});

describe("getTableData unique indexes", () => {
  const index = (overrides: Partial<TData["indexes"][string][number]> = {}) =>
    ({
      name: "items_unique",
      primary: false,
      unique: true,
      fields: [],
      indkey: "",
      definition: "",
      tableName: "items",
      type: "BTREE",
      ...overrides,
    }) as TData["indexes"][string][number];

  it("sets column-level unique only for a single-column unique index", () => {
    const td = makeTData({ items: { email: col("text") } }, [], {
      items: [
        index({
          fields: [{ attribute: "email", order: "", collate: "", length: "" }],
        }),
      ],
    });

    const table = getTableData(td, options).get("items")!;
    expect(table.columns.get("email")?.definition.unique).toBe(true);
    expect(table.indexes[0]?.fields).toEqual(["email"]);
  });

  it("keeps all fields of a composite unique out of column definitions", () => {
    const fields = ["tenant_id", "external_id"].map((attribute) => ({
      attribute,
      order: "",
      collate: "",
      length: "",
    }));
    const td = makeTData(
      {
        items: {
          tenant_id: col("integer"),
          external_id: col("text"),
        },
      },
      [],
      { items: [index({ fields })] },
    );

    const table = getTableData(td, options).get("items")!;
    expect(table.columns.get("tenant_id")?.definition.unique).toBeUndefined();
    expect(table.columns.get("external_id")?.definition.unique).toBeUndefined();
    expect(table.indexes[0]?.fields).toEqual(["tenant_id", "external_id"]);
    expect(table.indexes[0]?.unique).toBe(true);
  });

  it("skips a truncated functional index", () => {
    const functional = makeTData(
      {
        leads: {
          lead_id: col("integer"),
          entity_name: col("text"),
        },
      },
      [],
      {
        leads: [
          index({
            fields: [
              {
                attribute: "lead_id",
                order: "",
                collate: "",
                length: "",
              },
            ],
            indkey: "1 0",
            definition:
              "CREATE UNIQUE INDEX leads_unique ON leads USING btree (lead_id, lower(entity_name))",
          }),
        ],
      },
    );

    const functionalTable = getTableData(functional, options).get("leads")!;
    expect(
      functionalTable.columns.get("lead_id")?.definition.unique,
    ).toBeUndefined();
    expect(functionalTable.indexes).toEqual([]);
  });

  it("skips a partial index", () => {
    const partial = makeTData(
      {
        leads: {
          lead_id: col("integer"),
          deleted_at: col("timestamp"),
        },
      },
      [],
      {
        leads: [
          index({
            fields: [
              {
                attribute: "lead_id",
                order: "",
                collate: "",
                length: "",
              },
            ],
            indkey: "1",
            definition:
              "CREATE UNIQUE INDEX leads_unique ON leads USING btree (lead_id) WHERE (deleted_at IS NULL)",
          }),
        ],
      },
    );

    const partialTable = getTableData(partial, options).get("leads")!;
    expect(
      partialTable.columns.get("lead_id")?.definition.unique,
    ).toBeUndefined();
    expect(partialTable.indexes).toEqual([]);
  });
});

describe("getTableData skipFields", () => {
  it("excludes columns listed in skipFields from the output", () => {
    const td = makeTData(
      {
        users: {
          id: col("integer", { primaryKey: true }),
          name: col("text"),
          internal_notes: col("text"),
          secret_token: col("text"),
        },
      },
      [],
    );

    const db = getTableData(td, {
      ...options,
      skipFields: ["internal_notes", "secret_token"],
    });

    const users = db.get("users")!;
    expect([...users.columns.keys()]).toEqual(["id", "name"]);
    expect(users.columns.has("internal_notes")).toBe(false);
    expect(users.columns.has("secret_token")).toBe(false);
  });

  it("skips columns across multiple tables", () => {
    const td = makeTData(
      {
        users: {
          id: col("integer", { primaryKey: true }),
          created_at: col("timestamp"),
        },
        posts: {
          id: col("integer", { primaryKey: true }),
          title: col("text"),
          created_at: col("timestamp"),
        },
      },
      [],
    );

    const db = getTableData(td, {
      ...options,
      skipFields: ["created_at"],
    });

    expect(db.get("users")!.columns.has("created_at")).toBe(false);
    expect(db.get("users")!.columns.has("id")).toBe(true);
    expect(db.get("posts")!.columns.has("created_at")).toBe(false);
    expect(db.get("posts")!.columns.has("title")).toBe(true);
  });

  it("suppresses relations whose FK field is in skipFields", () => {
    const td = makeTData(
      {
        users: { id: col("integer", { primaryKey: true }) },
        posts: {
          id: col("integer", { primaryKey: true }),
          user_id: col("integer"),
          category_id: col("integer"),
        },
        categories: { id: col("integer", { primaryKey: true }) },
      },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "user_id",
          childTable: "posts",
          childModel: "Post",
          childProp: "posts",
          isOne: false,
          isM2M: false,
        },
        {
          parentTable: "categories",
          parentModel: "Category",
          parentProp: "category",
          parentId: "category_id",
          childTable: "posts",
          childModel: "Post",
          childProp: "posts",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    const db = getTableData(td, {
      ...options,
      skipFields: ["user_id"],
    });

    const posts = db.get("posts")!;
    const users = db.get("users")!;
    const categories = db.get("categories")!;

    // user_id FK column is skipped, so no user<->posts relation
    expect(posts.columns.has("user_id")).toBe(false);
    expect(
      [...posts.relations.values()].find((r) => r.targetTableName === "users"),
    ).toBeUndefined();
    expect(users.relations.size).toBe(0);

    // category_id is NOT skipped, so category<->posts relation remains
    expect(posts.columns.has("category_id")).toBe(true);
    expect(
      [...posts.relations.values()].find(
        (r) => r.targetTableName === "categories",
      )?.type,
    ).toBe("belongsTo");
    expect(categories.relations.size).toBe(1);
  });

  it("does nothing when skipFields is undefined or empty", () => {
    const td = makeTData(
      {
        users: {
          id: col("integer", { primaryKey: true }),
          name: col("text"),
        },
      },
      [],
    );

    const dbNoOpt = getTableData(td, options);
    const dbEmpty = getTableData(td, { ...options, skipFields: [] });

    expect([...dbNoOpt.get("users")!.columns.keys()]).toEqual(["id", "name"]);
    expect([...dbEmpty.get("users")!.columns.keys()]).toEqual(["id", "name"]);
  });

  it("only matches exact field names (no partial matching)", () => {
    const td = makeTData(
      {
        items: {
          id: col("integer", { primaryKey: true }),
          user_id: col("integer"),
          user_id_backup: col("integer"),
        },
      },
      [],
    );

    const db = getTableData(td, {
      ...options,
      skipFields: ["user_id"],
    });

    const items = db.get("items")!;
    expect(items.columns.has("user_id")).toBe(false);
    expect(items.columns.has("user_id_backup")).toBe(true);
  });
});

describe("getTableData skipRelations", () => {
  it("keeps the FK column but suppresses its relations", () => {
    const td = makeTData(
      {
        users: { id: col("integer", { primaryKey: true }) },
        posts: {
          id: col("integer", { primaryKey: true }),
          user_id: col("integer"),
        },
      },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "user_id",
          childTable: "posts",
          childModel: "Post",
          childProp: "posts",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    const db = getTableData(td, {
      ...options,
      skipRelations: ["user_id"],
    });

    const posts = db.get("posts")!;
    const users = db.get("users")!;

    // Column is still present
    expect(posts.columns.has("user_id")).toBe(true);
    // But no relations on either side
    expect(posts.relations.size).toBe(0);
    expect(users.relations.size).toBe(0);
  });

  it("only suppresses relations for listed fields, others remain", () => {
    const td = makeTData(
      {
        users: { id: col("integer", { primaryKey: true }) },
        categories: { id: col("integer", { primaryKey: true }) },
        posts: {
          id: col("integer", { primaryKey: true }),
          user_id: col("integer"),
          category_id: col("integer"),
        },
      },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "user_id",
          childTable: "posts",
          childModel: "Post",
          childProp: "posts",
          isOne: false,
          isM2M: false,
        },
        {
          parentTable: "categories",
          parentModel: "Category",
          parentProp: "category",
          parentId: "category_id",
          childTable: "posts",
          childModel: "Post",
          childProp: "posts",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    const db = getTableData(td, {
      ...options,
      skipRelations: ["user_id"],
    });

    const posts = db.get("posts")!;
    const users = db.get("users")!;
    const categories = db.get("categories")!;

    // Both columns kept
    expect(posts.columns.has("user_id")).toBe(true);
    expect(posts.columns.has("category_id")).toBe(true);

    // user_id relation suppressed
    expect(
      [...posts.relations.values()].find((r) => r.targetTableName === "users"),
    ).toBeUndefined();
    expect(users.relations.size).toBe(0);

    // category_id relation still wired
    expect(
      [...posts.relations.values()].find(
        (r) => r.targetTableName === "categories",
      )?.type,
    ).toBe("belongsTo");
    expect(categories.relations.size).toBe(1);
  });

  it("does nothing when skipRelations is undefined or empty", () => {
    const td = makeTData(
      {
        users: { id: col("integer", { primaryKey: true }) },
        posts: {
          id: col("integer", { primaryKey: true }),
          user_id: col("integer"),
        },
      },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "user_id",
          childTable: "posts",
          childModel: "Post",
          childProp: "posts",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    const dbNoOpt = getTableData(td, options);
    const dbEmpty = getTableData(td, { ...options, skipRelations: [] });

    // Relations still present in both cases
    expect(dbNoOpt.get("posts")!.relations.size).toBe(1);
    expect(dbNoOpt.get("users")!.relations.size).toBe(1);
    expect(dbEmpty.get("posts")!.relations.size).toBe(1);
    expect(dbEmpty.get("users")!.relations.size).toBe(1);
  });

  it("does not interfere with skipFields", () => {
    const td = makeTData(
      {
        users: { id: col("integer", { primaryKey: true }) },
        categories: { id: col("integer", { primaryKey: true }) },
        posts: {
          id: col("integer", { primaryKey: true }),
          user_id: col("integer"),
          category_id: col("integer"),
          internal_notes: col("text"),
        },
      },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "user_id",
          childTable: "posts",
          childModel: "Post",
          childProp: "posts",
          isOne: false,
          isM2M: false,
        },
        {
          parentTable: "categories",
          parentModel: "Category",
          parentProp: "category",
          parentId: "category_id",
          childTable: "posts",
          childModel: "Post",
          childProp: "posts",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    const db = getTableData(td, {
      ...options,
      skipFields: ["internal_notes"],
      skipRelations: ["user_id"],
    });

    const posts = db.get("posts")!;

    // skipFields removes the column entirely
    expect(posts.columns.has("internal_notes")).toBe(false);
    // skipRelations keeps the column but drops the relation
    expect(posts.columns.has("user_id")).toBe(true);
    expect(
      [...posts.relations.values()].find((r) => r.targetTableName === "users"),
    ).toBeUndefined();
    // category_id is untouched by both options
    expect(posts.columns.has("category_id")).toBe(true);
    expect(
      [...posts.relations.values()].find(
        (r) => r.targetTableName === "categories",
      )?.type,
    ).toBe("belongsTo");
  });
});

describe("getTableData relationRenames", () => {
  it("renames a relation when relationRenames is specified", () => {
    const td = makeTData(
      {
        users: { id: col("integer", { primaryKey: true }) },
        posts: {
          id: col("integer", { primaryKey: true }),
          user_id: col("integer"),
        },
      },
      [
        {
          parentTable: "users",
          parentModel: "User",
          parentProp: "user",
          parentId: "user_id",
          childTable: "posts",
          childModel: "Post",
          childProp: "posts",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    const db = getTableData(td, {
      ...options,
      relationRenames: { users: { posts: "authored_posts" } },
    });

    const users = db.get("users")!;
    expect(users.relations.has("posts")).toBe(false);
    expect(users.relations.get("authored_posts")?.type).toBe("hasMany");
  });

  // Simulates composite FK scenario: two relations target the same parent table,
  // one gets the short name, the other gets a longer prefixed name.
  // With relationRenamesOverwrite, renaming the long name to the short name
  // should overwrite the existing (broken) relation.
  it("default mode: suffixes renamed relation that collides with an existing one", () => {
    const td = makeTData(
      {
        orders: {
          id: col("integer", { primaryKey: true }),
          tenant_id: col("integer"),
          order_id: col("integer"),
        },
        order_attachments: {
          id: col("integer", { primaryKey: true }),
          order_id: col("integer"),
          tenant_id: col("integer"),
        },
      },
      [
        // First relation: composite FK's tenant_id part — broken, but gets the short name
        {
          parentTable: "orders",
          parentModel: "Order",
          parentProp: "order",
          parentId: "tenant_id",
          childTable: "order_attachments",
          childModel: "OrderAttachment",
          childProp: "order_attachments",
          isOne: false,
          isM2M: false,
        },
        // Second relation: correct FK — but gets the long prefixed name
        {
          parentTable: "orders",
          parentModel: "Order",
          parentProp: "order",
          parentId: "order_id",
          childTable: "order_attachments",
          childModel: "OrderAttachment",
          childProp: "order_order_attachments",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    // Default mode: renaming the long name to the short name collides,
    // so it gets suffixed with _relation
    const db = getTableData(td, {
      ...options,
      relationRenames: {
        orders: {
          order_order_attachments: "order_attachments",
        },
      },
    });

    const orders = db.get("orders")!;
    // The first (broken) relation claimed "order_attachments"
    expect(orders.relations.has("order_attachments")).toBe(true);
    // The renamed relation got suffixed because of the collision
    expect(orders.relations.has("order_attachments_relation")).toBe(true);
  });

  it("overwrite mode: renamed relation overwrites the existing one", () => {
    const td = makeTData(
      {
        orders: {
          id: col("integer", { primaryKey: true }),
          tenant_id: col("integer"),
          order_id: col("integer"),
        },
        order_attachments: {
          id: col("integer", { primaryKey: true }),
          order_id: col("integer"),
          tenant_id: col("integer"),
        },
      },
      [
        // First relation: composite FK's tenant_id part — broken, but gets the short name
        {
          parentTable: "orders",
          parentModel: "Order",
          parentProp: "order",
          parentId: "tenant_id",
          childTable: "order_attachments",
          childModel: "OrderAttachment",
          childProp: "order_attachments",
          isOne: false,
          isM2M: false,
        },
        // Second relation: correct FK — but gets the long prefixed name
        {
          parentTable: "orders",
          parentModel: "Order",
          parentProp: "order",
          parentId: "order_id",
          childTable: "order_attachments",
          childModel: "OrderAttachment",
          childProp: "order_order_attachments",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    // Overwrite mode: the rename directly sets on the map, overwriting the broken relation
    const db = getTableData(td, {
      ...options,
      relationRenamesOverwrite: true,
      relationRenames: {
        orders: {
          order_order_attachments: "order_attachments",
        },
      },
    });

    const orders = db.get("orders")!;
    // The renamed relation overwrote the broken one — now points to correct FK
    expect(orders.relations.has("order_attachments")).toBe(true);
    expect(orders.relations.get("order_attachments")?.foreignKey).toBe(
      "order_id",
    );
    // No _relation suffix version exists
    expect(orders.relations.has("order_attachments_relation")).toBe(false);
  });

  it("overwrite mode: non-renamed relations still use collision detection", () => {
    const td = makeTData(
      {
        task_types: { id: col("integer", { primaryKey: true }) },
        crm_tasks: {
          id: col("integer", { primaryKey: true }),
          task_type_id: col("integer"),
          task_type: col("text"),
        },
      },
      [
        {
          parentTable: "task_types",
          parentModel: "TaskType",
          parentProp: "task_type",
          parentId: "task_type_id",
          childTable: "crm_tasks",
          childModel: "CrmTask",
          childProp: "crm_tasks",
          isOne: false,
          isM2M: false,
        },
      ],
    );

    // Even with overwrite mode on, non-renamed relations still use getRelationName
    const tasks = getTableData(td, {
      ...options,
      relationRenamesOverwrite: true,
    }).get("crm_tasks")!;

    expect(tasks.columns.get("task_type")?.name).toBe("task_type");
    expect(tasks.relations.has("task_type")).toBe(false);
    expect(tasks.relations.get("task_type_relation")?.type).toBe("belongsTo");
  });
});
