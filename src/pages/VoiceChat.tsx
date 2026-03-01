import { useState, useRef, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

export default function VoiceChat() {
  const [messages, setMessages] = useState<{role: string, text: string}[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const recognitionRef = useRef<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function getNewsContext() {
    const { data } = await supabase
      .from('processed_news')
      .select('title, narrative_media, hidden_intent, real_facts, impact_rodrigo, score_rodrigo')
      .order('processed_at', { ascending: false })
      .limit(10)
    
    if (!data || data.length === 0) return 'Nenhuma noticia disponivel.'
    
    return data.map((n, i) => 
      `[${i+1}] ${n.title}\n` +
      `Narrativa: ${n.narrative_media || '-'}\n` +
      `Intencao: ${n.hidden_intent || '-'}\n` +
      `Impacto Rodrigo: ${n.impact_rodrigo || '-'}\n` +
      `Score: ${n.score_rodrigo || 0}/100`
    ).join('\n\n')
  }

  async function sendMessage(text: string) {
    if (!text.trim()) return
    setLoading(true)
    
    const userMsg = { role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    try {
      const context = await getNewsContext()
      
      const prompt = `Voce e a True Press AI - analista de inteligencia de noticias pessoal do Rodrigo Borin, engenheiro aeroespacial e empreendedor.

NOTICIAS RECENTES (ultimas 10 analisadas):
${context}

INSTRUCAO: Responda de forma direta e objetiva. Maximo 3 paragrafos. 
Foque no impacto para Trading, Agronegocio, Imoveis e IA - as 4 areas do Rodrigo.
Nao use bullet points na resposta falada.

PERGUNTA DO RODRIGO: ${text}`

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
      const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
          })
        })
      
      const data = await response.json()
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.'
      
      const aiMsg = { role: 'ai', text: reply }
      setMessages(prev => [...prev, aiMsg])
      
      speakText(reply)
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Erro ao conectar com Gemini.' }])
    }
    
    setLoading(false)
  }

  function speakText(text: string) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pt-BR'
    utterance.rate = 1.1
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  function startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { alert('Navegador nao suporta reconhecimento de voz.'); return }
    
    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = false
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      sendMessage(transcript)
    }
    
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <div className="p-4 border-b border-gray-800 flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
        <h1 className="text-lg font-bold">True Press AI</h1>
        <span className="text-xs text-gray-400 ml-auto">Gemini 2.0 Flash</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-2xl mb-2">Mic</p>
            <p>Pergunte sobre as noticias de hoje</p>
            <p className="text-xs mt-1">Texto ou voz</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-100'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}></div>
      </div>

      <div className="p-4 border-t border-gray-800">
        {speaking && (
          <div className="flex items-center justify-between mb-2 text-xs text-green-400">
            <span>Falando...</span>
            <button onClick={stopSpeaking} className="text-gray-400 hover:text-white">Parar</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder="Digite ou use o microfone..."
            className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => listening ? stopListening() : startListening()}
            className={`px-4 rounded-xl font-bold text-lg transition-all ${
              listening 
                ? 'bg-red-600 animate-pulse' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {listening ? 'Stop' : 'Mic'}
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-bold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
