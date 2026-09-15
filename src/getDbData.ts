import {
  ColumnData,
  GeneratorOptions,
  DBData,
  ReferenceData,
  RelationData,
  TableData,
} from "./types";
import { TableData as TData } from "sequelize-auto";
import {
  getDataType,
  getTsType,
  recase,
  getDefaultValue,
  escapeComment,
} from "./utils";
import { IndexesOptions, ModelAttributeColumnOptions } from "sequelize";
import { TSField } from "sequelize-auto/types/types";
import { ColumnOrder } from "./getColumnOrder";

export default function getTableData(
  tableData: TData,
  options: GeneratorOptions,
  columnOrder?: ColumnOrder,
): DBData {
  const db: DBData = new Map();
  const skipFieldsSet = options.skipFields?.length
    ? new Set(options.skipFields)
    : undefined;
  const skipRelationsSet = options.skipRelations?.length
    ? new Set(options.skipRelations)
    : undefined;
  Object.entries(tableData.tables)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([key, table]) => {
      if (key.toLowerCase().includes("sequelizemeta")) return;
      const split = key.split(".");
      const [schema, tableName] =
        split.length > 1 ? split : [undefined, split[0]!];
      const modelName = recase(
        tableName,
        options.caseModel,
        options.singularize,
      );
      const fileName = recase(tableName, options.caseFile, options.singularize);
      const columnsData: TableData["columns"] = new Map();
      const orderedColumns = Object.entries(table);
      const positions = columnOrder?.get(key);
      if (positions) {
        orderedColumns.sort(
          ([left], [right]) =>
            (positions.get(left) ?? Number.MAX_SAFE_INTEGER) -
              (positions.get(right) ?? Number.MAX_SAFE_INTEGER) ||
            compareNames(left, right),
        );
      }
      orderedColumns.forEach(([field, col]) => {
        if (skipFieldsSet?.has(field)) return;
        const {
          allowNull,
          autoIncrement,
          comment,
          defaultValue,
          elementType,
          primaryKey,
          special,
          type,
        } = col as TSField;
        const autoI =
          autoIncrement || !!(primaryKey && defaultValue) ? true : undefined;
        const unique = getIsColUnique(field, tableData.indexes?.[key]);
        const typeStr = getDataType(type, special, elementType);
        const tsType =
          getTsType(type, special, elementType) +
          (options.addNullToTypes && allowNull ? " | null" : "");
        const defaultVal = autoI
          ? undefined
          : getDefaultValue(defaultValue, tsType, typeStr);
        const fk = getFk(field, tableData?.foreignKeys?.[key]);
        const references = fk
          ? {
              model: fk.foreignSources.target_table,
              key: fk.foreignSources.target_column,
            }
          : undefined;
        const refData: ReferenceData | undefined = references
          ? {
              modelName: recase(references.model!, options.caseModel),
              key: references.key!,
              tableName: references.model!,
              fileName: recase(references.model!, options.caseFile),
            }
          : undefined;
        const name = recase(field, options.caseProp);
        const definition: ModelAttributeColumnOptions = {
          type: typeStr,
          allowNull: !!allowNull,
          defaultValue: defaultVal,
          autoIncrement: autoI,
          comment: escapeComment(comment),
          field: name === field ? undefined : field,
          primaryKey: primaryKey || undefined,
          unique,
          references,
        };
        const colData: ColumnData = {
          definition,
          field,
          name,
          tableName,
          tableModelName: modelName,
          tsType,
          refData,
        };
        columnsData.set(field, colData);
      });
      const td: TableData = {
        columns: columnsData,
        fileName,
        modelName,
        relations: new Map(),
        schema,
        tableName,
        indexes: [],
      };

      tableData.indexes[key]?.forEach((index) => {
        if (isUnsupportedIndex(index)) return;
        const indData: IndexesOptions = {
          name: index.name,
          unique: index.unique || undefined,
          using: index.type,
          fields: index.fields.map(({ order, attribute }) =>
            order === "ASC" || order === "DESC"
              ? {
                  name: attribute,
                  order,
                }
              : attribute,
          ),
        };
        td.indexes.push(indData);
      });
      db.set(tableName, td);
    });

  tableData.relations.forEach((rel) => {
    const {
      childModel,
      childProp,
      childTable,
      isOne,
      parentId,
      parentModel,
      parentProp,
      parentTable,
    } = rel;
    const [childTableName, parentTableName] = [
      childTable.split(".").pop()!,
      parentTable.split(".").pop()!,
    ];
    const childData = db.get(childTableName);
    const parentData2 = db.get(parentTableName);
    // Skip relations that reference tables excluded via skipTables/tables
    if (!childData || !parentData2) return;
    // Skip relations whose FK field was excluded via skipFields
    if (skipFieldsSet?.has(parentId)) return;
    // Skip relations for FK fields listed in skipRelations (columns are kept)
    if (skipRelationsSet?.has(parentId)) return;
    const fk = [...childData.columns.values()].find((c) => c.name === parentId);
    if (!fk) return;
    const optional = fk.definition.allowNull;
    const parentData: RelationData = {
      foreignKey: parentId,
      targetFileName: recase(
        childTableName,
        options.caseFile,
        options.singularize,
      ),
      targetTableName: childTableName,
      targetName: childModel,
      type: isOne ? "hasOne" : "hasMany",
      optional: isOne,
    };
    const childRelData: RelationData = {
      foreignKey: parentId,
      targetFileName: recase(
        parentTableName,
        options.caseFile,
        options.singularize,
      ),
      targetTableName: parentTableName,
      targetName: parentModel,
      type: "belongsTo",
      optional: optional,
    };
    const childRelationName = getRelationName(
      childData,
      options.relationRenames?.[childData.tableName]?.[parentProp] ||
        parentProp,
    );
    const parentRelationName = getRelationName(
      parentData2,
      options.relationRenames?.[parentTableName]?.[childProp] || childProp,
    );
    childData.relations.set(childRelationName, childRelData);
    parentData2.relations.set(parentRelationName, parentData);
  });

  return db;
}

