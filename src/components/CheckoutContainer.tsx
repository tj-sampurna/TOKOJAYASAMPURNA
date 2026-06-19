/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, ShieldCheck, MapPin, Truck, HelpCircle, ArrowRight, Printer, Building, User, Phone, CheckCircle, CreditCard } from 'lucide-react';
import { Product, Order, ShippingAddress, MeetingPoint } from '../types';

interface CheckoutContainerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteOrder: (order: Order) => void;
}

type CheckoutStep = 'delivery-select' | 'details' | 'payment' | 'completed';

interface Courier {
  id: string;
  name: string;
  time: string;
  price: number;
}

const COURIERS: Courier[] = [
  { id: 'sicepat', name: 'SiCepat Reguler', time: '1-2 Hari', price: 9500 },
  { id: 'jne', name: 'JNE Oke/Reg', time: '2-3 Hari', price: 12000 },
  { id: 'jnt', name: 'J&T Express Super', time: '1-2 Hari', price: 14000 },
  { id: 'gosend', name: 'GoSend Sameday', time: '6 Jam (Sameday)', price: 23000 },
];

export default function CheckoutContainer({
  product,
  isOpen,
  onClose,
  onCompleteOrder,
}: CheckoutContainerProps) {
  const [step, setStep] = useState<CheckoutStep>('delivery-select');
  const [deliveryType, setDeliveryType] = useState<'cod' | 'delivery'>('delivery');

  // Input states for Courier & Shipping Address
  const [name, setName] = useState('Dedé Suherman');
  const [phone, setPhone] = useState('081234567890');
  const [address, setAddress] = useState('Jl. Jenderal Sudirman No. 42, RT 03/RW 04');
  const [city, setCity] = useState('Jakarta Selatan');
  const [postalCode, setPostalCode] = useState('12190');
  const [selectedCourier, setSelectedCourier] = useState<Courier>(COURIERS[0]);
  const [paymentMethod, setPaymentMethod] = useState('qris');

  // Input states for COD
  const [placeName, setPlaceName] = useState('Lobby Utama Mall Ambassador');
  const [dateTime, setDateTime] = useState('2026-05-25T14:00');
  const [meetingNotes, setMeetingNotes] = useState('Ketemuan dekat gerai Starbucks lantai dasar om agar ramai.');

  // Completed final order cache
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  if (!isOpen || !product) return null;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const shippingCost = deliveryType === 'delivery' ? selectedCourier.price : 0;
  const adminFee = deliveryType === 'delivery' ? 5000 : 0; // Escrow admin fee
  const totalPrice = product.price + shippingCost + adminFee;

  const handleNextStep = () => {
    if (step === 'delivery-select') {
      setStep('details');
    } else if (step === 'details') {
      if (deliveryType === 'cod') {
        // Direct COD completed (doesn't need banking screen)
        completeTheOrder();
      } else {
        setStep('payment');
      }
    } else if (step === 'payment') {
      completeTheOrder();
    }
  };

  const completeTheOrder = () => {
    const generatedResi = deliveryType === 'delivery' 
      ? `PB-${selectedCourier.id.toUpperCase()}-${Math.floor(100000000 + Math.random() * 900000000)}`
      : undefined;

    const newOrder: Order = {
      id: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
      product,
      deliveryType,
      shippingAddress: deliveryType === 'delivery' ? { name, phone, address, city, postalCode } : undefined,
      courier: deliveryType === 'delivery' ? selectedCourier.name : undefined,
      shippingCost: deliveryType === 'delivery' ? selectedCourier.price : undefined,
      paymentMethod: deliveryType === 'delivery' ? paymentMethod.toUpperCase() : 'Cash On Delivery',
      meetingPoint: deliveryType === 'cod' ? { placeName, dateTime, notes: meetingNotes } : undefined,
      totalPrice,
      orderDate: new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }),
      status: deliveryType === 'delivery' ? 'shipped' : 'cod_confirmed', // shipped simulation
      resi: generatedResi,
    };

    setCompletedOrder(newOrder);
    onCompleteOrder(newOrder);
    setStep('completed');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header containing progress tracks */}
        <div className="bg-olx-dark text-white p-5 shrink-0 border-b relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1 hover:bg-white/10 rounded-full transition text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="font-display font-bold text-lg text-white">Proses Checkout Barang Bekas</h3>
          <p className="text-xs text-olx-accent mt-0.5">Langkah penyelesaian transaksi aman PasarBekas</p>

          {/* Checkout Steps Tracker Indicator */}
          {step !== 'completed' && (
            <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-gray-300">
              <span className={`px-2 py-0.5 rounded-sm ${step === 'delivery-select' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-400'}`}>1. Metode</span>
              <span className="opacity-40">&gt;&gt;</span>
              <span className={`px-2 py-0.5 rounded-sm ${step === 'details' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-400'}`}>2. Detail</span>
              <span className="opacity-40">&gt;&gt;</span>
              {deliveryType === 'delivery' && (
                <>
                  <span className={`px-2 py-0.5 rounded-sm ${step === 'payment' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-400'}`}>3. Pembayaran</span>
                  <span className="opacity-40">&gt;&gt;</span>
                </>
              )}
              <span className="opacity-30">4. Kuitansi</span>
            </div>
          )}
        </div>

        {/* Dynamic container body scroll */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">

          {/* STEP 1: DELIVERY SELECT */}
          {step === 'delivery-select' && (
            <div className="space-y-6">
              <h2 className="font-display font-bold text-base text-olx-dark text-center">Pilih Cara Bertransaksi Dengan Penjual</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* SAFE SHIPPING */}
                <div
                  onClick={() => setDeliveryType('delivery')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    deliveryType === 'delivery'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-4 ring-emerald-500/10'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">
                        REKOMENDASI + REKBER
                      </span>
                      <Truck className={`w-5 h-5 ${deliveryType === 'delivery' ? 'text-emerald-700' : 'text-gray-400'}`} />
                    </div>
                    <h3 className="font-bold text-sm text-olx-dark mt-3">Kirim & Rekber Aman</h3>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                      Layanan safe-escrow resmi. Barang dikirim kurir, dana ditahan sbg jaminan keamanan. Sangat direkomendasikan untuk transaksi lintas kota agar terhindar dari penipuan gembong palsu.
                    </p>
                  </div>
                  <div className="border-t border-gray-100 pt-3 mt-4 text-xs font-bold text-emerald-800 flex items-center justify-between">
                    <span>Garansi Refund 100%</span>
                    <span>✓ Proteksi Penuh</span>
                  </div>
                </div>

                {/* DIRECT COD */}
                <div
                  onClick={() => setDeliveryType('cod')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    deliveryType === 'cod'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-4 ring-emerald-500/10'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">
                        GRATIS / TANPA FEE
                      </span>
                      <Building className={`w-5 h-5 ${deliveryType === 'cod' ? 'text-emerald-700' : 'text-gray-400'}`} />
                    </div>
                    <h3 className="font-bold text-sm text-olx-dark mt-3">COD (Ketemuan Langsung)</h3>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                      Lakukan janjian pertemuan langsung (Cash on Delivery) dengan penjual. Cek kondisi kecocokan barang di tempat secara saksama, lalu transaksikan secara tunai.
                    </p>
                  </div>
                  <div className="border-t border-gray-100 pt-3 mt-4 text-xs font-bold text-amber-800 flex items-center justify-between">
                    <span>Tanpa Ongkos Kirim</span>
                    <span>📍 Kota yang Sama</span>
                  </div>
                </div>

              </div>

              {/* Secure Escrow tips label */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-xs text-emerald-800 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Keamanan Anda Prioritas Kami:</p>
                  <p className="mt-0.5 leading-relaxed">
                    Sistem Safe-Trade kami menjaga transaksi Anda agar terbebas dari mafia penipuan barang palsu. Seluruh transaksi pengiriman dipantau live 24 jam.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: ADDRESS OR COD MEETING SCHEDULER */}
          {step === 'details' && (
            <div className="space-y-6">
              {deliveryType === 'delivery' ? (
                // Safe delivery form
                <div className="space-y-4">
                  <h3 className="font-display font-bold text-sm text-olx-dark flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Alamat Lengkap Pengiriman
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Nama Penerima *</label>
                      <div className="relative flex items-center">
                        <User className="absolute left-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">No. WhatsApp / HP *</label>
                      <div className="relative flex items-center">
                        <Phone className="absolute left-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Alamat Jalan Lengkap & RT/RW *</label>
                    <textarea
                      required
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Kota *</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Kode Pos *</label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Courier Selection List */}
                  <hr className="border-gray-100 my-4" />
                  <h3 className="font-display font-bold text-sm text-olx-dark flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    Pilih Ekspedisi Kargo Pengiriman
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    {COURIERS.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCourier(c)}
                        className={`p-3 rounded-lg border cursor-pointer transition text-left flex justify-between items-center ${
                          selectedCourier.id === c.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                            : 'border-gray-200 bg-white text-gray-700'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold leading-none">{c.name}</p>
                          <p className="text-[10px] text-gray-500 mt-1">Estimasi: {c.time}</p>
                        </div>
                        <span className="text-xs font-mono font-bold">{formatRupiah(c.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // COD Flow Meeting Scheduler
                <div className="space-y-4 text-left">
                  <h3 className="font-display font-bold text-sm text-olx-dark">📍 Jadwal Kerja Pertemuan COD</h3>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Nama Tempat Tempat Bertemu *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Starbucks Coffee, lantai dasar Bandung Indah Plaza"
                      value={placeName}
                      onChange={(e) => setPlaceName(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Tanggal & Jam Pertemuan *</label>
                      <input
                        type="datetime-local"
                        required
                        value={dateTime}
                        onChange={(e) => setDateTime(e.target.value)}
                        className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Konfirmasi HP Penerima *</label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Catatan Tambahan Pertemuan</label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Saya pakai baju jaket ijo ya mas nanti dkt tangga eskalator."
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 border border-amber-200 leading-relaxed font-medium">
                    ⚠️ <b>Peringatan Keamanan COD:</b> Pilih selalu lokasi pertemuan di tempat ramai di siang hari. Jangan bertransaksi di tempat terpencil atau menyetujui transfer uang dp/booking fee sebelum memegang langsung fisik barangnya.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SELECT SECURE PAYMENT (DELIVERY ONLY) */}
          {step === 'payment' && (
            <div className="space-y-6">
              <h2 className="font-display font-bold text-base text-olx-dark text-center">Metode Pembayaran Rekber Aman</h2>
              
              <div className="space-y-3">
                
                {/* QRIS */}
                <label className="flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition select-none bg-white hover:bg-slate-50 border-gray-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'qris'}
                      onChange={() => setPaymentMethod('qris')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-sm text-gray-800">QRIS (Gopay, OVO, ShopeePay, Dana)</span>
                      <p className="text-[10px] text-gray-500">Konfirmasi deposit terverifikasi instan tanpa slip manual</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">Instan ✓</span>
                </label>

                {/* Bank Virtual Accounts */}
                <label className="flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition select-none bg-white hover:bg-slate-50 border-gray-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'va-bca'}
                      onChange={() => setPaymentMethod('va-bca')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-sm text-gray-800">BCA Virtual Account (VA)</span>
                      <p className="text-[10px] text-gray-500">Bayar lewat m-BCA atau ATM bank BCA terdekat</p>
                    </div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition select-none bg-white hover:bg-slate-50 border-gray-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'va-mandiri'}
                      onChange={() => setPaymentMethod('va-mandiri')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-sm text-gray-800">Mandiri Virtual Account (VA)</span>
                      <p className="text-[10px] text-gray-500">Bayar lewat mandiri online / Livin atau ATM</p>
                    </div>
                  </div>
                </label>

              </div>

              {/* QR Code Payment Visualization */}
              {paymentMethod === 'qris' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-dashed flex flex-col items-center gap-3">
                  <p className="text-xs font-bold text-gray-600">Scan QR Code Di Bawah</p>
                  <div className="w-44 h-44 bg-white border p-2 flex items-center justify-center rounded shadow-xs relative">
                    <img
                      src="https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&w=200&q=80"
                      alt="QR Code"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded"
                    />
                    <div className="absolute bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded -top-1">
                      PasarBekas SafePay
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">Kode Bayar: QRIS-TRX-{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: COMPLETED INVOICE & ORDER SUMMARY */}
          {step === 'completed' && completedOrder && (
            <div id="invoice-receipt-print" className="p-4 border rounded-2xl bg-white space-y-4 shadow-sm relative overflow-hidden">
              
              {/* Background certification diagonal watermark */}
              <div className="absolute top-2.5 -right-6 bg-emerald-600 text-white font-extrabold uppercase py-1 px-8 rotate-[25deg] text-[9px] shadow-sm">
                Safe Trade LUNAS
              </div>

              {/* Title brand logo block */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                <div>
                  <h2 className="font-display font-black text-emerald-700 text-lg">Kuitansi Pembelian Resmi</h2>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID RESMI TRANS: {completedOrder.id}</p>
                </div>
                <div className="text-right">
                  <span className="font-sans font-black text-xs text-olx-dark uppercase bg-gray-100 px-2 py-1 rounded">
                    {deliveryType === 'cod' ? 'DIJAMIN COD ✓' : 'REKBER AMAN ✓'}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">{completedOrder.orderDate}</p>
                </div>
              </div>

              {/* Product and item specification grid banner */}
              <div className="p-3 bg-slate-50 rounded-lg flex gap-3 items-center border">
                <img
                  src={completedOrder.product.images[0]}
                  alt={completedOrder.product.title}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 object-cover rounded-md border shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-gray-800 truncate">{completedOrder.product.title}</h4>
                  <p className="text-[10px] text-emerald-700 font-bold">Harga: {formatRupiah(completedOrder.product.price)}</p>
                </div>
              </div>

              {/* Delivery / COD Specific summary fields */}
              {completedOrder.deliveryType === 'delivery' ? (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <h5 className="font-bold text-gray-700 uppercase mb-1">Penerima & Alamat</h5>
                    <p className="font-bold text-olx-dark">{completedOrder.shippingAddress?.name}</p>
                    <p className="text-gray-500">{completedOrder.shippingAddress?.phone}</p>
                    <p className="text-gray-500 text-[11px] leading-relaxed mt-1">
                      {completedOrder.shippingAddress?.address}, {completedOrder.shippingAddress?.city}, {completedOrder.shippingAddress?.postalCode}
                    </p>
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-700 uppercase mb-1">Kurir & Resi Lacak</h5>
                    <p className="font-bold text-emerald-800">{completedOrder.courier}</p>
                    <p className="text-[10px] bg-slate-100 p-1 rounded font-mono font-bold text-gray-800 border mt-1 select-all" title="Klik untuk salin">
                      No. Resi: {completedOrder.resi}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">Metode: {completedOrder.paymentMethod}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <h5 className="font-bold text-gray-700 uppercase mb-1">Titik Ketemuan COD</h5>
                    <p className="font-bold text-emerald-800">📍 {completedOrder.meetingPoint?.placeName}</p>
                    <p className="font-medium text-gray-600 mt-1">Kontak Anda: {completedOrder.shippingAddress?.phone || completedOrder.product.sellerPhone}</p>
                    <p className="text-gray-500 mt-1 font-medium italic">
                      " {completedOrder.meetingPoint?.notes} "
                    </p>
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-700 uppercase mb-1">Jadwal Waktu Janjian</h5>
                    <p className="font-mono text-emerald-700 font-bold bg-slate-50 p-2 border rounded">
                      {completedOrder.meetingPoint?.dateTime ? new Date(completedOrder.meetingPoint.dateTime).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }) : ''}
                    </p>
                    <p className="text-[10px] text-amber-800 font-medium mt-1.5 leading-normal">
                      🛡️ Pastikan untuk mengetes seluruh fungsi barang (baterai, keaslian, wifi, imei) terlebih dahulu sebelum menyerahkan uang pembayaran ke tangan penjual.
                    </p>
                  </div>
                </div>
              )}

              {/* Checkout pricing sum totals */}
              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Harga Barang Bekas</span>
                  <span className="font-mono font-bold">{formatRupiah(completedOrder.product.price)}</span>
                </div>
                {deliveryType === 'delivery' && (
                  <>
                    <div className="flex justify-between">
                      <span>Ongkir Kurir ({selectedCourier.name})</span>
                      <span className="font-mono font-bold">{formatRupiah(completedOrder.shippingCost || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jasa Proteksi Rekber Safe-Trade</span>
                      <span className="font-mono font-bold">{formatRupiah(5000)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-sm font-black text-olx-dark">
                  <span>Total Transaksi</span>
                  <span className="font-mono text-emerald-700 text-base">{formatRupiah(completedOrder.totalPrice)}</span>
                </div>
              </div>

              {/* Call-to-action details */}
              <div className="bg-emerald-50 text-emerald-900 border border-emerald-100 p-3 rounded-xl text-xs space-y-1 leading-relaxed">
                <p className="font-bold">✓ Transaksi Terdaftar Sukses!</p>
                <p className="text-emerald-800">
                  {deliveryType === 'delivery'
                    ? 'Dana Anda telah dicatat lunas ke sistem escrow kami. Penjual akan langsung mendapatkan notifikasi pengiriman pesanan Anda.'
                    : 'Detail COD telah didaftarkan ke sistem. Anda dapat membagikan resi ini ke penjual sebagai bukti serius janjian COD.'}
                </p>
              </div>

              {/* Invoice print shortcut tool */}
              <div className="flex gap-2 justify-center shrink-0">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1 bg-white hover:bg-slate-50 text-gray-700 text-xs px-4 py-2 rounded-lg border shadow-xs cursor-pointer transition"
                >
                  <Printer className="w-4 h-4" />
                  Print / Unduh PDF Invoice
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Action button drawer footer */}
        {step !== 'completed' && (
          <div className="p-5 bg-gray-50 border-t flex justify-between items-center shrink-0">
            {/* Left pricing visual indicator */}
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-gray-500 leading-none">Total Pelunasan</span>
              <p className="font-display font-black text-lg text-emerald-700 leading-tight">
                {formatRupiah(totalPrice)}
              </p>
            </div>

            {/* Step trigger button */}
            <div className="flex gap-2">
              {step !== 'delivery-select' && (
                <button
                  onClick={() => {
                    if (step === 'details') setStep('delivery-select');
                    if (step === 'payment') setStep('details');
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded bg-white hover:bg-gray-100 text-gray-700 border transition"
                >
                  Kembali
                </button>
              )}
              <button
                onClick={handleNextStep}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition flex items-center gap-1"
              >
                <span>
                  {step === 'delivery-select' || step === 'details' && deliveryType === 'delivery' 
                    ? 'Lanjutkan Langkah' 
                    : 'Konfirmasi Bayar / Selesai'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
