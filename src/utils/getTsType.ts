import getEnumValues from "./getEnumValues";

export default function getTsType(
  type: string,
  special?: string[],
  elementType?: string,
): string {
  const fieldType = type.toLowerCase();

  let jsType: string;

  if (isArray(fieldType)) {
    if (/(range)/.test(fieldType)) {
      let rangeType = "number";
      if (["daterange", "tsrange", "tstzrange"].includes(fieldType)) {
        rangeType = "Date | string";
      }
      jsType = `[lower: { value: ${rangeType}, inclusive: boolean }, higher: { value: ${rangeType}, inclusive: boolean }]`;
    } else {
      const eltype = elementType ? getTsType(elementType) : "unknown";
      jsType = eltype + "[]";
    }
  } else if (isNumber(fieldType)) {
    jsType = "number";
  } else if (isBoolean(fieldType)) {
    jsType = "boolean";
  } else if (isDate(fieldType)) {
    jsType = "Date";
  } else if (isString(fieldType)) {
    jsType = "string";
  } else if (isEnum(fieldType)) {
    const values = getEnumValues(type, special);
    jsType = values.join(" | ");
  } else if (isJSON(fieldType)) {
    jsType = "object";
  } else {
    console.log(`Missing TypeScript type: ${fieldType}`);
    jsType = "unknown";
  }
  return jsType;
}

function isNumber(fieldType: string): boolean {
  return /^(smallint|mediumint|tinyint|int|bigint|float|money|smallmoney|double|decimal|numeric|real|oid|smallserial|serial|bigserial)/.test(
    fieldType,
  );
}

function isBoolean(fieldType: string): boolean {
  return /^(boolean|bit)/.test(fieldType);
}

function isDate(fieldType: string): boolean {
  return /^(datetime|timestamp)/.test(fieldType);
}

function isString(fieldType: string): boolean {
  return /^(char|nchar|string|varying|varchar|nvarchar|text|citext|longtext|mediumtext|tinytext|ntext|uuid|uniqueidentifier|date|time|inet|cidr|macaddr|macaddr8|tsvector|tsquery|hstore|point|line|lseg|box|path|polygon|circle|interval|tsvector|hstore)/.test(
    fieldType,
  );
}

function isArray(fieldType: string): boolean {
  return /(^array)|(range$)/.test(fieldType);
}

function isEnum(fieldType: string): boolean {
  return /^(enum)/.test(fieldType);
}

function isJSON(fieldType: string): boolean {
  return /^(json|jsonb)/.test(fieldType);
}
