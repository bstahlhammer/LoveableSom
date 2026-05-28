import { createFileRoute } from '@tanstack/react-router'
import BirdIconsPreview from '../ui/icons/BirdIconsPreview'

export const Route = createFileRoute('/birds')({
  component: BirdIconsPreview,
})
