import { init, parse } from "es-module-lexer";

export async function staticModuleSpecifiers(source) {
  await init;
  const [imports] = parse(source);
  return imports
    .filter((entry) => entry.d === -1 && entry.n)
    .map((entry) => entry.n);
}
