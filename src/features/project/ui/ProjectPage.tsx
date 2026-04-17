import { useParams } from 'react-router-dom'

export function ProjectPage() {
  const { projectId = 'unknown' } = useParams()

  return (
    <section className="page-section">
      <span className="page-eyebrow">M1-A / Project</span>
      <h1>Project 路由骨架已预留</h1>
      <p>当前项目占位 ID：{projectId}</p>
    </section>
  )
}
