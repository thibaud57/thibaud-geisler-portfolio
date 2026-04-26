type Props = {
  text: string
}

const LABEL_MAX_LENGTH = 30

export function LabeledText({ text }: Props) {
  const idx = text.indexOf(':')
  if (idx <= 0 || idx > LABEL_MAX_LENGTH) return <span>{text}</span>
  const labelEnd = text[idx - 1] === ' ' ? idx - 1 : idx
  const label = text.slice(0, labelEnd)
  const sepAndRest = text.slice(labelEnd)
  return (
    <span>
      <strong className="font-semibold">{label}</strong>
      {sepAndRest}
    </span>
  )
}
