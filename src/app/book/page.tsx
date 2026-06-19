"use client";

import { useState, useEffect, Suspense } from "react";
import styles from "./page.module.css";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import BackToTop from "@/components/BackToTop";

// Mock Data for Services (Will be fetched from Supabase later)
const SERVICES = [
  { id: "xs", name: "XS - 30 minutes slot", desc: "Studio's minimum price. Small tattoo under 5cm. Simple linework / one word script. Black or red ink.", time: "30 min", durationMins: 30, basePrice: 80, imagePlaceholder: "/tattoo-work.png" },
  { id: "s", name: "S - 1 hour slot", desc: "Most flash pieces / 2 tiny tattoos (2 initials, one word one initial) / one small tattoo under 7cm / script with 2+ words / red or black ink.", time: "1 hr", durationMins: 60, basePrice: 130, imagePlaceholder: "/tattoo-work.png" },
  { id: "m", name: "M - 1,5 hour slot", desc: "Detailed designs under 10cm / 3 small simple tattoos / 1 simple one small detailed design", time: "1 hr 30 min", durationMins: 90, basePrice: 200, imagePlaceholder: "/tattoo-work.png" },
  { id: "l", name: "L - 3 hour session", desc: "10+ cm detailed design, 5 extra small tattoos, 3 small tattoos, 2 medium detailed designs", time: "3 hr", durationMins: 180, basePrice: 300, imagePlaceholder: "/tattoo-work.png" },
  { id: "xl", name: "XL - Half day session", desc: "5 hours of bottomless tattoo session - 6/8 small tattoos; 15+cm detailed pieces, 2 medium/large detailed pieces", time: "5 hr", durationMins: 300, basePrice: 450, imagePlaceholder: "/tattoo-work.png" },
  { id: "add", name: "Additional small tattoo", desc: "", time: "30 min", durationMins: 30, basePrice: 50, imagePlaceholder: null },
  { id: "touchup", name: "Touch up", desc: "", time: "30 min", durationMins: 30, basePrice: 0, imagePlaceholder: null },
];

const TIME_SLOTS = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", 
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", 
  "16:00", "16:30", "17:00", "17:30", "18:00"
];

// Helper function to calculate covered slots based on start time and duration
const getCoveredSlots = (startTime: string | null, durationMins: number) => {
  if (!startTime) return [];
  const startIndex = TIME_SLOTS.indexOf(startTime);
  if (startIndex === -1) return [];
  const slotsNeeded = Math.ceil(durationMins / 30);
  return TIME_SLOTS.slice(startIndex, startIndex + slotsNeeded);
};

