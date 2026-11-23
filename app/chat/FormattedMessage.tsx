'use client'

import { useState } from 'react'
import CodeBlock from './CodeBlock'

interface Props {
  content: string
  isMe?: boolean
}

interface Segment {
  type: 'text' | 'code'
  content: string
  lang?: string
  filename?: string
}

// Regex to detect markdown code blocks: ```lang:filename ... ``` or ```lang ... ```
const CODE_BLOCK_REGEX = /```([a-zA-Z0-9_#+.-]+)?(?::([\w.-]+))?\r?\n([\s\S]*?)```/g

// Heuristic to detect if plain text is raw code (no backticks)
function isLikelyRawCode(text: string): { isCode: boolean; detectedLang: string } {
  const lines = text.trim().split('\n')
  if (lines.length < 3) return { isCode: false, detectedLang: '' }

  // Check common code patterns
  if (/^\s*(import\s+.+from|export\s+(?:default\s+)?|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|function\s+\w+\s*\(|console\.(log|error)\()/m.test(text)) {
    if (/\b(interface|type\s+\w+\s*=|:\s*(string|number|boolean|any)\b)/.test(text)) {
      return { isCode: true, detectedLang: 'typescript' }
    }
    return { isCode: true, detectedLang: 'javascript' }
  }

  if (/^\s*(def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import|if\s+__name__\s*==\s*['"]__main__['"]:)/m.test(text)) {
    return { isCode: true, detectedLang: 'python' }
  }

  if (/^\s*(SELECT\s+.+\s+FROM|INSERT\s+INTO|CREATE\s+TABLE|UPDATE\s+\w+\s+SET|DELETE\s+FROM)/im.test(text)) {
    return { isCode: true, detectedLang: 'sql' }
  }

  if (/^\s*(<!DOCTYPE\s+html|<html|<div|<head|<body)/im.test(text)) {
    return { isCode: true, detectedLang: 'html' }
  }

  if (/^\s*(#!\/bin\/(bash|sh)|curl\s+-|npm\s+(i|install|run)|pnpm\s+(add|dev|build)|git\s+(commit|push|pull|status))/m.test(text)) {
    return { isCode: true, detectedLang: 'bash' }
  }

  if (/^\s*(package\s+\w+|public\s+class\s+\w+|System\.out\.println)/m.test(text)) {
    return { isCode: true, detectedLang: 'java' }
  }

  if (/^\s*(#include\s+<|int\s+main\s*\(|std::cout)/m.test(text)) {
    return { isCode: true, detectedLang: 'cpp' }
  }

  if (/^\s*(\{|\}|\[|\])/.test(text) && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
    try {
      JSON.parse(text)
      return { isCode: true, detectedLang: 'json' }
    } catch {
      // not json
    }
  }

  return { isCode: false, detectedLang: '' }
}

export default function FormattedMessage({ content, isMe = false }: Props) {
  // Check if content contains markdown code blocks
  const hasMarkdownCode = /```[\s\S]*?```/.test(content)
  const rawCodeInfo = !hasMarkdownCode ? isLikelyRawCode(content) : { isCode: false, detectedLang: '' }

  // Toggle for raw auto-detected code
  const [viewAsCode, setViewAsCode] = useState(rawCodeInfo.isCode)

  // 1. If markdown code blocks exist, parse and render mixed content
  if (hasMarkdownCode) {
    const segments: Segment[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    const regex = new RegExp(CODE_BLOCK_REGEX)
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: content.substring(lastIndex, match.index),
        })
      }
      segments.push({
        type: 'code',
        lang: match[1] || '',
        filename: match[2],
        content: match[3],
      })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      segments.push({
        type: 'text',
        content: content.substring(lastIndex),
      })
    }

    return (
      <div className="space-y-1.5 w-full">
        {segments.map((seg, i) => {
          if (seg.type === 'code') {
            return (
              <CodeBlock
                key={i}
                code={seg.content}
                language={seg.lang}
                customFilename={seg.filename}
              />
            )
          }

          // Plain text segment
          if (!seg.content.trim()) return null
          return (
            <p key={i} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed select-text" dir="auto">
              {seg.content}
            </p>
          )
        })}
      </div>
    )
  }

  // 2. If raw code was detected (without backticks)
  if (rawCodeInfo.isCode) {
    return (
      <div className="w-full">
        {/* View toggle button */}
        <div className="flex items-center justify-between mb-1 text-[11px]">
          <span className="text-gray-400 font-mono italic">Detected Code</span>
          <button
            onClick={() => setViewAsCode(!viewAsCode)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              isMe
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {viewAsCode ? 'View as Text' : 'View in VS Code'}
          </button>
        </div>

        {viewAsCode ? (
          <CodeBlock code={content} language={rawCodeInfo.detectedLang} />
        ) : (
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed select-text" dir="auto">
            {content}
          </p>
        )}
      </div>
    )
  }

  // 3. Normal text (e.g. Bangla notes, 50,000 words, letters, etc.)
  return (
    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed select-text" dir="auto">
      {content}
    </p>
  )
}
