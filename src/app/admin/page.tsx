"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import BackToTop from "@/components/BackToTop";

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Dashboard State
  const [activeTab, setActiveTab] = useState("appointments");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  
  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);

  // Portfolio Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadPrice, setUploadPrice] = useState("");
  const [uploadIsFlash, setUploadIsFlash] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<any>(null);

  // Settings State
  const [depositAmount, setDepositAmount] = useState("");
  const [bioText, setBioText] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) fetchData();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    // Fetch Appointments
    const { data: apptData, error: apptError } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!apptError && apptData) setAppointments(apptData);

    // Fetch Portfolio
    const { data: portData, error: portError } = await supabase
      .from('portfolio')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (!portError && portData) setPortfolio(portData);

    // Fetch Blocked Slots
    const { data: blockedData, error: blockedError } = await supabase
      .from('blocked_slots')
      .select('*');
      
    if (!blockedError && blockedData) setBlockedSlots(blockedData);

    // Fetch Settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*');

    if (!settingsError && settingsData) {
      const depositSetting = settingsData.find(s => s.setting_key === 'deposit_amount_gbp');
      const bioSetting = settingsData.find(s => s.setting_key === 'bio_text');
      if (depositSetting) setDepositAmount(depositSetting.setting_value);
      if (bioSetting) setBioText(bioSetting.setting_value);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setLoginError(error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const updateAppointmentStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (!error) {
      setAppointments(appointments.map(a => a.id === id ? { ...a, status: newStatus } : a));
      if (selectedAppointment && selectedAppointment.id === id) {
        setSelectedAppointment({ ...selectedAppointment, status: newStatus });
      }
    } else {
      alert("Error updating status: " + error.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    
    try {
      // Upsert Deposit Amount
      await supabase.from('settings').upsert({
        setting_key: 'deposit_amount_gbp',
        setting_value: depositAmount,
        description: 'Fixed deposit amount in GBP required for bookings'
      }, { onConflict: 'setting_key' });

      // Upsert Bio
      await supabase.from('settings').upsert({
        setting_key: 'bio_text',
        setting_value: bioText,
        description: 'Studio bio displayed on the homepage'
      }, { onConflict: 'setting_key' });

      alert("Settings saved successfully!");
    } catch (error: any) {
      alert("Error saving settings: " + error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // --- Portfolio Functions ---
  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFiles || uploadFiles.length === 0) return;

    setUploading(true);
    try {
      const filesArray = Array.from(uploadFiles);
      
      // Loop through all selected files and upload them
      for (const file of filesArray) {
        // 1. Upload file to Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('portfolio_images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: publicUrlData } = supabase.storage
          .from('portfolio_images')
          .getPublicUrl(filePath);

        // 3. Save to database
        const { error: dbError } = await supabase
          .from('portfolio')
          .insert([
            { 
              image_url: publicUrlData.publicUrl,
              title: uploadTitle || file.name.split('.')[0], // Use generic title or filename
              price_gbp: uploadPrice ? parseFloat(uploadPrice) : null,
              is_flash: uploadIsFlash
            }
          ]);

        if (dbError) throw dbError;
      }

      // Reset form and refresh data after ALL files are processed
      setUploadFiles(null);
      setUploadTitle("");
      setUploadPrice("");
      setUploadIsFlash(false);
      
      // Reset the file input visually
      const fileInput = document.getElementById('bulk-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchData();
      alert(`${filesArray.length} resim başarıyla portföye eklendi!`);
      
    } catch (error: any) {
      alert("Error uploading images: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePortfolio = async (id: string, imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this from portfolio?")) return;
    
    // Extract filename from URL (very basic extraction)
    const fileName = imageUrl.split('/').pop();
    
    if (fileName) {
      await supabase.storage.from('portfolio_images').remove([fileName]);
    }
    
    await supabase.from('portfolio').delete().eq('id', id);
    fetchData();
  };

  const handleUpdatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPortfolioItem) return;

    try {
      const { error } = await supabase
        .from('portfolio')
        .update({
          title: editingPortfolioItem.title,
          price_gbp: editingPortfolioItem.price_gbp ? parseFloat(editingPortfolioItem.price_gbp) : null,
          is_flash: editingPortfolioItem.is_flash
        })
        .eq('id', editingPortfolioItem.id);

      if (error) throw error;

      setEditingPortfolioItem(null);
      fetchData();
      alert("Portfolio item updated successfully!");
    } catch (error: any) {
      alert("Error updating item: " + error.message);
    }
  };

  // --- Calendar & Schedule Functions ---
  const TIME_SLOTS = [
    "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", 
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", 
    "16:00", "16:30", "17:00", "17:30", "18:00"
  ];

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
    const maxMonthsAhead = 6;
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
    return blockedSlots.some(slot => slot.date === dateStr && slot.time === time && !slot.is_whole_day);
  };

  const toggleWholeDayBlock = async () => {
    if (!selectedDate) return;
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    
    const existingBlock = blockedSlots.find(slot => slot.date === dateStr && slot.is_whole_day);
    
    if (existingBlock) {
      // Unblock
      await supabase.from('blocked_slots').delete().eq('id', existingBlock.id);
      setBlockedSlots(blockedSlots.filter(s => s.id !== existingBlock.id));
    } else {
      // Block
      const newBlock = { date: dateStr, is_whole_day: true };
      const { data } = await supabase.from('blocked_slots').insert([newBlock]).select();
      if (data) {
        setBlockedSlots([...blockedSlots, ...data]);
      }
    }
  };

  const toggleTimeSlotBlock = async (time: string) => {
    if (!selectedDate) return;
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    
    if (blockedSlots.some(slot => slot.date === dateStr && slot.is_whole_day)) {
        return; // Can't toggle individual time slot if whole day is blocked
    }

    const existingBlock = blockedSlots.find(slot => slot.date === dateStr && slot.time === time && !slot.is_whole_day);
    
    if (existingBlock) {
      // Unblock
      await supabase.from('blocked_slots').delete().eq('id', existingBlock.id);
      setBlockedSlots(blockedSlots.filter(s => s.id !== existingBlock.id));
    } else {
      // Block
      const newBlock = { date: dateStr, time: time, is_whole_day: false };
      const { data } = await supabase.from('blocked_slots').insert([newBlock]).select();
      if (data) {
        setBlockedSlots([...blockedSlots, ...data]);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (!session) {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.loginWrapper}>
          <div className={styles.loginCard}>
            <h1 className={styles.loginTitle}>Studio Admin</h1>
            <p className={styles.loginSubtitle}>Login to manage your bookings</p>
            
            {loginError && <div className={styles.errorMsg}>{loginError}</div>}
            
            <form onSubmit={handleLogin}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email</label>
                <input 
                  type="email" 
                  className={styles.formInput} 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Password</label>
                <input 
                  type="password" 
                  className={styles.formInput} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className={styles.loginBtn}>
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <Navbar />
    <div className={styles.adminContainer}>
      <div className={styles.dashboard}>
        {/* SIDEBAR */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Studio Admin</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{session.user.email}</p>
          </div>
          
          <div 
            className={`${styles.navItem} ${activeTab === 'appointments' ? styles.active : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            📋 Appointments
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === 'schedule' ? styles.active : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            📅 Schedule
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === 'portfolio' ? styles.active : ''}`}
            onClick={() => setActiveTab('portfolio')}
          >
            🖼️ Portfolio Gallery
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </div>
          
          <div className={styles.logoutBtn} onClick={handleLogout}>
            🚪 Logout
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className={styles.mainContent}>
          
          {/* APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
            <div className="animate-fade-in">
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Recent Appointments</h1>
              </div>
              
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Client Name</th>
                      <th>Email / Phone</th>
                      <th>Deposit</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-[var(--color-text-muted)]">No appointments found.</td></tr>
                    ) : (
                      appointments.map((appt) => (
                        <tr key={appt.id}>
                          <td className="font-semibold text-white">
                            {new Date(appt.appointment_date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short'})}
                          </td>
                          <td>{appt.client_name}</td>
                          <td>
                            <div>{appt.client_email}</div>
                            <div className="text-xs text-[var(--color-text-muted)]">{appt.client_phone}</div>
                          </td>
                          <td>£{appt.deposit_amount}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${styles['status_' + appt.status]}`}>
                              {appt.status}
                            </span>
                          </td>
                          <td>
                            <button className={styles.actionBtn} onClick={() => setSelectedAppointment(appt)}>View Details</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="animate-fade-in">
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Schedule & Availability</h1>
                <p className="text-[var(--color-text-muted)] mt-2">Manage your calendar by blocking specific days or time slots.</p>
              </div>
              
              <div className={styles.scheduleLayout}>
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
                    <div key={`empty-${i}`} className={`${styles.calendarDay} ${styles.empty}`}></div>
                  ))}
                  
                  {daysArray.map(day => {
                    const isBlocked = isDateBlocked(day);
                    const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year;

                    return (
                      <div 
                        key={day}
                        className={`${styles.calendarDay} ${isBlocked ? styles.blocked : ''} ${isSelected ? styles.selected : ''}`}
                        onClick={() => setSelectedDate(new Date(year, month, day))}
                      >
                        {day}
                      </div>
                    );
                  })}
                  </div>
                </div>

                {/* TIME SLOTS (Appears when date is selected) */}
                {selectedDate && (
                  <div className={styles.timeSlotsWrapper} style={{ marginTop: 0 }}>
                    <div className={styles.timeSlotsTitle}>
                    <span>
                      Availability for {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </span>
                    {(() => {
                      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                      const isWholeDayBlocked = blockedSlots.some(slot => slot.date === dateStr && slot.is_whole_day);
                      return isWholeDayBlocked ? (
                        <button className={styles.unblockDayBtn} onClick={toggleWholeDayBlock}>Unblock Entire Day</button>
                      ) : (
                        <button className={styles.blockDayBtn} onClick={toggleWholeDayBlock}>Block Entire Day</button>
                      );
                    })()}
                  </div>
                  
                  {(() => {
                    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                    const isWholeDayBlocked = blockedSlots.some(slot => slot.date === dateStr && slot.is_whole_day);
                    
                    if (isWholeDayBlocked) {
                      return <div className="text-[var(--color-text-muted)] text-center py-4 border border-dashed border-[var(--color-border)] rounded">This entire day is blocked.</div>;
                    }

                    return (
                      <div className={styles.timeSlotsGrid}>
                        {TIME_SLOTS.map((time) => {
                          const isBlocked = isTimeBlocked(time);
                          return (
                            <button 
                              key={time}
                              className={`${styles.timeSlotBtn} ${isBlocked ? styles.blocked : ''}`}
                              onClick={() => toggleTimeSlotBlock(time)}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PORTFOLIO TAB */}
          {activeTab === 'portfolio' && (
            <div className="animate-fade-in">
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Manage Portfolio</h1>
                <p className="text-[var(--color-text-muted)] mt-2">Upload your recent tattoos to show on the website.</p>
              </div>

              {/* UPLOAD FORM */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-lg mb-8 max-w-2xl">
                <h3 className="text-lg text-[var(--color-primary)] font-semibold mb-4">Add New Tattoo</h3>
                <form onSubmit={handleImageUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={styles.formGroupFull}>
                    <label className={styles.formLabel}>Image Files (You can select multiple)</label>
                    <input 
                      id="bulk-upload-input"
                      type="file" 
                      accept="image/*"
                      multiple
                      className={styles.formInput} 
                      onChange={(e) => setUploadFiles(e.target.files)}
                      required
                    />
                  </div>
                  <div>
                    <label className={styles.formLabel}>Title (Optional, applies to all if bulk uploading)</label>
                    <input 
                      type="text" 
                      className={styles.formInput} 
                      placeholder="e.g. Fine Line Rose"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.formLabel}>Estimated Price (£) (Optional)</label>
                    <input 
                      type="number" 
                      className={styles.formInput} 
                      placeholder="e.g. 150"
                      value={uploadPrice}
                      onChange={(e) => setUploadPrice(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroupFull} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <input 
                      type="checkbox" 
                      id="isFlashToggle"
                      checked={uploadIsFlash}
                      onChange={(e) => setUploadIsFlash(e.target.checked)}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <label htmlFor="isFlashToggle" className={styles.formLabel} style={{ marginBottom: 0, cursor: 'pointer' }}>
                      ⚡ This is a Flash Tattoo (Available for instant booking)
                    </label>
                  </div>
                  <div className={styles.formGroupFull}>
                    <button type="submit" className={styles.loginBtn} disabled={uploading}>
                      {uploading ? "Uploading..." : "Upload to Gallery"}
                    </button>
                  </div>
                </form>
              </div>

              {/* GALLERY GRID */}
              <div className={styles.portfolioGrid}>
                {portfolio.map(item => (
                  <div key={item.id} className={styles.portfolioCard}>
                    <div className={styles.portfolioImageWrapper}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt={item.title} className={styles.portfolioImage} />
                    </div>
                    <div className={styles.portfolioInfo}>
                      <h4 className={styles.portfolioCardTitle}>
                        {item.is_flash && <span title="Flash Tattoo" style={{color: '#d4af37', marginRight: '5px'}}>⚡</span>}
                        {item.title || "Untitled"}
                      </h4>
                      {item.price_gbp && <p className={styles.portfolioPrice}>£{item.price_gbp}</p>}
                    </div>
                    {/* Edit/Delete overlay */}
                    <div className={styles.portfolioDeleteOverlay}>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingPortfolioItem(item)}
                          className={styles.portfolioEditBtn}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeletePortfolio(item.id, item.image_url)}
                          className={styles.portfolioDeleteBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {portfolio.length === 0 && (
                  <div className={styles.portfolioEmpty}>
                    No images in your portfolio yet.
                  </div>
                )}
              </div>

              {/* EDIT MODAL */}
              {editingPortfolioItem && (
                <div className={styles.modalOverlay} onClick={() => setEditingPortfolioItem(null)}>
                  <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                    <button className={styles.closeModalBtn} onClick={() => setEditingPortfolioItem(null)}>×</button>
                    <div className={styles.modalHeader}>
                      <h2 className={styles.modalTitle}>Edit Portfolio Item</h2>
                    </div>
                    <form onSubmit={handleUpdatePortfolio} className="flex flex-col gap-4">
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Title</label>
                        <input 
                          type="text" 
                          className={styles.formInput} 
                          value={editingPortfolioItem.title || ""} 
                          onChange={(e) => setEditingPortfolioItem({...editingPortfolioItem, title: e.target.value})}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Price (£)</label>
                        <input 
                          type="number" 
                          className={styles.formInput} 
                          value={editingPortfolioItem.price_gbp || ""} 
                          onChange={(e) => setEditingPortfolioItem({...editingPortfolioItem, price_gbp: e.target.value})}
                        />
                      </div>
                      <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="checkbox" 
                          id="editIsFlashToggle"
                          checked={editingPortfolioItem.is_flash || false}
                          onChange={(e) => setEditingPortfolioItem({...editingPortfolioItem, is_flash: e.target.checked})}
                          style={{ width: '20px', height: '20px' }}
                        />
                        <label htmlFor="editIsFlashToggle" className={styles.formLabel} style={{ marginBottom: 0, cursor: 'pointer' }}>
                          ⚡ Flash Tattoo
                        </label>
                      </div>
                      <button type="submit" className={styles.loginBtn}>
                        Save Changes
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="animate-fade-in">
              <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Site Settings</h1>
                <p className="text-[var(--color-text-muted)] mt-2">Update your booking deposit amount and homepage bio.</p>
              </div>
              
              <form className={styles.settingsForm} onSubmit={handleSaveSettings}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Deposit Amount (£)</label>
                  <input 
                    type="number" 
                    className={styles.formInput} 
                    value={depositAmount} 
                    onChange={e => setDepositAmount(e.target.value)} 
                    min="0"
                    step="1"
                    required
                  />
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">This amount will be charged via Stripe when clients book an appointment.</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Homepage Bio / Description</label>
                  <textarea 
                    className={styles.formTextarea} 
                    value={bioText} 
                    onChange={e => setBioText(e.target.value)} 
                    placeholder="Hi I'm Semih! My priority is..."
                    required
                  ></textarea>
                </div>
                
                <button type="submit" className={styles.saveSettingsBtn} disabled={savingSettings}>
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* APPOINTMENT DETAILS MODAL */}
      {selectedAppointment && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAppointment(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => setSelectedAppointment(null)}>×</button>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Appointment Details</h2>
              <span className={`${styles.statusBadge} ${styles['status_' + selectedAppointment.status]}`}>
                {selectedAppointment.status}
              </span>
            </div>
            
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Client</div>
              <div className={styles.detailValue}>{selectedAppointment.client_name}</div>
            </div>
            
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Contact Info</div>
              <div className={styles.detailValue}>
                {selectedAppointment.client_email} <br/>
                {selectedAppointment.client_phone}
              </div>
            </div>
            
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Date & Time</div>
              <div className={styles.detailValue}>
                {new Date(selectedAppointment.appointment_date).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
              </div>
            </div>
            
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Deposit Paid</div>
              <div className={styles.detailValue}>£{selectedAppointment.deposit_amount}</div>
            </div>
            
            <div className={styles.detailRow}>
              <div className={styles.detailLabel}>Tattoo Idea / Description</div>
              <div className={styles.detailValue} style={{ whiteSpace: 'pre-wrap' }}>
                {selectedAppointment.description || "No description provided."}
              </div>
            </div>
            
            {selectedAppointment.reference_image_url && (
              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Reference Images</div>
                <div className={styles.referenceImagesGrid}>
                  {selectedAppointment.reference_image_url.split(',').map((url: string, index: number) => (
                    <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Reference ${index + 1}`} className={styles.referenceImage} />
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            <div className={styles.modalActions}>
              {selectedAppointment.status === 'pending' && (
                <button className={styles.approveBtn} onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmed')}>
                  Approve / Confirm
                </button>
              )}
              {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'confirmed') && (
                <button className={styles.rejectBtn} onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}>
                  Cancel Appointment
                </button>
              )}
              {selectedAppointment.status === 'confirmed' && (
                <button className={styles.completeBtn} onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}>
                  Mark as Completed
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
    <BackToTop />
    </>
  );
}