function BookingForm() {
  const [bookingMode, setBookingMode] = useState<"direct" | "flash" | "custom" | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Flash State
  const [flashTattoos, setFlashTattoos] = useState<any[]>([]);
  const [selectedFlash, setSelectedFlash] = useState<any>(null);

  // Form State
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [depositAmount, setDepositAmount] = useState(50);

  const [clientDetails, setClientDetails] = useState({
    name: "",
    email: "",
    phone: "",
    idea: "",
  });
  
  const [referenceFiles, setReferenceFiles] = useState<FileList | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Calculate duration
  const currentServiceObj = SERVICES.find(s => s.id === selectedService);
  // For flash tattoos, assume a 1.5 hr session (90 mins) by default if not specified
  const durationMins = bookingMode === 'flash' ? 90 : (currentServiceObj?.durationMins || 30);
  const coveredTimeSlots = getCoveredSlots(selectedTime, durationMins);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) {
      setBookingMode("direct");
      setCurrentStep(3);
      setSubmitSuccess(true);
    } else if (query.get("canceled")) {
      setBookingMode("direct");
      setCurrentStep(3);
      setSubmitError("Payment was canceled. You can try again.");
    }

    const fetchInitialData = async () => {
      const { data: bData } = await supabase.from('blocked_slots').select('*');
      if (bData) setBlockedSlots(bData);

      const { data: sData } = await supabase.from('settings').select('*').eq('setting_key', 'deposit_amount_gbp').single();
      if (sData && sData.setting_value) {
        setDepositAmount(parseInt(sData.setting_value, 10) || 50);
      }

      // Fetch flash tattoos
      const { data: fData } = await supabase.from('portfolio').select('*').eq('is_flash', true);
      if (fData) setFlashTattoos(fData);
    };
    fetchInitialData();
  }, []);

  let STEPS = ["Service", "Date & Time", "Your Details", "Deposit"];
  if (bookingMode === 'flash') STEPS = ["Select Flash", "Date & Time", "Your Details", "Deposit"];
  if (bookingMode === 'custom') STEPS = ["Custom Request", "Done"];

  const handleNext = () => {
    if (bookingMode === 'flash' && currentStep === 0 && !selectedFlash) {
      setSubmitError("Please select a flash tattoo first.");
      return;
    }
    setSubmitError(null);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      setBookingMode(null); // Go back to mode selection
      setSelectedFlash(null);
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedTime(null);
    }
  };

  const handleCheckout = async () => {
    if ((bookingMode === 'direct' && !selectedService) || 
        (bookingMode === 'flash' && !selectedFlash) || 
        !selectedDate || !selectedTime || !clientDetails.name || !clientDetails.email) {
      setSubmitError("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let referenceUrls = "";
      if (referenceFiles && referenceFiles.length > 0) {
        const filesArray = Array.from(referenceFiles);
        const uploadedUrls = [];
        for (const file of filesArray) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('reference_images').upload(fileName, file);
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('reference_images').getPublicUrl(fileName);
            uploadedUrls.push(publicUrlData.publicUrl);
          }
        }
        referenceUrls = uploadedUrls.join(',');
      }

      // If flash, append the flash image URL to references
      if (bookingMode === 'flash' && selectedFlash?.image_url) {
        referenceUrls = referenceUrls ? `${referenceUrls},${selectedFlash.image_url}` : selectedFlash.image_url;
      }

      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}T${selectedTime}:00+01:00`;

      const appointmentId = crypto.randomUUID();
      const finalDesc = bookingMode === 'flash' ? `[FLASH TATTOO] ${selectedFlash.title}\n${clientDetails.idea}` : clientDetails.idea;

      const { error } = await supabase
        .from('appointments')
        .insert([{
          id: appointmentId,
          client_name: clientDetails.name,
          client_email: clientDetails.email,
          client_phone: clientDetails.phone,
          appointment_date: dateString,
          service_id: null,
          reference_image_url: referenceUrls,
          description: finalDesc,
          deposit_paid: false,
          deposit_amount: depositAmount,
          status: 'pending'
        }]);

      if (error) throw error;
      
      const serviceName = bookingMode === 'flash' 
        ? `Flash Tattoo: ${selectedFlash.title}` 
        : (currentServiceObj?.name || 'Tattoo Session');

      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointmentId,
          depositAmount: depositAmount,
          clientName: clientDetails.name,
          serviceName: serviceName,
        }),
      });

      if (!checkoutRes.ok) {
        const errorData = await checkoutRes.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await checkoutRes.json();
      window.location.href = url;
      
    } catch (err: any) {
      console.error("Error creating appointment:", err);
      setSubmitError(err.message || "Failed to save appointment or create payment session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientDetails.name || !clientDetails.email || !clientDetails.idea) {
      setSubmitError("Please fill out all required fields.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let referenceUrls = "";
      if (referenceFiles && referenceFiles.length > 0) {
        const filesArray = Array.from(referenceFiles);
        const uploadedUrls = [];
        for (const file of filesArray) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('reference_images').upload(fileName, file);
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('reference_images').getPublicUrl(fileName);
            uploadedUrls.push(publicUrlData.publicUrl);
          }
        }
        referenceUrls = uploadedUrls.join(',');
      }

      const { error } = await supabase
        .from('appointments')
        .insert([{
          client_name: clientDetails.name,
          client_email: clientDetails.email,
          client_phone: clientDetails.phone,
          description: `[CUSTOM DESIGN INQUIRY]\n${clientDetails.idea}`,
          reference_image_url: referenceUrls,
          status: 'pending',
          deposit_paid: false,
          deposit_amount: 0,
          appointment_date: new Date().toISOString()
        }]);

      if (error) throw error;
      
      setSubmitSuccess(true);
      setCurrentStep(1); // Move to "Done"
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar logic
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const daysArray = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handlePrevMonth = () => {
    const today = new Date();
    const newDate = new Date(year, month - 1, 1);
    if (newDate.getFullYear() > today.getFullYear() || (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() >= today.getMonth())) {
      setCurrentMonthDate(newDate);
    }
  };
  const handleNextMonth = () => {
    const today = new Date();
    const newDate = new Date(year, month + 1, 1);
    if (newDate <= new Date(today.getFullYear(), today.getMonth() + 2, 1)) {
      setCurrentMonthDate(newDate);
    }
  };
  const isDateBlocked = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return blockedSlots.some(slot => slot.date === dateStr && slot.is_whole_day);
  };
  const isTimeBlocked = (time: string) => {
    if (!selectedDate) return false;
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return blockedSlots.some(slot => slot.date === dateStr && slot.time === time);
  };

  return (
    <>
      <Navbar />
      <section className={styles.bookSection}>
        <div className="container">
          <div className={styles.bookHeader}>
            <h1 className={styles.bookTitle}>Book an Appointment</h1>
            <p className={styles.bookSubtitle}>
              Please select your preferred booking method below to start the process.
            </p>
          </div>

          <div className={styles.bookingContainer}>
            {/* MODE SELECTION (Step -1) */}
            {bookingMode === null && (
              <div className="animate-fade-in">
                <h2 className="text-xl text-[var(--color-text-main)] mb-2 font-semibold">How would you like to proceed?</h2>
                <div className={styles.modeSelectionGrid}>
                  
                  {/* Option A */}
                  <div className={styles.modeCard} onClick={() => { setBookingMode('direct'); setCurrentStep(0); }}>
                    <div className={styles.modeCardHeader}>
                      <span className={styles.modeIcon}>📅</span>
                      <div>
                        <h3 className={styles.modeTitle}>Direct Booking</h3>
                        <p className={styles.modeDesc}>I know what I want. Book a slot based on duration.</p>
                      </div>
                    </div>
                    <button className={styles.modeBtn}>Select</button>
                  </div>

                  {/* Option B */}
                  <div className={styles.modeCard} onClick={() => { setBookingMode('flash'); setCurrentStep(0); }}>
                    <div className={styles.modeCardHeader}>
                      <span className={styles.modeIcon}>⚡</span>
                      <div>
                        <h3 className={styles.modeTitle}>Flash Tattoos</h3>
                        <p className={styles.modeDesc}>Choose from available pre-drawn designs and book instantly.</p>
                      </div>
                    </div>
                    <button className={styles.modeBtn}>Browse Flash</button>
                  </div>

                  {/* Option C */}
                  <div className={styles.modeCard} onClick={() => { setBookingMode('custom'); setCurrentStep(0); }}>
                    <div className={styles.modeCardHeader}>
                      <span className={styles.modeIcon}>🎨</span>
                      <div>
                        <h3 className={styles.modeTitle}>Custom Design</h3>
                        <p className={styles.modeDesc}>I have a unique idea and want a personalized piece.</p>
                      </div>
                    </div>
                    <button className={styles.modeBtn}>Request Form</button>
                  </div>

                </div>
              </div>
            )}

            {/* PROGRESS INDICATOR */}
            {bookingMode !== null && bookingMode !== 'custom' && (
              <div className={styles.stepsIndicator}>
                {STEPS.map((step, idx) => (
                  <div key={idx} className={`${styles.step} ${idx === currentStep ? styles.active : ''} ${idx < currentStep ? styles.completed : ''}`}>
                    {idx + 1}. {step}
                  </div>
                ))}
              </div>
            )}

            {/* BACK BUTTON (Global) */}
            {bookingMode !== null && currentStep < STEPS.length - 1 && (
               <button className="text-[var(--color-primary)] hover:underline mb-6 flex items-center gap-2" onClick={handleBack}>
                 &larr; Back
               </button>
            )}

            {/* DIRECT BOOKING - STEP 0 */}
            {bookingMode === 'direct' && currentStep === 0 && (
              <div className="animate-fade-in">
                <h2 className="text-xl text-[var(--color-text-main)] mb-6 font-semibold">Select Service Duration</h2>
                <div className={styles.servicesGrid}>
                  {SERVICES.map((service) => (
                    <div 
                      key={service.id} 
                      className={`${styles.serviceOption} ${selectedService === service.id ? styles.selected : ''}`}
                      onClick={() => setSelectedService(service.id)}
                    >
                      {service.imagePlaceholder ? (
                        <div className={styles.optionImageWrapper}>
                          <Image src={service.imagePlaceholder} alt={service.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className={styles.optionImageWrapper}>
                          <span className={styles.optionImagePlaceholder}>No Image</span>
                        </div>
                      )}
                      <div className={styles.optionContent}>
                        <h3 className={styles.optionTitle}>{service.name}</h3>
                        {service.desc && <p className={styles.optionDesc}>{service.desc}</p>}
                        <div className={styles.optionMeta}>
                          <span className={styles.optionTime}>{service.time}</span>
                          <span className={styles.optionPrice}>£{service.basePrice}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FLASH BOOKING - STEP 0 */}
            {bookingMode === 'flash' && currentStep === 0 && (
              <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl text-[var(--color-text-main)] font-semibold">Available Flash Tattoos</h2>
                  <a href="https://wa.me/905000000000" target="_blank" rel="noopener noreferrer" className="text-sm text-[#25D366] hover:underline flex items-center gap-2">
                    📱 Consult via WhatsApp
                  </a>
                </div>
                {flashTattoos.length === 0 ? (
                  <div className="text-center py-10 text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-lg">
                    No flash tattoos currently available. Please check back later or request a custom design!
                  </div>
                ) : (
                  <div className={styles.flashGrid}>
                    {flashTattoos.map(flash => (
                      <div 
                        key={flash.id} 
                        className={`${styles.flashItem} ${selectedFlash?.id === flash.id ? styles.selected : ''}`}
                        onClick={() => setSelectedFlash(flash)}
                      >
                        <div className={styles.flashImageWrapper}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={flash.image_url} alt={flash.title} className={styles.flashImage} />
                        </div>
                        <div className={styles.flashInfo}>
                          <p className={styles.flashTitle}>{flash.title || "Untitled"}</p>
                          {flash.price_gbp && <p className={styles.flashPrice}>£{flash.price_gbp}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {submitError && <div className={styles.errorMsg}>{submitError}</div>}
              </div>
            )}

            {/* STEP 1: CALENDAR (Shared for Direct & Flash) */}
            {(bookingMode === 'direct' || bookingMode === 'flash') && currentStep === 1 && (
              <div className="animate-fade-in">
                <h2 className="text-xl text-[var(--color-text-main)] mb-6 font-semibold">Select a Date & Time</h2>
                <div className={styles.calendarWrapper}>
                  <div className={styles.calendarHeader}>
                    <button className={styles.calendarNavBtn} onClick={handlePrevMonth}>&lt;</button>
                    <span>{monthNames[month]} {year}</span>
                    <button className={styles.calendarNavBtn} onClick={handleNextMonth}>&gt;</button>
                  </div>
                  <div className={styles.calendarGrid}>
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                      <div key={day} className={styles.calendarDayName}>{day}</div>
                    ))}
                    {Array.from({ length: startOffset }).map((_, i) => (
                      <div key={`empty-${i}`} className={styles.calendarDay + " " + styles.disabled}></div>
                    ))}
                    {daysArray.map(day => {
                      const isDisabled = isDateBlocked(day);
                      const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year;
                      return (
                        <div 
                          key={day}
                          className={`${styles.calendarDay} ${isDisabled ? styles.disabled : ''} ${isSelected ? styles.selected : ''}`}
                          onClick={() => { if (!isDisabled) { setSelectedDate(new Date(year, month, day)); setSelectedTime(null); } }}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedDate && (
                  <div className={styles.timeSlotsWrapper}>
                    <h3 className={styles.timeSlotsTitle}>
                      Available Time Slots
                      <span className="block text-sm text-[var(--color-text-muted)] mt-1 font-normal">
                        (Showing required time for your {bookingMode === 'flash' ? '1.5 hr' : currentServiceObj?.time} session)
                      </span>
                    </h3>
                    <div className={styles.timeSlotsGrid}>
                      {TIME_SLOTS.map((time) => {
                        const isCovered = coveredTimeSlots.includes(time);
                        const isBlocked = isTimeBlocked(time);
                        return (
                          <button 
                            key={time}
                            className={`${styles.timeSlotBtn} ${isCovered ? styles.selected : ''}`}
                            disabled={isBlocked}
                            style={{ opacity: isBlocked ? 0.3 : 1, cursor: isBlocked ? 'not-allowed' : 'pointer' }}
                            onClick={() => { if (!isBlocked) setSelectedTime(time); }}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: DETAILS (Shared for Direct & Flash) */}
            {(bookingMode === 'direct' || bookingMode === 'flash') && currentStep === 2 && (
              <div className="animate-fade-in">
                <h2 className="text-xl text-[var(--color-text-main)] mb-6 font-semibold">Your Details</h2>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Full Name</label>
                  <input type="text" className={styles.formInput} placeholder="John Doe" value={clientDetails.name} onChange={e => setClientDetails({...clientDetails, name: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email Address</label>
                  <input type="email" className={styles.formInput} placeholder="john@example.com" value={clientDetails.email} onChange={e => setClientDetails({...clientDetails, email: e.target.value})} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Phone Number (Optional)</label>
                  <input type="tel" className={styles.formInput} placeholder="+44 7000 000000" value={clientDetails.phone} onChange={e => setClientDetails({...clientDetails, phone: e.target.value})} />
                </div>
                
                {bookingMode === 'direct' && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Reference Images (Max 5)</label>
                    <input type="file" multiple accept="image/*" className={styles.formInput} onChange={(e) => setReferenceFiles(e.target.files)} />
                    <p className="text-sm text-[var(--color-text-muted)] mt-2">Upload reference photos, placement area, or sketches.</p>
                  </div>
                )}
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tattoo Idea / Description {bookingMode === 'flash' && "(Optional)"}</label>
                  <textarea className={styles.formTextarea} placeholder={bookingMode === 'flash' ? "Any specific placement requests or details..." : "Describe your idea, placement, and any specific details..."} value={clientDetails.idea} onChange={e => setClientDetails({...clientDetails, idea: e.target.value})}></textarea>
                </div>
              </div>
            )}

            {/* STEP 3: DEPOSIT (Shared for Direct & Flash) */}
            {(bookingMode === 'direct' || bookingMode === 'flash') && currentStep === 3 && (
              <div className="animate-fade-in text-center">
                {submitSuccess ? (
                  <div className={styles.successMessage}>
                    <div className="text-4xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
                    <p className="text-[var(--color-text-muted)]">Your deposit has been paid and your appointment is secured. You will receive an email confirmation shortly.</p>
                    <Link href="/" className={`${styles.stripeBtn} mt-6 inline-block`} style={{ textDecoration: 'none' }}>Back to Home</Link>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl text-[var(--color-text-main)] mb-6 font-semibold">Secure Your Appointment</h2>
                    <div className={styles.depositBox}>
                      <p className="text-[var(--color-text-muted)] mb-2">Required Deposit</p>
                      <h3 className="text-4xl text-[var(--color-primary)] font-bold mb-4">£{depositAmount}</h3>
                      <p className="text-sm text-[var(--color-text-muted)] mb-8 max-w-md mx-auto">
                        This deposit secures your date and time. It is non-refundable and will be deducted from the final price of your tattoo.
                      </p>
                      
                      {submitError && <div className={styles.errorMsg}>{submitError}</div>}
                      
                      <button className={styles.stripeBtn} onClick={() => handleCheckout()} disabled={isSubmitting}>
                        {isSubmitting ? "Processing..." : "Pay with Stripe"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* CUSTOM DESIGN FORM (Option C) */}
            {bookingMode === 'custom' && (
              <div className="animate-fade-in">
                {submitSuccess ? (
                  <div className={styles.successMessage}>
                    <div className="text-4xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Request Sent!</h2>
                    <p className="text-[var(--color-text-muted)]">Your custom design inquiry has been submitted. Semih will review your idea and get back to you shortly to discuss pricing and dates.</p>
                    <Link href="/" className={`${styles.stripeBtn} mt-6 inline-block`} style={{ textDecoration: 'none' }}>Back to Home</Link>
                  </div>
                ) : (
                  <div className={styles.customFormWrapper}>
                    <h2 className="text-2xl text-[var(--color-primary)] mb-2 font-semibold">Custom Design Request</h2>
                    <p className="text-[var(--color-text-muted)] mb-6">Tell us about your unique idea. We will get back to you with a consultation and booking link.</p>
                    <form onSubmit={handleCustomSubmit}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Full Name</label>
                        <input type="text" className={styles.formInput} placeholder="John Doe" value={clientDetails.name} onChange={e => setClientDetails({...clientDetails, name: e.target.value})} required />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email Address</label>
                        <input type="email" className={styles.formInput} placeholder="john@example.com" value={clientDetails.email} onChange={e => setClientDetails({...clientDetails, email: e.target.value})} required />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Phone Number (WhatsApp)</label>
                        <input type="tel" className={styles.formInput} placeholder="+44 7000 000000" value={clientDetails.phone} onChange={e => setClientDetails({...clientDetails, phone: e.target.value})} required />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Detailed Idea & Placement</label>
                        <textarea className={styles.formTextarea} style={{ minHeight: '150px' }} placeholder="Describe your idea in detail, where you want it placed, approximate size in cm, etc..." value={clientDetails.idea} onChange={e => setClientDetails({...clientDetails, idea: e.target.value})} required></textarea>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Reference Images (Max 5)</label>
                        <input type="file" multiple accept="image/*" className={styles.formInput} onChange={(e) => setReferenceFiles(e.target.files)} />
                      </div>
                      {submitError && <div className={styles.errorMsg}>{submitError}</div>}
                      <button type="submit" className={`${styles.stripeBtn} w-full`} disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* NEXT BUTTON (Shared for Direct & Flash) */}
            {(bookingMode === 'direct' || bookingMode === 'flash') && currentStep < STEPS.length - 1 && (
              <div className="mt-8 flex justify-end">
                <button 
                  className={styles.nextBtn} 
                  onClick={handleNext}
                  disabled={(bookingMode === 'direct' && currentStep === 0 && !selectedService) || (bookingMode === 'flash' && currentStep === 0 && !selectedFlash) || (currentStep === 1 && (!selectedDate || !selectedTime))}
                >
                  Continue &rarr;
                </button>
              </div>
            )}

          </div>
        </div>
      </section>
      <BackToTop />
    </>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center text-white">Loading...</div>}>
      <BookingForm />
    </Suspense>
  );
}
