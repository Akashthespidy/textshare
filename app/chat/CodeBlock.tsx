'use client'

import { useState, useMemo } from 'react'
import Prism from 'prismjs'

// Import common Prism language definitions
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-yaml'

interface Props {
  code: string
  language?: string
  customFilename?: string
}

function getFileMeta(rawLang?: string, customName?: string) {
  if (customName) return { filename: customName, label: (rawLang || 'CODE').toUpperCase(), icon: '📄' }

  const l = (rawLang || '').toLowerCase().trim()
  switch (l) {
    case 'js':
    case 'javascript':
      return { filename: 'index.js', label: 'JavaScript', icon: '🟨' }
    case 'ts':
    case 'typescript':
      return { filename: 'main.ts', label: 'TypeScript', icon: '🔷' }
    case 'tsx':
      return { filename: 'Component.tsx', label: 'TSX', icon: '⚛️' }
    case 'jsx':
      return { filename: 'Component.jsx', label: 'JSX', icon: '⚛️' }
    case 'py':
    case 'python':
      return { filename: 'main.py', label: 'Python', icon: '🐍' }
    case 'html':
      return { filename: 'index.html', label: 'HTML', icon: '🌐' }
    case 'css':
      return { filename: 'styles.css', label: 'CSS', icon: '🎨' }
    case 'json':
      return { filename: 'data.json', label: 'JSON', icon: '📋' }
    case 'sh':
    case 'bash':
    case 'shell':
    case 'zsh':
      return { filename: 'script.sh', label: 'Bash', icon: '💻' }
    case 'sql':
      return { filename: 'query.sql', label: 'SQL', icon: '🗄️' }
    case 'cpp':
    case 'c++':
      return { filename: 'main.cpp', label: 'C++', icon: '⚙️' }
    case 'c':
      return { filename: 'main.c', label: 'C', icon: '⚙️' }
    case 'cs':
    case 'csharp':
      return { filename: 'Program.cs', label: 'C#', icon: '🟣' }
    case 'java':
      return { filename: 'Main.java', label: 'Java', icon: '☕' }
    case 'go':
    case 'golang':
      return { filename: 'main.go', label: 'Go', icon: '🔵' }
    case 'rs':
    case 'rust':
      return { filename: 'main.rs', label: 'Rust', icon: '🦀' }
    case 'php':
      return { filename: 'index.php', label: 'PHP', icon: '🐘' }
    case 'yaml':
    case 'yml':
      return { filename: 'config.yaml', label: 'YAML', icon: '⚙️' }
    default:
      return { filename: 'code.txt', label: l ? l.toUpperCase() : 'CODE', icon: '📄' }
  }
}

export default function CodeBlock({ code, language = '', customFilename }: Props) {
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const meta = getFileMeta(language, customFilename)

  const lines = useMemo(() => {
    const raw = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const rawLines = raw.split('\n')

    // Find language definition or fallback
    const langKey = language.toLowerCase().trim()
    const grammar =
      Prism.languages[langKey] ||
      (langKey === 'js' ? Prism.languages.javascript : null) ||
      (langKey === 'ts' ? Prism.languages.typescript : null) ||
      (langKey === 'py' ? Prism.languages.python : null) ||
      (langKey === 'sh' ? Prism.languages.bash : null) ||
      (langKey === 'yml' ? Prism.languages.yaml : null) ||
      Prism.languages.javascript ||
      Prism.languages.clike

    // Highlight entire code then split into lines to maintain multiline tokens
    try {
      const highlighted = Prism.highlight(raw, grammar, langKey || 'javascript')
      return highlighted.split('\n')
    } catch {
      // Fallback to unhighlighted lines if Prism fails
      return rawLines.map((l) =>
        l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      )
    }
  }, [code, language])

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-[#333333] shadow-2xl bg-[#1e1e1e] text-[#d4d4d4] font-mono text-left w-full select-text">
      {/* ── VS Code Title Bar ── */}
      <div className="bg-[#252526] px-3.5 py-2 flex items-center justify-between border-b border-[#333333] select-none">
        {/* Left: Window dots & File tab */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mac window controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block shadow-sm" />
          </div>

          {/* Active file tab */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e1e1e] rounded-t-md text-xs font-medium text-[#cccccc] border-t-2 border-indigo-500 shadow-inner truncate">
            <span className="text-xs">{meta.icon}</span>
            <span className="truncate">{meta.filename}</span>
          </div>
        </div>

        {/* Right: Language tag, line count & Copy button */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="hidden sm:inline-block text-[10px] text-[#858585] bg-[#2d2d2d] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
            {meta.label}
          </span>
          <span className="hidden md:inline-block text-[10px] text-[#6e7681]">
            {lines.length} lines
          </span>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-sans font-medium transition-all ${
              copied
                ? 'bg-green-700/80 text-white'
                : 'bg-[#333333] hover:bg-[#444444] text-[#cccccc] hover:text-white'
            }`}
            title="Copy full code"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[11px]">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── VS Code Editor Body (with line numbers) ── */}
      <div className={`py-2.5 overflow-x-auto text-xs sm:text-sm leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700 ${
        isExpanded ? 'max-h-none overflow-y-visible' : 'max-h-[500px] overflow-y-auto'
      }`}>
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((lineHtml, i) => (
              <tr key={i} className="hover:bg-[#282828] transition-colors group">
                {/* Line number */}
                <td className="w-10 sm:w-12 pr-3 pl-3 text-right text-[#6e7681] text-[11px] sm:text-xs select-none align-top font-mono group-hover:text-[#999999]">
                  {i + 1}
                </td>
                {/* Code content */}
                <td className="pr-4 whitespace-pre font-mono text-[#d4d4d4] align-top select-text">
                  <span dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expand/Collapse Footer for large files */}
      {lines.length > 25 && (
        <div className="bg-[#252526] px-3.5 py-1.5 flex items-center justify-between border-t border-[#333333] select-none text-[11px]">
          <span className="text-[#858585]">
            {isExpanded ? `Showing all ${lines.length} lines` : `Showing first lines (${lines.length} total lines)`}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-indigo-400 hover:text-indigo-300 font-sans font-medium flex items-center gap-1 transition-colors"
          >
            {isExpanded ? '▲ Collapse' : `▼ Expand full code (${lines.length} lines)`}
          </button>
        </div>
      )}
    </div>
  )
}
