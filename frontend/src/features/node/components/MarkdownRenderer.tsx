import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import { useThemeStore } from '@/store'

// Markdown Renderer with syntax highlighting
export function MarkdownRenderer({ content }: { content: string }) {
  const { resolvedTheme } = useThemeStore()
  const isDark = resolvedTheme === 'dark'
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node: _node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const isInline = !match && !className

          if (isInline) {
            return (
              <code
                className="px-1.5 py-0.5 bg-ios-gray-200/80 dark:bg-ios-gray-800/80 text-ios-blue rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            )
          }

          return match ? (
            <div className="my-4 rounded-xl overflow-hidden border border-ios-blue/20">
              <div className="px-4 py-2 bg-ios-gray-100/80 dark:bg-ios-gray-900/80 border-b border-ios-blue/20 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-ios-gray-500 ml-2">{match[1]}</span>
              </div>
              <SyntaxHighlighter
                style={isDark ? oneDark : oneLight}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  background: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(249, 250, 251, 0.95)',
                  padding: '1rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.7',
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          )
        },
        // 自定义链接样式
        a({ node: _node, href, children, ...props }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ios-blue hover:text-cyan-400 underline underline-offset-2 transition-colors"
              {...props}
            >
              {children}
            </a>
          )
        },
        // 自定义表格样式
        table({ node: _node, children, ...props }) {
          return (
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-ios-blue/20" {...props}>
                {children}
              </table>
            </div>
          )
        },
        thead({ node: _node, children, ...props }) {
          return (
            <thead className="bg-ios-gray-200/50 dark:bg-ios-gray-800/50" {...props}>
              {children}
            </thead>
          )
        },
        th({ node: _node, children, ...props }) {
          return (
            <th className="px-4 py-3 text-left text-xs font-medium text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider" {...props}>
              {children}
            </th>
          )
        },
        td({ node: _node, children, ...props }) {
          return (
            <td className="px-4 py-3 text-sm text-ios-gray-600 dark:text-ios-gray-300" {...props}>
              {children}
            </td>
          )
        },
        // 自定义列表样式
        ul({ node: _node, children, ...props }) {
          return (
            <ul className="my-3 ml-4 list-disc list-outside space-y-1" {...props}>
              {children}
            </ul>
          )
        },
        ol({ node: _node, children, ...props }) {
          return (
            <ol className="my-3 ml-4 list-decimal list-outside space-y-1" {...props}>
              {children}
            </ol>
          )
        },
        li({ node: _node, children, ...props }) {
          return (
            <li className="text-ios-gray-600 dark:text-ios-gray-300" {...props}>
              {children}
            </li>
          )
        },
        // 自定义引用块样式
        blockquote({ node: _node, children, ...props }) {
          return (
            <blockquote className="my-4 pl-4 border-l-4 border-ios-blue/40 italic text-ios-gray-500 dark:text-ios-gray-400" {...props}>
              {children}
            </blockquote>
          )
        },
        // 自定义标题样式
        h1({ node: _node, children, ...props }) {
          return (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4 pb-2 border-b border-ios-blue/20" {...props}>
              {children}
            </h1>
          )
        },
        h2({ node: _node, children, ...props }) {
          return (
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3" {...props}>
              {children}
            </h2>
          )
        },
        h3({ node: _node, children, ...props }) {
          return (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-5 mb-2" {...props}>
              {children}
            </h3>
          )
        },
        p({ node: _node, children, ...props }) {
          return (
            <p className="my-3 text-ios-gray-600 dark:text-ios-gray-300 leading-relaxed" {...props}>
              {children}
            </p>
          )
        },
        hr({ node: _node, ...props }) {
          return (
            <hr className="my-6 border-ios-blue/20" {...props} />
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
