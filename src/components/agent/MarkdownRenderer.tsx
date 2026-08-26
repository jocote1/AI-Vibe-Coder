import React, { useState } from 'react';
import { Check, Copy, Code } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split content by code blocks ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  let blockIdx = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      elements.push(
        <div key={`text-${blockIdx}-${lastIndex}`} className="space-y-2">
          {renderFormattedText(textBefore)}
        </div>
      );
    }

    const language = match[1] || 'plaintext';
    const code = match[2].trim();

    elements.push(
      <CodeBlock key={`code-${blockIdx}`} language={language} code={code} />
    );

    lastIndex = match.index + match[0].length;
    blockIdx++;
  }

  // Remaining text after last code block
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex);
    elements.push(
      <div key={`text-tail-${lastIndex}`} className="space-y-2">
        {renderFormattedText(textAfter)}
      </div>
    );
  }

  return <div className="space-y-3 text-xs leading-relaxed font-sans">{elements}</div>;
};

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border/80 bg-background/90 overflow-hidden my-2.5 shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/80 border-b border-border/60 text-[11px] font-mono">
        <span className="text-neon-cyan font-semibold uppercase flex items-center gap-1.5">
          <Code className="w-3.5 h-3.5" />
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-card text-gray-300 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-neon-green" />
              <span className="text-[10px] text-neon-green">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 text-[11px] font-mono text-gray-200 overflow-x-auto whitespace-pre leading-relaxed">
        {code}
      </pre>
    </div>
  );
};

function renderFormattedText(rawText: string): React.ReactNode[] {
  const lines = rawText.split('\n');
  const rendered: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      rendered.push(
        <h4 key={i} className="text-xs font-bold text-neon-cyan mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith('## ')) {
      rendered.push(
        <h3 key={i} className="text-sm font-bold text-white mt-3.5 mb-1.5 border-b border-border/40 pb-1">
          {renderInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      rendered.push(
        <h2 key={i} className="text-base font-extrabold text-white mt-4 mb-2">
          {renderInline(line.slice(2))}
        </h2>
      );
    }
    // Blockquotes
    else if (line.startsWith('> ')) {
      rendered.push(
        <blockquote key={i} className="border-l-2 border-primary pl-3 py-0.5 my-1.5 text-gray-300 bg-primary/5 rounded-r">
          {renderInline(line.slice(2))}
        </blockquote>
      );
    }
    // Unordered list items
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      rendered.push(
        <div key={i} className="flex items-start gap-2 pl-2 my-0.5">
          <span className="text-neon-cyan font-bold leading-5">•</span>
          <span className="flex-1">{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    // Numbered list items (e.g. "1. ")
    else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        rendered.push(
          <div key={i} className="flex items-start gap-2 pl-2 my-0.5">
            <span className="text-neon-purple font-mono font-bold leading-5">{match[1]}.</span>
            <span className="flex-1">{renderInline(match[2])}</span>
          </div>
        );
      }
    }
    // Regular paragraphs / empty lines
    else if (line.trim() === '') {
      rendered.push(<div key={i} className="h-1.5" />);
    } else {
      rendered.push(
        <p key={i} className="my-1">
          {renderInline(line)}
        </p>
      );
    }
  }

  return rendered;
}

function renderInline(text: string): React.ReactNode[] {
  // Regex to parse inline code (`...`), bold (**...**), italics (*...*), and links ([...](...))
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Check for inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Check for bold
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    // Check for link
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    // Find the earliest match
    let earliestType: 'code' | 'bold' | 'link' | null = null;
    let earliestIndex = remaining.length;
    let matchObj: RegExpMatchArray | null = null;

    if (codeMatch && codeMatch.index !== undefined && codeMatch.index < earliestIndex) {
      earliestType = 'code';
      earliestIndex = codeMatch.index;
      matchObj = codeMatch;
    }
    if (boldMatch && boldMatch.index !== undefined && boldMatch.index < earliestIndex) {
      earliestType = 'bold';
      earliestIndex = boldMatch.index;
      matchObj = boldMatch;
    }
    if (linkMatch && linkMatch.index !== undefined && linkMatch.index < earliestIndex) {
      earliestType = 'link';
      earliestIndex = linkMatch.index;
      matchObj = linkMatch;
    }

    if (!earliestType || !matchObj) {
      parts.push(remaining);
      break;
    }

    // Push text before match
    if (earliestIndex > 0) {
      parts.push(remaining.substring(0, earliestIndex));
    }

    // Push matched element
    if (earliestType === 'code') {
      parts.push(
        <code
          key={`inline-code-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded bg-secondary text-neon-cyan font-mono text-[11px] border border-border/80"
        >
          {matchObj[1]}
        </code>
      );
    } else if (earliestType === 'bold') {
      parts.push(
        <strong key={`inline-bold-${keyIdx++}`} className="font-bold text-white">
          {matchObj[1]}
        </strong>
      );
    } else if (earliestType === 'link') {
      parts.push(
        <a
          key={`inline-link-${keyIdx++}`}
          href={matchObj[2]}
          target="_blank"
          rel="noreferrer"
          className="text-neon-cyan hover:underline font-medium"
        >
          {matchObj[1]}
        </a>
      );
    }

    remaining = remaining.substring(earliestIndex + matchObj[0].length);
  }

  return parts;
}
