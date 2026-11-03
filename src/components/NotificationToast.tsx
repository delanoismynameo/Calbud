import { useState, useEffect, useCallback } from 'react'

interface ToastMessage {
  id: string
  title: string
  message: string
  icon?: string
  duration?: number
}

interface NotificationToastProps {
  messages: ToastMessage[]
  onRemove: (id: string) => void
}

export default function NotificationToast({ messages, onRemove }: NotificationToastProps) {
  if (messages.length === 0) return null

  return (
    <div className="fixed top-16 left-4 right-4 z-50 flex flex-col gap-2 max-w-md mx-auto">
      {messages.map((msg) => (
        <Toast key={msg.id} message={msg} onRemove={onRemove} />
      ))}
    </div>
  )
}

function Toast({ message, onRemove }: { message: ToastMessage; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onRemove(message.id)
    }, message.duration ?? 5000)

    return () => clearTimeout(timer)
  }, [message.duration, message.id, onRemove])

  if (!visible) return null

  return (
    <div className="animate-slide-up bg-card rounded-2xl shadow-lg p-4 flex items-center gap-3 backdrop-blur">
      {message.icon && (
        <img src={message.icon} alt={message.title} className="w-10 h-10 rounded-lg" />
      )}
      <div className="flex-1">
        <p className="font-bold text-ink">{message.title}</p>
        <p className="text-sm text-muted">{message.message}</p>
      </div>
      <button
        onClick={() => {
          setVisible(false)
          onRemove(message.id)
        }}
        className="text-muted hover:text-ink transition-colors"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  )
}