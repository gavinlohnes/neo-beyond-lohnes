import { readOperatorContext } from "../operatorContext";
export { dayLine } from "./dayLine";

/** Automatic consumers keep their existing PREP/RECOVERY allowance, never personal opt-in sources. */
export async function buildAlfredContext(now = new Date(), includePreparationMemory = true): Promise<string> {
  return (await readOperatorContext({ purpose: "automatic", includePersonal: false, includePreparationMemory }, now)).text;
}
