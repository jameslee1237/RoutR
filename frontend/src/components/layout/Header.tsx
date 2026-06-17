'use client'

interface HeaderProps {
  title: string
  actions?: React.ReactNode
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
      style={{
        background: 'rgba(248,250,252,0.85)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(226,232,240,0.8)',
      }}
    >
      <h1
        className="text-lg font-semibold text-slate-900"
        style={{ letterSpacing: '-0.02em' }}
      >
        {title}
      </h1>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
