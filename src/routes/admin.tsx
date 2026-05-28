import { createFileRoute } from '@tanstack/react-router'
import AdminScreen from '../ui/screens/AdminScreen'

export const Route = createFileRoute('/admin')({
  component: AdminScreen,
})
