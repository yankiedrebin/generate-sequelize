import { GeneratorOptions } from "./types";
import getTableData from "./getDbData";
import path from "path";
import SequelizeAuto from "sequelize-auto";
import addJoinTables from "./addJoinTables";
import ejs from "ejs";
import { mkdirp } from "mkdirp";
import { existsSync, readFileSync, writeFileSync } from "fs";
import ImportManager from "./classes/ImportManager";
import prettier from "prettier";

export async function main() {
  const configPath = path.join(
    process.cwd(),
    process.argv[2] ?? ".generate-sequelize.cjs",
  );
  console.log(configPath, "PATH FROM:", process.argv.length, process.argv);
  const config = (await import(configPath)).default as GeneratorOptions;
  const {
    joinTables,
    username = "",
    password = "",
    database = "",
    targetLib = "sequelize",
    ...rest
  } = config;
  const auto = new SequelizeAuto(database, username, password, {
    ...rest,
    useDefine: false,
    singularize: !!rest.singularize,
  });
  const td = auto.relate(await auto.build());
  const tableData = getTableData(td, config);

  joinTables && addJoinTables(tableData, joinTables);

  const templatesRoot = path.join(__dirname, "..", "templates");
  const targetLibTemplateDir = path.join(templatesRoot, targetLib);
  const modelTemplatePath = path.join(targetLibTemplateDir, "model.ejs");
  mkdirp.sync(config.directory);
  [...tableData.values()].forEach(async (table) => {
    const importManager = new ImportManager();
    const prep = await ejs.renderFile(modelTemplatePath, table, {
      context: importManager,
    });
    const resolveImports = ejs.render(prep, importManager, {
      context: { dirName: path.join(templatesRoot, "partials") },
    });
    const fileName = path.join(config.directory, `${table.fileName}.ts`);
    await write(fileName, resolveImports, config);
  });
  if (!config.noInitModels) {
    const initFile = await ejs.renderFile(
      path.join(targetLibTemplateDir, "init-models.ejs"),
      {
        allTables: [...tableData.values()],
      },
    );
    const initFilePath = path.join(config.directory, "init-models.ts");
    await write(initFilePath, initFile, config);
  }
}

function replaceRegions(filePath: string, templateFile: string) {
  if (existsSync(filePath)) {
    return readFileSync(filePath, "utf-8").replace(
      /\/\* auto-generated ([a-z]+) \*\/[\s\S]*?\/\* auto-generated \1 \*\//g,
      (_, region) => {
        return (
          templateFile.match(
            new RegExp(
              `\\/\\* auto-generated ${region} \\*\\/[\\s\\S]*?\\/\\* auto-generated ${region} \\*\\/`,
            ),
          )?.[0] || ""
        );
      },
    );
  }
  return templateFile;
}

async function write(
  filePath: string,
  templateFile: string,
  config: GeneratorOptions,
) {
  templateFile = replaceRegions(filePath, templateFile);
  templateFile = await prettier.format(templateFile, {
    ...config.prettierOptions,
    parser: "typescript",
    semi: true,
  });
  if (config.replacements) {
    config.replacements.forEach(([pattern, replacement]) => {
      templateFile = templateFile.replace(pattern, replacement);
    });
  }
  writeFileSync(filePath, templateFile);
}
