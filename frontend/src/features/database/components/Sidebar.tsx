import { motion } from 'framer-motion'
import type { TableName, TableConfig } from '../types/database'

interface SidebarProps {
  selectedTable: TableName
  onSelectTable: (table: TableName) => void
}

const tables: TableConfig[] = [
  { name: 'trees', label: 'Trees', icon: '🌳' },
  { name: 'nodes', label: 'Nodes', icon: '📦' },
  { name: 'questions', label: 'Questions', icon: '❓' },
  { name: 'articles', label: 'Articles', icon: '📄' },
  { name: 'prompts', label: 'Prompts', icon: '✨' },
]

export default function Sidebar({ selectedTable, onSelectTable }: SidebarProps) {
  return (
    <div className="w-64 h-full bg-[var(--home-card-bg)] border-r border-[var(--home-card-border)] backdrop-blur-sm">
      <div className="p-6">
        <nav className="space-y-2">
          {tables.map((table) => (
            <motion.button
              key={table.name}
              onClick={() => onSelectTable(table.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all font-outfit ${
                selectedTable === table.name
                  ? 'bg-gradient-to-r from-[var(--home-gold-text)]/20 to-[var(--home-gold-text)]/10 text-[var(--home-gold-text)] border-l-2 border-[var(--home-gold-text)]'
                  : 'text-[var(--home-text)] hover:bg-[var(--home-card-hover)]'
              }`}
              style={
                selectedTable === table.name
                  ? { boxShadow: '0 0 20px rgba(201,169,110,0.15)' }
                  : {}
              }
              whileHover={{ scale: 1.02, x: selectedTable === table.name ? 0 : 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-2xl">{table.icon}</span>
              <span className="font-medium">{table.label}</span>
            </motion.button>
          ))}
        </nav>
      </div>
    </div>
  )
}
