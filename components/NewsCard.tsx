
import React, { useState, useEffect } from 'react';
import { NewsAnalysis } from '../types';
import { AlertTriangle, Clock, Volume2, StopCircle, Settings, Maximize2 } from 'lucide-react';

interface NewsCardProps {
  item: NewsAnalysis;
  onClick: () => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item, onClick }) => {
  const [speaking, setSpeaking] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [rate, setRate] = useState(1.1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const loadVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
        const ptVoices = available.filter(v => v.lang.includes('pt'));
        const female = ptVoices.find(v => v.name.includes('Google') || v.name.includes('Maria') || v.name.includes('Luciana'));
        setSelectedVoice(female || ptVoices[0] || available[0]);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const isCritical = (item.relevanceScore || 0) > 80;
  const relevanceColor = isCritical ? 'border-l-red-500' : 'border-l-slate-300';
  
  // Format Date & Time
  const dateObj = new Date(item.dateAdded);
  const formattedDate = dateObj.toLocaleDateString('pt-BR');
  const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleSpeak = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      if (speaking) {
          window.speechSynthesis.cancel();
          setSpeaking(false);
      } else {
          const text = `${item.title}. A mídia diz: ${item.narrative}. A verdade é: ${item.truth}. Impacto para Rodrigo: ${item.personalImpact}`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'pt-BR';
          utterance.rate = rate;
          if (selectedVoice) utterance.voice = selectedVoice;
          utterance.onend = () => setSpeaking(false);
          window.speechSynthesis.speak(utterance);
          setSpeaking(true);
      }
  };

  const toggleSettings = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowAudioSettings(!showAudioSettings);
  };

  return (
    <div 
        className={`rounded-xl border border-slate-200 border-l-4 shadow-sm bg-white overflow-hidden transition-all duration-200 hover:shadow-lg hover:translate-y-[-2px] cursor-pointer group ${relevanceColor}`}
        onClick={onClick}
    >
      <div className="p-5 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              {item.category || 'Geral'}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                <Clock size={10} /> {item.timeframe || 'Recente'}
            </span>
            {isCritical && (
              <span className="text-[10px] font-bold flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded animate-pulse">
                <AlertTriangle size={10} /> CRÍTICO
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-mono">
                {formattedDate} <span className="text-slate-300">|</span> {formattedTime}
            </span>
          </div>

          {/* Title & Controls */}
          <div className="flex justify-between items-start gap-4 relative">
            <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
                {item.title}
            </h3>
            
            <div className="flex gap-1 shrink-0 z-10">
                <button 
                    onClick={toggleSettings}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition"
                    title="Configurar Voz"
                >
                    <Settings size={16} />
                </button>
                <button 
                    onClick={handleSpeak}
                    className={`p-2 rounded-full hover:bg-slate-100 transition ${speaking ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-blue-500'}`}
                    title={speaking ? "Parar" : "Ouvir Resumo"}
                >
                    {speaking ? <StopCircle size={20} className="animate-pulse" /> : <Volume2 size={20} />}
                </button>
            </div>

            {showAudioSettings && (
                <div 
                    className="absolute right-0 top-10 bg-white border border-slate-200 shadow-xl rounded-lg p-3 z-20 w-48" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="text-xs font-bold text-slate-500 mb-2">Velocidade: {rate}x</div>
                    <input 
                        type="range" min="0.5" max="2" step="0.1" 
                        value={rate}
                        onChange={(e) => setRate(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded mb-3 appearance-none accent-blue-600 cursor-pointer"
                    />
                </div>
            )}
          </div>
          
          <p className="text-sm text-slate-500 mt-2 line-clamp-2">{item.narrative || "Toque para ver a análise completa."}</p>
          
          <div className="flex items-center gap-1 mt-3 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
               <Maximize2 size={12} /> Clique para expandir dossiê
          </div>
        </div>

        {/* Score Column */}
        <div className="flex items-center justify-between md:flex-col md:justify-center min-w-[80px] border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
            <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Rodrigo</span>
                <div className={`text-xl font-black ${isCritical ? 'text-red-600' : 'text-slate-700'}`}>{item.relevanceScore || 0}%</div>
            </div>
            <div className="flex flex-col items-center mt-2 md:mt-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Brasil</span>
                <div className="text-sm font-bold text-slate-500">{item.nationalRelevance || 0}%</div>
            </div>
        </div>
      </div>
    </div>
  );
};
