import type { ReactNode } from 'react'

export function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-ink-dim">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export function CardRow({ children }: { children: ReactNode }) {
  return <div className="row-scroll flex gap-2 overflow-x-auto pb-2">{children}</div>
}
