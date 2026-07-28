import React, { useState } from 'react';

/**
 * Intelligent Bengali & English Assignment Question & Instruction Parser
 */
export function parseAssignmentQuestions(rawText) {
  if (!rawText || typeof rawText !== 'string') return { text: '', links: [], parsedItems: [] };

  const text = rawText.trim();

  // 1. Extract URLs / Links
  const urlRegex = /(https?:\/\/[^\s<]+)/gi;
  const extractedLinks = text.match(urlRegex) || [];

  // 2. Regex pattern for Bengali and English question numbers:
  // e.g. 1., 1), ১., ১), Q1., Q1), (১), (1), ক., ক)
  const questionRegex = /(?:^|\s|\n)(?:(?:প্রশ্ন\s*)?\(?\s*([০-৯\d]+|[কখগঘa-dA-D])\s*[\.:\)]\s*)/gi;

  const matches = [];
  let match;
  while ((match = questionRegex.exec(text)) !== null) {
    matches.push({
      num: match[1],
      fullMatch: match[0],
      index: match.index,
      length: match[0].length
    });
  }

  const items = [];

  if (matches.length > 0) {
    // Check if there is a prefix/section header before the first question number
    const firstIndex = matches[0].index;
    if (firstIndex > 0) {
      const prefix = text.substring(0, firstIndex).trim();
      if (prefix) {
        items.push({ type: 'header', content: prefix });
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const start = current.index + current.length;
      const end = next ? next.index : text.length;
      let contentChunk = text.substring(start, end).trim();

      // Check if trailing part of contentChunk contains a section header for the NEXT item
      // e.g. "...উত্তর আলোচনা করুন। ফৌজদারি আইন ও দণ্ডবিধি "
      if (next) {
        const lastSentenceEnd = Math.max(
          contentChunk.lastIndexOf('।'),
          contentChunk.lastIndexOf('?'),
          contentChunk.lastIndexOf('.'),
          contentChunk.lastIndexOf('!')
        );

        if (lastSentenceEnd !== -1 && lastSentenceEnd < contentChunk.length - 1) {
          const headingPart = contentChunk.substring(lastSentenceEnd + 1).trim();
          const bodyPart = contentChunk.substring(0, lastSentenceEnd + 1).trim();
          if (headingPart.length > 0 && headingPart.length < 80) {
            items.push({ type: 'question', num: current.num, content: bodyPart });
            items.push({ type: 'header', content: headingPart });
            continue;
          }
        }
      }

      items.push({ type: 'question', num: current.num, content: contentChunk });
    }
  } else {
    // Split by newlines if no question numbers detected
    const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
    lines.forEach((line, idx) => {
      if (line.endsWith(':') || line.startsWith('#') || line.startsWith('📌') || line.startsWith('🏛️') || line.startsWith('⚖️')) {
        items.push({ type: 'header', content: line });
      } else {
        items.push({ type: 'text', content: line, num: lines.length > 1 ? (idx + 1) : null });
      }
    });
  }

  return {
    text,
    links: Array.from(new Set(extractedLinks)),
    parsedItems: items
  };
}

export default function QuestionFormattedView({ description, title = 'অ্যাসাইনমেন্ট প্রশ্ন/নির্দেশনা:' }) {
  const [copied, setCopied] = useState(false);

  if (!description) return null;

  const { text, links, parsedItems } = parseAssignmentQuestions(description);

  const handleCopyText = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 text-slate-100 shadow-xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/30">
            📌
          </span>
          <h4 className="font-extrabold text-amber-300 text-sm tracking-wide">
            {title}
          </h4>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {links.length > 0 && (
            <a
              href={links[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5 animate-pulse"
            >
              <span>🔗</span>
              <span>ড্রাইভ ফাইল / লিঙ্ক খুলুন ↗</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleCopyText}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <span>{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'কপি হয়েছে!' : 'প্রশ্ন কপি করুন'}</span>
          </button>
        </div>
      </div>

      {/* Main Question Cards / List View */}
      <div className="space-y-3">
        {parsedItems.map((item, idx) => {
          if (item.type === 'header') {
            return (
              <div key={idx} className="pt-2 pb-1">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-600/20 to-amber-400/10 text-amber-300 font-extrabold text-xs border border-amber-500/30 shadow-sm">
                  <span>🏛️</span>
                  <span>{item.content}</span>
                </span>
              </div>
            );
          }

          if (item.type === 'question' || item.type === 'text') {
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/40 transition-all flex items-start gap-3 group shadow-sm"
              >
                {item.num && (
                  <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform mt-0.5 font-mono">
                    {item.num}
                  </span>
                )}
                <div className="flex-1 space-y-1 text-xs sm:text-sm text-slate-200 leading-relaxed font-normal whitespace-pre-wrap break-words">
                  {item.content}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Embedded Drive Links Card Notice */}
      {links.length > 0 && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-cyan-500/30 space-y-2">
          <p className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
            <span>📥</span>
            <span>অ্যাসাইনমেন্ট সম্পর্কিত সংযুক্ত ড্রাইভ / ফাইল লিঙ্ক:</span>
          </p>
          <div className="space-y-1.5">
            {links.map((link, lIdx) => (
              <a
                key={lIdx}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-200 hover:underline font-mono break-all flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800"
              >
                <span className="shrink-0">🔗</span>
                <span className="truncate">{link}</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-sans shrink-0 ml-auto">
                  Open ↗
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