function compareNames(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function getRelationName(table: TableData, name: string) {
  const columnNames = new Set(
    [...table.columns.values()].map((column) => column.name),
  );
  if (!columnNames.has(name) && !table.relations.has(name)) return name;

  const suffixedName = `${name}_relation`;
  let candidate = suffixedName;
  let suffix = 2;
  while (columnNames.has(candidate) || table.relations.has(candidate)) {
    candidate = `${suffixedName}_${suffix++}`;
  }
  return candidate;
}

function getFk(name: string, foreignKeys?: TData["foreignKeys"][string]) {
  if (foreignKeys?.[name]?.isForeignKey) return foreignKeys[name];
}

/**
 * Returns true if the column is unique by itself
 * @param name The name of the column
 * @param indexes The indexes of the table
 * @returns true if the column is unique, false otherwise
 */
function getIsColUnique(name: string, indexes?: TData["indexes"][string]) {
  return (
    indexes?.some(
      (index) =>
        !index.primary &&
        index.unique &&
        !isUnsupportedIndex(index) &&
        index.fields?.length === 1 &&
        index.fields[0]?.attribute === name,
    ) || undefined
  );
}

type AutoIndex = TData["indexes"][string][number];

/**
 * Sequelize's PostgreSQL index parser drops functional fields and partial
 * predicates. Skip those indexes rather than generating a weaker constraint.
 */
function isUnsupportedIndex(index: AutoIndex) {
  if (index.definition && /\bWHERE\b/i.test(index.definition)) return true;
  if (index.indkey?.trim().split(/\s+/).includes("0")) return true;
  if (index.fields?.some((field) => !field.attribute)) return true;

  const definitionFieldCount = index.definition
    ? getDefinitionFieldCount(index.definition)
    : undefined;
  return (
    definitionFieldCount !== undefined &&
    definitionFieldCount !== index.fields?.length
  );
}

function getDefinitionFieldCount(definition: string) {
  const using = /\bUSING\s+\w+\s*\(/i.exec(definition);
  if (!using) return;

  const start = using.index + using[0].lastIndexOf("(");
  let depth = 0;
  let count = 1;
  let quote: string | undefined;
  for (let i = start; i < definition.length; i++) {
    const char = definition[i]!;
    if (quote) {
      if (char === quote && definition[i - 1] !== "\\") quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth--;
      if (depth === 0) return count;
    } else if (char === "," && depth === 1) {
      count++;
    }
  }
}
