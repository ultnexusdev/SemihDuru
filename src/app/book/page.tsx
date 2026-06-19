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

const DEPOSIT_AMOUNT = 50; // GBP

const STEPS = ["Service", "Date & Time", "Your Details", "Deposit"];

// Helper function to calculate covered slots based on start time and duration
const getCoveredSlots = (startTime: string | null, durationMins: number) => {
  if (!startTime) return [];
  
  const startIndex = TIME_SLOTS.indexOf(startTime);
  if (startIndex === -1) return [];

  // Duration in 30-minute intervals
  const slotsNeeded = Math.ceil(durationMins / 30);
  
  // Return the slice of TIME_SLOTS that this appointment will cover
  // We no longer restrict long sessions, so just return what we have without bounds checking
  return TIME_SLOTS.slice(startIndex, startIndex + slotsNeeded);
};

function BookingForm() {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Form State
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);

  const [clientDetails, setClientDetails] = useState({
    name: "",
    email: "",
    phone: "",
    idea: "",
  });

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Calculate the currently selected service's duration
  const currentServiceObj = SERVICES.find(s => s.id === selectedService);
  const durationMins = currentServiceObj?.durationMins || 30;
  
  // Get all slots that should be highlighted if a time is selected
  const coveredTimeSlots = getCoveredSlots(selectedTime, durationMins);

  useEffect(() => {
    // Check URL parameters for Stripe redirect status
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) {
      setCurrentStep(3);
      setSubmitSuccess(true);
    } else if (query.get("canceled")) {
      setCurrentStep(3);
      setSubmitError("Payment was canceled. You can try again.");
    }

    // Fetch blocked slots
    const fetchBlockedSlots = async () => {
      const { data } = await supabase.from('blocked_slots').select('*');
      if (data) setBlockedSlots(data);
    };
    fetchBlockedSlots();
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCheckout = async (paymentMethod: string) => {
    if (!selectedService || !selectedDate || !selectedTime || !clientDetails.name || !clientDetails.email) {
      setSubmitError("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create a date object combining selectedDate and selectedTime
      // E.g. "2026-06-15T15:30:00+01:00"
      
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      
      const dateString = `${year}-${month}-${day}T${selectedTime}:00+01:00`; // +1 for BST London

      // 2. Generate UUID for the appointment
      const appointmentId = crypto.randomUUID();

      // 3. Insert into Supabase (without .select() to avoid RLS read violation)
      const { error } = await supabase
        .from('appointments')
        .insert([
          {
            id: appointmentId,
            client_name: clientDetails.name,
            client_email: clientDetails.email,
            client_phone: clientDetails.phone,
            appointment_date: dateString,
            service_id: null,
            reference_image_url: clientDetails.idea,
            deposit_paid: false,
            deposit_amount: DEPOSIT_AMOUNT,
            status: 'pending'
          }
        ]);

      if (error) {
        throw error;
      }
      
      // 4. Create Stripe Checkout Session
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: appointmentId,
          depositAmount: DEPOSIT_AMOUNT,
          clientName: clientDetails.name,
          serviceName: currentServiceObj?.name || 'Tattoo Session',
        }),
      });

      if (!checkoutRes.ok) {
        const errorData = await checkoutRes.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await checkoutRes.json();
      
      // Redirect to Stripe Secure Checkout
      window.location.href = url;
      
    } catch (err: any) {
      console.error("Error creating appointment:", err);
      setSubmitError(err.message || "Failed to save appointment or create payment session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar logic
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday
  
  // Adjust so Monday is 0, Sunday is 6
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
    const maxMonthsAhead = 2; // Allow current month + 2 months
    const maxDate = new Date(today.getFullYear(), today.getMonth() + maxMonthsAhead, 1);
    if (newDate <= maxDate) {
      setCurrentMonthDate(newDate);
    }
  };

  const isDateBlocked = (day: number) => {
    const y = year;
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    return blockedSlots.some(slot => slot.date === dateStr && slot.is_whole_day);
  };

  const isTimeBlocked = (time: string) => {
    if (!selectedDate) return false;
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    return blockedSlots.some(slot => slot.date === dateStr && slot.time === time);
  };

  return (
    <>
    <Navbar />
    <div className={styles.bookSection} style={{ paddingTop: '100px' }}>
      <div className={styles.bookHeader}>
        <h1 className={styles.bookTitle}>Book an Appointment</h1>
        <p className={styles.bookSubtitle}>
          Secure your session by selecting your preferred tattoo size and date. 
          A deposit is required to confirm your booking.
        </p>
      </div>

      <div className={styles.bookingContainer}>
        {/* Progress Indicator */}
        <div className={styles.stepsIndicator}>
          {STEPS.map((step, index) => (
            <div 
              key={step} 
              className={`${styles.step} ${index === currentStep ? styles.active : ''} ${index < currentStep ? styles.completed : ''}`}
            >
              {index + 1}. {step}
            </div>
          ))}
        </div>

        {/* STEP 1: SERVICE SELECTION */}
        {currentStep === 0 && (
          <div className="animate-fade-in">
            <h2 className="text-xl text-[var(--color-text-main)] mb-6 font-semibold">Select Tattoo Size</h2>
            <div className={styles.optionsGrid}>
              {SERVICES.map(service => (
                <div 
                  key={service.id}
                  className={`${styles.optionCard} ${selectedService === service.id ? styles.selected : ''}`}
                  onClick={() => setSelectedService(service.id)}
                >
                  {service.imagePlaceholder ? (
                    <div className={styles.optionImageWrapper}>
                      <Image 
                        src={service.imagePlaceholder} 
                        alt={service.name} 
                        fill 
                        className="object-cover"
                      />
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

        {/* STEP 2: DATE & TIME (Calendar) */}
        {currentStep === 1 && (
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
                {/* Empty slots for starting day offset */}
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
                      onClick={() => {
                        if (!isDisabled) {
                          setSelectedDate(new Date(year, month, day));
                          setSelectedTime(null); // Reset time when date changes
                        }
                      }}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TIME SLOTS (Appears when date is selected) */}
            {selectedDate && (
              <div className={styles.timeSlotsWrapper}>
                <h3 className={styles.timeSlotsTitle}>
                  Available Time Slots for {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]}
                  <span className="block text-sm text-[var(--color-text-muted)] mt-1 font-normal">
                    (Showing required time for your {currentServiceObj?.time} session)
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
                        onClick={() => {
                          if (!isBlocked) {
                            setSelectedTime(time);
                          }
                        }}
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

        {/* STEP 3: CLIENT DETAILS */}
        {currentStep === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-xl text-[var(--color-text-main)] mb-6 font-semibold">Your Details</h2>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Full Name</label>
              <input 
                type="text" 
                className={styles.formInput} 
                placeholder="John Doe"
                value={clientDetails.name}
                onChange={e => setClientDetails({...clientDetails, name: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email Address</label>
              <input 
                type="email" 
                className={styles.formInput} 
                placeholder="john@example.com"
                value={clientDetails.email}
                onChange={e => setClientDetails({...clientDetails, email: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone Number (Optional)</label>
              <input 
                type="tel" 
                className={styles.formInput} 
                placeholder="+44 7000 000000"
                value={clientDetails.phone}
                onChange={e => setClientDetails({...clientDetails, phone: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tattoo Idea / Description</label>
              <textarea 
                className={styles.formTextarea} 
                placeholder="Describe your idea, placement, and any specific details..."
                value={clientDetails.idea}
                onChange={e => setClientDetails({...clientDetails, idea: e.target.value})}
              ></textarea>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Reference Images (Max 5)</label>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className={styles.formInput} 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 5) {
                    alert("You can only upload a maximum of 5 images.");
                    e.target.value = ""; // Reset input
                  }
                }}
              />
              <p className="text-sm text-[var(--color-text-muted)] mt-2">Upload pictures of tattoos you like or sketches you've made to help me understand what you're looking for.</p>
            </div>
          </div>
        )}

        {/* STEP 4: PAYMENT (Deposit) */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-xl text-[var(--color-text-main)] mb-6 font-semibold">Confirm & Pay Deposit</h2>
            
            <div className={styles.paymentSummary}>
              <div className={styles.summaryRow}>
                <span>Selected Service:</span>
                <span>{currentServiceObj?.name}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Date & Time:</span>
                <span>{selectedDate?.getDate()} {selectedDate ? monthNames[selectedDate.getMonth()] : ''} {selectedDate?.getFullYear()} at {selectedTime} (For {currentServiceObj?.time})</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Total Service Price:</span>
                <span>£{currentServiceObj?.basePrice}</span>
              </div>
              <div className={styles.summaryTotal}>
                <span>Deposit Required Now:</span>
                <span className="text-[var(--color-primary)]">£{DEPOSIT_AMOUNT}.00</span>
              </div>
              <p className={styles.depositNote}>
                * This deposit secures your appointment and will be deducted from the final price of your tattoo.
              </p>
            </div>

            {submitError && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6">
                {submitError}
              </div>
            )}

            {submitSuccess ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-white">Booking Requested!</h3>
                <p className="text-[var(--color-text-muted)] mb-6">
                  Your appointment data has been successfully saved to Supabase.<br/>
                  (In the final version, you would be redirected to Stripe right now).
                </p>
                <button onClick={() => window.location.reload()} className="btn btn-outline">Start Over</button>
              </div>
            ) : (
              <div className={styles.paymentButtons}>
                {/* Credit Card (Stripe) */}
                <button 
                  className={styles.stripeBtn} 
                  style={{backgroundColor: '#0a2540'}}
                  onClick={() => handleCheckout('stripe')}
                  disabled={isSubmitting}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                  </svg>
                  {isSubmitting ? "Processing..." : `Pay £${DEPOSIT_AMOUNT} with Credit Card`}
                </button>

                {/* Google Pay */}
                <button 
                  className={styles.stripeBtn} 
                  style={{backgroundColor: '#000', color: '#fff', border: '1px solid #333'}}
                  onClick={() => handleCheckout('googlepay')}
                  disabled={isSubmitting}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.907 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                  </svg>
                  Google Pay
                </button>
                
                {/* PayPal */}
                <button 
                  className={styles.paypalBtn}
                  onClick={() => handleCheckout('paypal')}
                  disabled={isSubmitting}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/>
                  </svg>
                  PayPal
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className={styles.actionButtons}>
          {currentStep > 0 ? (
            <button className={styles.btnBack} onClick={handleBack}>Back</button>
          ) : (
            <Link href="/" className={styles.btnBack}>Cancel</Link>
          )}
          
          {currentStep < STEPS.length - 1 && (
            <button 
              className={styles.btnNext} 
              onClick={handleNext}
              disabled={
                (currentStep === 0 && !selectedService) || 
                (currentStep === 1 && (!selectedDate || !selectedTime))
              }
            >
              Continue
            </button>
          )}
        </div>

      </div>
    </div>
    <BackToTop />
    </>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingForm />
    </Suspense>
  );
}
