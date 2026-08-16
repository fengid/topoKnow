import axios from 'axios'

// AI 生成（文章/练习题/批量）耗时较长，超时设置 5 分钟
const client = axios.create({
  baseURL: '/api',
  timeout: 300_000,
  headers: { 'Content-Type': 'application/json' },
})

export default client
