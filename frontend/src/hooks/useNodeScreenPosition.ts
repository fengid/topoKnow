import { useCallback } from 'react'
import type { ReactFlowInstance, Node } from 'reactflow'

interface NodeScreenPosition {
  x: number
  y: number
  width: number
  height: number
  centerX: number
  centerY: number
}

/**
 * 获取 React Flow 节点在屏幕上的位置坐标
 * 使用 React Flow 的内置方法转换坐标
 */
export function useNodeScreenPosition(reactFlowInstance: ReactFlowInstance | null) {
  const getNodeScreenPosition = useCallback((nodeId: string): NodeScreenPosition | null => {
    if (!reactFlowInstance) return null

    // 获取所有节点
    const nodes = reactFlowInstance.getNodes()
    const node = nodes.find((n: Node) => n.id === nodeId)
    if (!node) return null

    // 使用 React Flow 的 project 方法将内部坐标转换为屏幕坐标
    // 先获取节点的相对位置
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`)

    if (nodeElement) {
      // 如果能找到 DOM 元素，直接使用 getBoundingClientRect
      const rect = nodeElement.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        centerX: rect.x + rect.width / 2,
        centerY: rect.y + rect.height / 2,
      }
    }

    // 备选方案：使用 React Flow 的屏幕坐标转换
    // 获取视口变换信息
    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement
    if (!viewportElement) return null

    const style = window.getComputedStyle(viewportElement)
    const transform = style.transform

    // 提取 scale
    const matrix = new DOMMatrix(transform)
    const scale = matrix.a // scaleX
    const translateX = matrix.e
    const translateY = matrix.f

    // 计算节点在屏幕上的位置
    // React Flow 节点默认大小
    const nodeWidth = 170
    const nodeHeight = 80

    const screenX = node.position.x * scale + translateX
    const screenY = node.position.y * scale + translateY

    return {
      x: screenX,
      y: screenY,
      width: nodeWidth * scale,
      height: nodeHeight * scale,
      centerX: screenX + (nodeWidth * scale) / 2,
      centerY: screenY + (nodeHeight * scale) / 2,
    }
  }, [reactFlowInstance])

  // 使用 requestAnimationFrame 确保在渲染后获取准确位置
  const getNodeScreenPositionAsync = useCallback(async (nodeId: string): Promise<NodeScreenPosition | null> => {
    return new Promise((resolve) => {
      // 延迟获取，确保 DOM 已渲染
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const position = getNodeScreenPosition(nodeId)
          resolve(position)
        })
      })
    })
  }, [getNodeScreenPosition])

  return {
    getNodeScreenPosition,
    getNodeScreenPositionAsync,
  }
}
