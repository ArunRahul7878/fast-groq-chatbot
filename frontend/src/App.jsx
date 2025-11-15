import React, { useState, useEffect, useRef } from 'react'
import dayjs from 'dayjs'

function ChatBubble({ from, text, time }) {
  return (
    <div className={`flex ${from === 'me' ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] p-3 rounded-2xl ${from === 'me' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{text}</div>
        <div className="text-[10px] opacity-60 mt-2 text-right">{dayjs(time).format('HH:mm')}</div>
      </div>
    </div>
  )
}

export default function App() {
  const [messages, setMessages] = useState([
    { id: 1, from: 'bot', text: 'Hi — ask me anything. (Demo: rate-limited)', time: new Date().toISOString() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(e) {
    e?.preventDefault()
    if (!input.trim()) return
    const userMsg = { id: Date.now(), from: 'me', text: input, time: new Date().toISOString() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Request failed')
      const botMsg = { id: Date.now()+1, from: 'bot', text: data.text, time: new Date().toISOString() }
      setMessages(m => [...m, botMsg])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Unknown error')
      setMessages(m => [...m, { id: Date.now()+2, from: 'bot', text: 'Error: ' + (err.message || 'unknown'), time: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-2xl overflow-hidden">
        <header className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Fast Groq Chatbot</h1>
              <p className="text-xs opacity-70">Public demo — protected by rate limits</p>
            </div>
            <div className="text-xs opacity-60">Quota: 10 req / hour</div>
          </div>
        </header>

        <main ref={listRef} className="p-4 h-[60vh] overflow-y-auto">
          {messages.map(m => (
            <ChatBubble key={m.id} from={m.from} text={m.text} time={m.time} />
          ))}
        </main>

        <form onSubmit={sendMessage} className="p-4 border-t flex gap-3 items-center">
          <input value={input} onChange={e => setInput(e.target.value)} disabled={loading} className="flex-1 p-3 rounded-xl border focus:outline-none" placeholder="Type your question..." />
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-black text-white">{loading ? 'Waiting...' : 'Send'}</button>
        </form>
        {error && <div className="p-2 text-sm text-red-600">{error}</div>}
      </div>
    </div>
  )
}