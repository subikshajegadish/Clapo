/**
 * Extract plain text from a .docx (Office Open XML) file using Mammoth.
 * Dynamic import keeps mammoth + jszip out of the initial JS chunk.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<string>}
 */
export async function extractTextFromDocx(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return "";
  }

  const mod = await import("mammoth");
  const mammoth = mod.default ?? mod;

  if (typeof mammoth?.extractRawText !== "function") {
    throw new Error("Mammoth failed to load (no extractRawText).");
  }

  const result = await mammoth.extractRawText({ arrayBuffer });
  const value = result?.value;

  if (result?.messages?.length && import.meta.env.DEV) {
    console.debug(
      "[docx] mammoth messages:",
      result.messages.map((m) => m.message).join("; ")
    );
  }

  return String(value ?? "").trim();
}
