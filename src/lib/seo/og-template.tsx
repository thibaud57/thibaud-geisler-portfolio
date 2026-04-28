import 'server-only'
import type { Locale } from 'next-intl'

const COLORS = {
  background: '#FFFFFF',
  foreground: '#0F0F0F',
  accent: '#5E7A5D',
  muted: '#737373',
} as const

type OgTemplateProps = {
  kind: 'site' | 'case-study'
  title: string
  subtitle: string
  locale: Locale
}

export function OgTemplate({ kind, title, subtitle, locale }: OgTemplateProps) {
  const kicker = kind === 'case-study' ? 'CASE STUDY' : 'PORTFOLIO'
  const localeLabel = locale.toUpperCase()
  const signature =
    kind === 'case-study'
      ? 'Thibaud Geisler · IA & dev full-stack'
      : 'thibaud-geisler.com'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLORS.background,
        padding: 80,
        fontFamily: 'Geist',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 6,
            height: 28,
            backgroundColor: COLORS.accent,
          }}
        />
        <span
          style={{
            color: COLORS.accent,
            fontSize: 20,
            fontWeight: 400,
            letterSpacing: '0.2em',
          }}
        >
          {kicker}
        </span>
        <span style={{ color: COLORS.muted, fontSize: 20 }}>·</span>
        <span
          style={{
            color: COLORS.muted,
            fontSize: 20,
            letterSpacing: '0.2em',
          }}
        >
          {localeLabel}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          marginTop: 60,
        }}
      >
        <div
          style={{
            color: COLORS.foreground,
            fontSize: 72,
            fontWeight: 700,
            fontFamily: 'Sansation',
            lineHeight: 1.1,
            display: 'flex',
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: COLORS.foreground,
            fontSize: 32,
            fontWeight: 400,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {subtitle}
        </div>
      </div>

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 200,
            height: 2,
            backgroundColor: COLORS.accent,
          }}
        />
        <span
          style={{
            color: COLORS.accent,
            fontSize: 24,
            fontWeight: 400,
          }}
        >
          {signature}
        </span>
      </div>
    </div>
  )
}
