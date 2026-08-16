interface LoadingProps {
  label?: string
}

export default function Loading({ label = '加载中...' }: LoadingProps) {
  return (
    <div className="loading-center">
      <div className="spinner spinner--lg" />
      <span>{label}</span>
    </div>
  )
}
