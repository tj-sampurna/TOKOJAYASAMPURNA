/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Shield, Sparkles, User, BadgeAlert, Laptop, ArrowRight, HelpCircle } from 'lucide-react';

interface ChatSupportMessage {
  id: string;
  sender: 'user' | 'bot' | 'admin';
  text: string;
  timestamp: string;
}

interface QuestionOption {
  id: string;
  question: string;
  answer: string;
}

export default function CustomerServiceBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [messages, setMessages] = useState<ChatSupportMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnectedToAdmin, setIsConnectedToAdmin] = useState(false);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Bot default question options
  const QUESTION_OPTIONS: QuestionOption[] = [
    {
      id: 'garansi',
      question: '📦 Ketentuan Garansi & Refund',
      answer: 'Setiap transaksi melalui tombol "Beli Sekarang" dilindungi jaminan uang kembali 100% jika barang tidak sampai atau berbeda dari deskripsi. Garansi barang bekas umumnya berlaku 2x24 jam sejak paket diterima untuk uji kecocokan barang.'
    },
    {
      id: 'keamanan',
      question: '🛡️ Keamanan Escrow / Safe-Trade',
      answer: 'Dana Anda dijamin 100% aman di rekening penampung resmi. Dana hanya akan diteruskan ke dompet pelapak setelah Anda menyetujui bahwa barang yang dikirimkan telah sesuai dan berkualitas.'
    },
    {
      id: 'cara_checkout',
      question: '🛒 Cara Checkout & Pembayaran',
      answer: 'Sangat mudah! Pilih produk di beranda, buka halaman detailnya, lalu klik tombol "Beli Sekarang". Anda bisa mengisi detail alamat pengiriman, memilih ekspedisi/kurir, dan membayar melalui payment gateway nasional.'
    },
    {
      id: 'estimasi',
      question: '🚚 Estimasi Pengiriman Kurir',
      answer: 'Untuk pengiriman antarkota di Indonesia umumnya menggunakan layanan reguler yang memakan waktu 2 s.d 4 hari kerja. Anda juga bisa memantau nomor resi paket tersebut langsung dari menu "Transaksi Saya".'
    },
    {
      id: 'kendala',
      question: '⚠️ Barang Rusak / Tidak Sesuai',
      answer: 'Jangan khawatir! Selama Anda belum mengonfirmasi pelepasan dana, Anda dapat segera menekan tombol komplain agar dana escrow ditangguhkan sementara. Tim support kami akan memandu mediasi retur barang atau refund.'
    }
  ];

  // Initialize chat history from localStorage or set default welcome messages
  useEffect(() => {
    const saved = localStorage.getItem('tjs_support_chat');
    const savedAdminState = localStorage.getItem('tjs_support_admin_state');
    
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (err) {
        setInitialMessages();
      }
    } else {
      setInitialMessages();
    }

    if (savedAdminState === 'true') {
      setIsConnectedToAdmin(true);
    }

    // Hide tooltip after 8 seconds
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  const setInitialMessages = () => {
    const timeStr = getFormattedTime();
    const welcomeMsgs: ChatSupportMessage[] = [
      {
        id: 'welcome-1',
        sender: 'bot',
        text: 'Halo! Selamat datang di Layanan Pelanggan Toko Jaya Sampurna. Saya adalah Chatbot Bantuan Otomatis. Ada yang bisa saya bantu hari ini?',
        timestamp: timeStr
      },
      {
        id: 'welcome-2',
        sender: 'bot',
        text: 'Sebelum saya hubungkan langsung ke Admin Support, silakan pilih beberapa pertanyaan umum di bawah untuk respon instan cepat:',
        timestamp: timeStr
      }
    ];
    setMessages(welcomeMsgs);
    localStorage.setItem('tjs_support_chat', JSON.stringify(welcomeMsgs));
  };

  const getFormattedTime = () => {
    const d = new Date();
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // Sync to localStorage
  const saveChatMessages = (updated: ChatSupportMessage[]) => {
    setMessages(updated);
    localStorage.setItem('tjs_support_chat', JSON.stringify(updated));
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isAdminTyping]);

  const handleSelectQuestion = (option: QuestionOption) => {
    const timeStr = getFormattedTime();
    
    // Add User Message
    const userMsg: ChatSupportMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: option.question,
      timestamp: timeStr
    };

    // Add Bot Answer message with a small realistic delay
    const botMsg: ChatSupportMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: option.answer,
      timestamp: timeStr
    };

    const next = [...messages, userMsg, botMsg];
    saveChatMessages(next);
  };

  const handleConnectToAdmin = () => {
    const timeStr = getFormattedTime();
    
    // Add user message
    const userMsg: ChatSupportMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: 'Hubungkan saya dengan Admin (Technical Specialist / Support)',
      timestamp: timeStr
    };

    // Add bot system message
    const botSystemMsg: ChatSupportMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: 'Baik, mohon tunggu sebentar... Saya sedang mengalihkan percakapan ini ke Administrator / Technical Specialist Toko Jaya Sampurna. Hubungan dengan asisten otomatis selesai.',
      timestamp: timeStr
    };

    // Simulated Admin welcome response
    const nextText = [...messages, userMsg, botSystemMsg];
    saveChatMessages(nextText);
    setIsConnectedToAdmin(true);
    localStorage.setItem('tjs_support_admin_state', 'true');

    // Trigger Admin typing indicator after 2 seconds
    setIsAdminTyping(true);
    setTimeout(() => {
      setIsAdminTyping(false);
      const adminWelcome: ChatSupportMessage = {
        id: `admin-${Date.now()}`,
        sender: 'admin',
        text: 'Halo! Saya adalah tim Support Technical Specialist Toko Jaya Sampurna Indonesia. Kami siap membantu Anda. Silakan deskripsikan kendala teknis, pembayaran, atau pertanyaan transaksi Anda di sini.',
        timestamp: getFormattedTime()
      };
      saveChatMessages([...nextText, adminWelcome]);
    }, 2500);
  };

  // Handle custom user submission input
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const textInput = inputValue.trim();
    setInputValue('');
    const timeStr = getFormattedTime();

    const userMsg: ChatSupportMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textInput,
      timestamp: timeStr
    };

    const updatedWithUser = [...messages, userMsg];
    saveChatMessages(updatedWithUser);

    if (!isConnectedToAdmin) {
      // If still using the automated bot, it advises to use options or connect to admin
      setTimeout(() => {
        const botReply: ChatSupportMessage = {
          id: `bot-${Date.now() + 1}`,
          sender: 'bot',
          text: 'Maaf, saya adalah program asisten otomatis pintar beresolusi cepat. Untuk berbicara dengan manusia, silakan klik tombol mendatar "Hubungkan Saya ke Admin Toko" di daftar menu kami.',
          timestamp: getFormattedTime()
        };
        saveChatMessages([...updatedWithUser, botReply]);
      }, 1000);
    } else {
      // Auto reply from Admin Support based on simple contextual tags
      setIsAdminTyping(true);
      
      setTimeout(() => {
        setIsAdminTyping(false);
        const lower = textInput.toLowerCase();
        let replyText = '';

        if (lower.includes('halo') || lower.includes('siang') || lower.includes('pagi') || lower.includes('sore') || lower.includes('test')) {
          replyText = 'Halo juga! Senang mendengarnya. Ada kendala transaksi, resi pengiriman, atau kendala verifikasi yang bisa kami bantu luruskan hari ini?';
        } else if (lower.includes('midtrans') || lower.includes('bayar') || lower.includes('payment') || lower.includes('dana') || lower.includes('rekening') || lower.includes('escrow')) {
          replyText = 'Terkait pembayaran, seluruh transaksi di platform menggunakan payment gateway resmi serta rekening escrow yang aman. Saldo Anda ditahan dengan aman hingga Anda mengonfirmasi barang diterima dan dicoba.';
        } else if (lower.includes('resi') || lower.includes('kirim') || lower.includes('ongkir') || lower.includes('paket') || lower.includes('ekspedisi')) {
          replyText = 'Untuk resi paket pengiriman cargo/ekspedisi, akan otomatis diterbitkan di halaman panel "Transaksi Saya" Anda setelah pelapak mengklik tombol kirim dan menyetor resi. Kami siap memediasi apabila ada kendala kurir tersendat.';
        } else if (lower.includes('batal') || lower.includes('refund') || lower.includes('retur') || lower.includes('kembali')) {
          replyText = 'Pembatalan transaksi dan pengembalian uang (refund) dapat dimediasi penuh oleh tim kami selama Anda belum mengklik tombol rilis dana. Sila lampirkan nomor order transaksi Anda agar langsung direview oleh tim keuangan kami.';
        } else {
          replyText = 'Terima kasih atas laporan Anda. Pertanyaan Anda ("' + textInput + '") telah diterima oleh tim dispatch support@tokojayasampurna. Tim ahli kami akan memeriksa log backend sistem dan memberikan respons komprehensif sesegera mungkin.';
        }

        const adminReplyMsg: ChatSupportMessage = {
          id: `admin-reply-${Date.now()}`,
          sender: 'admin',
          text: replyText,
          timestamp: getFormattedTime()
        };
        saveChatMessages([...updatedWithUser, adminReplyMsg]);
      }, 1800);
    }
  };

  const handleResetChat = () => {
    localStorage.removeItem('tjs_support_chat');
    localStorage.removeItem('tjs_support_admin_state');
    setIsConnectedToAdmin(false);
    setInitialMessages();
  };

  return (
    <div id="live-chat-widget" className="fixed bottom-6 right-6 z-50 font-sans">
      
      {/* Visual Pulsating Tooltip Notification */}
      {showTooltip && !isOpen && (
        <div className="absolute bottom-16 right-0 bg-slate-900 border border-slate-700 text-white p-3 rounded-2xl shadow-2xl grow text-xs w-64 mr-2 animate-fade-in flex flex-col gap-1.5 leading-relaxed">
          <div className="flex justify-between items-center">
            <span className="font-extrabold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#23e5db]" />
              Ada Kendala/Pertanyaan?
            </span>
            <button onClick={() => setShowTooltip(false)} className="text-gray-400 hover:text-white p-0.5 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-gray-300">Hubungi Chatbot Bantuan & Live CS Toko Jaya Sampurna melalui tombol di bawah ini!</p>
        </div>
      )}

      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setShowTooltip(false);
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full p-4 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-emerald-400 flex items-center justify-center gap-2 cursor-pointer group relative overflow-hidden"
          title="Buka Chat Layanan Pelanggan"
        >
          {/* Breathing pulse rings */}
          <span className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping pointer-events-none scale-100"></span>
          
          <MessageSquare className="w-6 h-6 stroke-2" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-28 transition-all duration-500 ease-out font-black text-xs uppercase tracking-widest block whitespace-nowrap">
            Support CS
          </span>
          {/* Status Indicator inside floating button */}
          <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 border border-white rounded-full ring-2 ring-emerald-500 animate-pulse"></span>
        </button>
      )}

      {/* Main Chat Assistant Expanded Popover Window */}
      {isOpen && (
        <div className="bg-white w-[360px] sm:w-[390px] h-[550px] rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-scale-up">
          
          {/* Popover Header */}
          <div className="p-4 bg-slate-900 text-white border-b border-slate-800 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                  <Laptop className="w-6 h-6 text-emerald-400 animate-pulse" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
              </div>
              
              <div>
                <h4 className="font-display font-extrabold text-sm tracking-tight text-white leading-none">
                  Layanan Bantuan CS
                </h4>
                <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                  {isConnectedToAdmin ? '⚡ Connected to Support Specialist' : '🤖 Bot Penjawab Otomatis Aktif'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleResetChat}
                title="Selesaikan & Reset Percakapan"
                className="text-xs font-mono font-bold text-gray-400 hover:text-red-400 px-2 py-1 rounded bg-slate-800 border border-slate-700/50 transition whitespace-nowrap"
              >
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 px-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Secure Escrow Protection Banner */}
          <div className="px-4 py-2 bg-emerald-50 text-emerald-800 text-[10px] font-bold border-b border-emerald-100/50 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0 animate-bounce" />
            <span>Rekening Bersama Escrow Aktif & Terverifikasi Aman</span>
          </div>

          {/* Main Feed Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isAdmin = msg.sender === 'admin';
              
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                    isUser 
                      ? 'bg-emerald-600 text-white rounded-tr-none font-medium'
                      : isAdmin 
                        ? 'bg-slate-900 text-gray-100 rounded-tl-none border border-slate-850'
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                  }`}>
                    {/* Header Label inside chat message */}
                    {!isUser && (
                      <span className={`block text-[9px] font-mono font-black uppercase mb-1 ${
                        isAdmin ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        {isAdmin ? '👤 CS Specialist' : '🤖 Auto Response Bot'}
                      </span>
                    )}
                    
                    <p>{msg.text}</p>
                    
                    <span className="block text-right text-[9px] opacity-70 mt-1 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Admin typing simulation */}
            {isAdminTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-900 text-gray-100 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-xs border border-slate-800 text-xs text-left">
                  <span className="block text-[9px] font-mono font-black uppercase text-emerald-400 mb-1">
                    👤 CS Specialist
                  </span>
                  <div className="flex items-center gap-1 py-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-200"></span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-300"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Preset Questions Selector Section (Displayed only before connection to admin) */}
          {!isConnectedToAdmin && (
            <div className="p-3 bg-white border-t border-gray-100 max-h-44 overflow-y-auto shrink-0 space-y-1.5 text-left">
              <span className="block text-[10px] font-extrabold uppercase text-gray-400 pl-1 tracking-wider">
                Silakan Pilih Pertanyaan Anda:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {QUESTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectQuestion(opt)}
                    className="w-full text-left font-semibold text-slate-800 hover:text-emerald-800 hover:bg-emerald-50 border border-gray-200/70 hover:border-emerald-200 p-2 rounded-xl text-xs transition duration-150 flex justify-between items-center group cursor-pointer"
                  >
                    <span>{opt.question}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 transition" />
                  </button>
                ))}
                
                {/* Connect directly to personal admin panel */}
                <button
                  type="button"
                  onClick={handleConnectToAdmin}
                  className="w-full text-center bg-gray-900 hover:bg-emerald-700 text-white font-extrabold p-2.5 rounded-xl text-xs uppercase transition tracking-wider flex items-center justify-center gap-1.5 mt-2 cursor-pointer hover:shadow-md animate-pulse hover:animate-none"
                >
                  <User className="w-3.5 h-3.5" />
                  Hubungkan Saya Ke Admin Toko
                </button>
              </div>
            </div>
          )}

          {/* Interactive Chat Form Toolbar */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-gray-200 flex gap-2 shrink-0 items-center justify-between"
          >
            <input
              type="text"
              placeholder={isConnectedToAdmin ? "Ketik kendala Anda ke admin..." : "Tulis pesan ke bot asisten..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-slate-50 border border-gray-200 rounded-full px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-slate-900 text-white hover:bg-emerald-700 transition disabled:opacity-30 disabled:hover:bg-slate-900 shrink-0 p-2.5 rounded-full cursor-pointer flex items-center justify-center"
              title="Kirim pesan"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
