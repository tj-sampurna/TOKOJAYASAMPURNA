/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, ArrowLeft, Shield, CheckCheck, Smile, Star } from 'lucide-react';
import { ChatSession, Product } from '../types';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onSendMessage: (sessionId: string, text: string) => void;
}

export default function ChatDrawer({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onSendMessage,
}: ChatDrawerProps) {
  const [typedMessage, setTypedMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Auto scroll to chat bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, activeSessionId]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeSessionId) return;

    onSendMessage(activeSessionId, typedMessage.trim());
    setTypedMessage('');
  };

  const sendQuickChip = (text: string) => {
    if (!activeSessionId) return;
    onSendMessage(activeSessionId, text);
  };

  const getPriceFormatted = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const QUICK_CHIPS = [
    'Halo, apakah barang ini masih ada?',
    'Boleh dinego berapa gan?',
    'Bisa COD daerah mana?',
    'Kondisi fisiknya ada minus apa?',
    'Bisa dicheckout pke Safe-Trade sekarang?',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-full flex flex-row shadow-2xl overflow-hidden">
        
        {/* LEFT COLUMN: Conversation Lists (responsive width) */}
        <div className={`w-full md:w-80 h-full border-r border-gray-200 flex flex-col bg-gray-50 shrink-0 ${
          activeSessionId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 bg-olx-dark text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-olx-accent" />
              <span className="font-display font-bold text-lg">Diskusi Chat</span>
            </div>
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded bg-white/10 text-white text-xs font-semibold hover:bg-white/20"
            >
              Kembali
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 mt-10">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium">Belum ada chat aktif.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Kirim chat ke penjual dari halaman detail iklan barang bekas.
                </p>
              </div>
            ) : (
              sessions.map((session) => {
                const lastMsg = session.messages[session.messages.length - 1];
                const isSelected = session.id === activeSessionId;

                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`p-3.5 cursor-pointer flex items-center gap-3 transition ${
                      isSelected ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <img
                      src={session.product.images[0]}
                      alt={session.product.title}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-md shrink-0 border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 truncate">
                          {session.product.sellerName}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {session.product.location}
                        </span>
                      </div>
                      <h4 className="text-xs font-medium text-gray-800 truncate mb-1">
                        {session.product.title}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">
                        {lastMsg ? lastMsg.text : 'Memulai obrolan...'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Messages Viewer */}
        <div className={`flex-1 h-full flex flex-col bg-slate-50 ${
          !activeSessionId ? 'hidden md:flex justify-center items-center' : 'flex'
        }`}>
          {activeSession ? (
            <>
              {/* Product Info Bar & Header */}
              <div className="p-4 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onSelectSession('')}
                    className="md:hidden p-1.5 hover:bg-gray-100 rounded-full text-olx-dark"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <img
                    src={activeSession.product.images[0]}
                    alt={activeSession.product.title}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 object-cover rounded-md border"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-olx-dark leading-none">
                        {activeSession.product.sellerName}
                      </h3>
                      {activeSession.product.isVerified && (
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      )}
                    </div>
                    <p className="text-xs text-emerald-700 font-bold mt-1">
                      {getPriceFormatted(activeSession.product.price)}
                    </p>
                  </div>
                </div>

                {/* Secure Escrow Alert tag */}
                <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium border border-emerald-100">
                  <Shield className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                  <span>Safe-Trade Rekber Aktif</span>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Safe trading tips badge */}
                <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 border border-amber-200 flex items-start gap-2 max-w-md mx-auto">
                  <span>💡</span>
                  <div>
                    <p className="font-bold">Tips Transaksi Aman:</p>
                    <p className="mt-0.5">
                      Gunakan sistem <b>Checkout Pengiriman</b> PasarBekas jika mengirim ke luar kota. Jika berjanji ketemuan (COD), ketemulah di tempat umum yang ramai seperti pusat perbelanjaan.
                    </p>
                  </div>
                </div>

                {activeSession.messages.map((msg) => {
                  const isMe = msg.sender === 'buyer';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          isMe
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70">
                          <span>{msg.timestamp}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Reply Chips */}
              <div className="p-2.5 bg-gray-50 border-t border-gray-100 overflow-x-auto flex gap-2 shrink-0">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendQuickChip(chip)}
                    className="bg-white hover:bg-emerald-50 hover:text-emerald-700 text-xs text-gray-600 px-3 py-1.5 rounded-full border border-gray-200 shrink-0 whitespace-nowrap transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Send Form Toolbar */}
              <form
                onSubmit={handleSend}
                className="p-3 bg-white border-t border-gray-200 flex gap-2 shrink-0"
              >
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    placeholder="Tulis pesan negosiasi Anda di sini..."
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-300 rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-olx-dark"
                  />
                  <Smile className="absolute right-3.5 text-gray-400 w-5 h-5 cursor-pointer hover:text-gray-600" />
                </div>
                <button
                  type="submit"
                  disabled={!typedMessage.trim()}
                  className="bg-emerald-600 text-white rounded-full p-2.5 hover:bg-emerald-700 transition disabled:opacity-40 disabled:hover:bg-emerald-600 shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="p-8 text-center text-gray-400 max-w-sm mx-auto flex flex-col justify-center h-full">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300 stroke-1" />
              <h3 className="font-display font-medium text-gray-600 text-base">Silakan pilih chat</h3>
              <p className="text-xs text-gray-400 mt-1">
                Pilih percakapan dari kolom sebelah kiri untuk berdiskusi dengan penjual barang bekas dan menawar harga.
              </p>
              <button
                onClick={() => onSelectSession('')}
                className="md:hidden mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Lihat Daftar Percakapan
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
