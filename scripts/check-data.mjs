import { glossary } from "../src/data/glossary.js";
import { curriculum } from "../src/data/curriculum.js";
import { labs } from "../src/data/labs.js";
import { dataSchemas } from "../src/data/schemas.js";

const failures = [];

if (glossary.length < 242) {
  failures.push(`術語表至少應包含來源文件 242 條，目前 ${glossary.length} 條。`);
}

for (const [index, term] of glossary.entries()) {
  for (const field of ["id", "zh", "en", "definition", "chapter"]) {
    if (!term[field]) failures.push(`glossary[${index}] 缺少 ${field}`);
  }
}

const modules = curriculum.levels.flatMap((level) => level.modules);
if (modules.length < 12) {
  failures.push(`P0 curriculum 應至少列出 L1/L2 的 12 個模組，目前 ${modules.length} 個。`);
}

for (const requiredTerm of ["重佈線層", "凸塊下金屬層", "底填膠", "表面活化", "離子污染"]) {
  if (!glossary.some((term) => term.zh === requiredTerm)) {
    failures.push(`封裝清潔新增術語未進術語表：${requiredTerm}`);
  }
}

if (labs.length !== 32) {
  failures.push(`互動元件清單應為 A01-A32 共 32 件，目前 ${labs.length} 件。`);
}

for (const [name, schema] of Object.entries(dataSchemas)) {
  if (!Array.isArray(schema.required) || schema.required.length === 0) {
    failures.push(`dataSchemas.${name} 缺少 required 欄位。`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("資料模組檢查通過。");
