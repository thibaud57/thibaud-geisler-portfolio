import { PageShell } from '@/components/layout/PageShell'
import { StackedSkeleton } from '@/components/ui/stacked-skeleton'

export default function CaseStudyLoading() {
  return (
    <PageShell>
      <StackedSkeleton heights={['h-48', 'h-96', 'h-32']} />
    </PageShell>
  )
}
