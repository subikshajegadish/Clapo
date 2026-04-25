import { useCallback, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { extractTextFromDocx } from "./docxText.js";
import { analyzePolicy } from "./api.js";
import Results from "./Results.jsx";
import "./Analyze.css";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

function fileKind(file) {
  const n = file.name.toLowerCase();
  if (n.endsWith(".txt")) return "txt";
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  return null;
}

function readTxtFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read text file."));
    reader.readAsText(file, "UTF-8");
  });
}

function pageTextFromPdfContent(content) {
  let out = "";
  for (const item of content.items) {
    if (!item || typeof item !== "object") continue;
    if (!("str" in item) || typeof item.str !== "string") continue;
    out += item.str;
    if (item.hasEOL) out += "\n";
    else out += " ";
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/ +/g, " ").trim();
}

async function extractPdfText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  // Avoid loading fonts from a CDN (often blocked → net::ERR_FAILED in console).
  // useSystemFonts lets the browser supply metrics for common PDF built-ins.
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const parts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = pageTextFromPdfContent(content);
    if (pageText) parts.push(pageText);
  }
  return parts.join("\n\n").trim();
}

async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  return extractTextFromDocx(arrayBuffer);
}

/**
 * @param {{ profileId: number | null }} props
 */
export default function Analyze({ profileId }) {
  const [policyText, setPolicyText] = useState("");
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const onFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setExtractError(null);
    setAnalyzeError(null);
    setAnalysis(null);
    setPolicyText("");
    setFileName("");

    if (!file) return;

    const kind = fileKind(file);
    if (!kind) {
      setExtractError("Use a .txt, .pdf, or .docx file.");
      return;
    }

    setExtracting(true);
    setFileName(file.name);
    try {
      let text = "";
      if (kind === "txt") {
        text = await readTxtFile(file);
      } else if (kind === "pdf") {
        text = await extractPdfText(file);
      } else {
        text = await extractDocxText(file);
      }
      if (!text.trim()) {
        setExtractError(
          "No text was found in this file. Many PDFs are scanned images with no selectable text—try pasting the policy in the box below, or use a .txt / Word-exported .docx file."
        );
        return;
      }
      setPolicyText(text);
    } catch (err) {
      setExtractError(err?.message || "Could not read this file.");
    } finally {
      setExtracting(false);
    }
  }, []);

  const onAnalyze = useCallback(async () => {
    setAnalyzeError(null);
    setAnalysis(null);
    if (profileId == null) {
      setAnalyzeError("Select a profile first.");
      return;
    }
    if (!policyText.trim()) {
      setAnalyzeError("Add policy text (upload a file or type in the box below).");
      return;
    }

    setAnalyzing(true);
    try {
      const result = await analyzePolicy(profileId, policyText);
      setAnalysis(result);
    } catch (err) {
      setAnalyzeError(err?.message || "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }, [profileId, policyText]);

  const busy = extracting || analyzing;

  return (
    <section className="analyze" aria-labelledby="analyze-heading">
      <h2 id="analyze-heading" className="analyze-title">
        Policy document
      </h2>
      <p className="analyze-hint">
        Upload a .txt, .pdf, or .docx (text is read in your browser), or paste the
        policy below. Scanned PDFs often have no extractable text.
      </p>

      <label className="analyze-file-label" htmlFor="analyze-policy-file">
        <span className="analyze-file-btn">Choose file</span>
        <input
          id="analyze-policy-file"
          type="file"
          accept=".pdf,.docx,.txt"
          className="analyze-file-input"
          onChange={onFileChange}
          disabled={busy}
        />
      </label>
      {fileName && (
        <p className="analyze-file-name">
          {fileName}
          {extracting ? " — reading…" : ""}
        </p>
      )}

      {extractError && (
        <p className="analyze-error" role="alert">
          {extractError}
        </p>
      )}

      <label className="analyze-textarea-label" htmlFor="analyze-policy-text">
        Policy text
        <textarea
          id="analyze-policy-text"
          className="analyze-textarea"
          rows={10}
          value={policyText}
          onChange={(e) => {
            setPolicyText(e.target.value);
            setAnalyzeError(null);
          }}
          placeholder="Paste policy language here, or choose a file above…"
          disabled={extracting}
          spellCheck={true}
        />
      </label>
      <p className="analyze-char-count" aria-live="polite">
        {policyText.length} characters
      </p>

      <button
        type="button"
        className="analyze-submit"
        onClick={onAnalyze}
        disabled={busy || profileId == null || !policyText.trim()}
      >
        {analyzing ? "Analyzing…" : extracting ? "Please wait…" : "Analyze Policy"}
      </button>

      {analyzeError && (
        <p className="analyze-error" role="alert">
          {analyzeError}
        </p>
      )}

      {analysis && <Results result={analysis} />}
    </section>
  );
}
