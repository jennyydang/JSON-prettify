"use client";

import { useState, useRef, useCallback } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prettify = useCallback(() => {
    if (!input.trim()) {
      setError("Please enter or upload some JSON.");
      setOutput("");
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError("");
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
      setOutput("");
    }
  }, [input]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInput(ev.target?.result as string);
      setOutput("");
      setError("");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prettified.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  return (
    <main className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{"{}"}</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">JSON Prettify</h1>
          <span className="text-sm text-gray-400">Format &amp; beautify your JSON</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload strip */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 bg-white text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <UploadIcon />
            Upload JSON file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,text/plain"
            className="hidden"
            onChange={handleFileUpload}
          />
          <span className="text-gray-400 text-sm">or paste JSON below</span>
        </div>

        {/* Two-column editor layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Input</label>
              {input && (
                <button
                  onClick={handleClear}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError("");
              }}
              placeholder={"{\n  \"key\": \"value\"\n}"}
              spellCheck={false}
              className="w-full h-[480px] p-4 rounded-xl border border-gray-200 bg-white font-mono text-sm text-gray-800 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            />

            {/* Prettify button */}
            <button
              onClick={prettify}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
            >
              Prettify
            </button>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <ErrorIcon />
                <p className="text-sm text-red-600 font-mono">{error}</p>
              </div>
            )}
          </div>

          {/* Output panel */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Output</label>
              {output && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    <DownloadIcon />
                    Download
                  </button>
                </div>
              )}
            </div>

            <div className="relative h-[480px] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {output ? (
                <pre className="w-full h-full p-4 overflow-auto font-mono text-sm text-gray-800 whitespace-pre">
                  <SyntaxHighlight json={output} />
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                  <JsonIcon />
                  <p className="text-sm">Prettified JSON will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── Syntax highlighter ─────────────────────────────────────────────── */

function SyntaxHighlight({ json }: { json: string }) {
  const parts: React.ReactNode[] = [];
  // Matches: strings (with optional colon → key), numbers, booleans/null, punctuation
  const regex =
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(json)) !== null) {
    if (match.index > lastIndex) {
      parts.push(json.slice(lastIndex, match.index));
    }

    const [full, str, colon, num, keyword, punctuation] = match;

    if (str !== undefined) {
      if (colon) {
        // object key
        parts.push(
          <span key={match.index} className="text-indigo-600 font-medium">
            {str}
          </span>
        );
        parts.push(colon);
      } else {
        // string value
        parts.push(
          <span key={match.index} className="text-emerald-600">
            {str}
          </span>
        );
      }
    } else if (num !== undefined) {
      parts.push(
        <span key={match.index} className="text-amber-600">
          {num}
        </span>
      );
    } else if (keyword !== undefined) {
      parts.push(
        <span key={match.index} className="text-rose-500 font-medium">
          {keyword}
        </span>
      );
    } else if (punctuation !== undefined) {
      parts.push(
        <span key={match.index} className="text-gray-400">
          {punctuation}
        </span>
      );
    } else {
      parts.push(full);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < json.length) {
    parts.push(json.slice(lastIndex));
  }

  return <>{parts}</>;
}

/* ── Icons ──────────────────────────────────────────────────────────── */

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function JsonIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
