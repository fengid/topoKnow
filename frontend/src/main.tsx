import React from 'react'
import ReactDOM from 'react-dom/client'
import RootApp from './App'

// iOS 26 设计系统样式
import './styles/variables.css'
import './styles/components.css'
import './styles/reactflow.css'
import './styles/nodes.css'
import './styles/animations.css'

// Tailwind 基础样式（保留 index.css 中的 @tailwind 指令）
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
)
