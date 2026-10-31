import { AskAiView } from '@/views/shared/ask-ai-view'

export const metadata = { title: 'Hỏi AI | UniLake AI' }

export default function AskAiPage() {
  return <AskAiView historyHref="/viewer/history" />
}
