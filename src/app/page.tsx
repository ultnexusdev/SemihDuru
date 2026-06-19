"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";

// Temporary data (will be moved to Supabase/Admin Panel later)
const PAGE_DATA = {
  heroImage: "/studio-bg.png",
  heroDescription: "Hi I'm Semih! My priority is to make you feel safe and comfortable during our tattoo appointment. Trust and hygiene are my top priorities.",
  
  col1Image: "/studio-bg.png",
  col1Title: "STERILE, PRIVATE ROOMS",
  col1Text: "You're in enough pain during a tattoo. We try to make your surroundings as pleasant and hygienic as possible.",
  
  col2Image: "/artist-designing.png",
  col2Title: "PERSONAL ATTENTION",
  col2Text: "Making your tattoo perfect is always my priority. I prefer to set aside time to work with you without the bustle and demand of walk-in traffic.",
  
  col3Image: "/tattoo-work.png",
  col3Title: "SPECIALIZED ARTISTRY",
  col3Text: "I am focused on producing the highest quality of illustration and fine-line work possible. Check out my ",
  
  socials: {
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
    pinterest: "https://pinterest.com",
    tiktok: "https://tiktok.com"
  },
  email: "semihtattoo@gmail.com",
  mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2483.288961634382!2d-0.1276473842299801!3d51.50732181822736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487604ce3941eb1f%3A0x1a5342fdf089c627!2sTrafalgar%20Square!5e0!3m2!1sen!2suk!4v1620000000000!5m2!1sen!2suk"
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [bio, setBio] = useState(PAGE_DATA.heroDescription);
  const [flashTattoos, setFlashTattoos] = useState<any[]>([]);

  useEffect(() => {
    const fetchSettingsAndFlash = async () => {
      const { data } = await supabase.from('settings').select('*').eq('setting_key', 'bio_text').single();
      if (data) {
        setBio(data.setting_value);
      }
      
      const { data: flashData } = await supabase.from('portfolio').select('*').eq('is_flash', true).limit(10);
      if (flashData) {
        setFlashTattoos(flashData);
      }
    };
    fetchSettingsAndFlash();
  }, []);

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (email) {
      // Here you would integrate with Mailchimp, Substack, or Supabase
      console.log("Subscribed with:", email);
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main>
      <section className={styles.heroSection}>
        {/* Background Image Setup */}
        <div className={styles.bgWrapper}>
          <Image
            src={PAGE_DATA.heroImage}
            alt="London Social Tattoo Studio"
            fill
            sizes="100vw"
            priority
            className={styles.bgImage}
          />
          <div className={styles.bgGradient} />
        </div>

        {/* Hero Content */}
        <div className={`${styles.content} animate-fade-in`}>
          <h4 className={styles.subtitle}>Semih Duru</h4>
          <h1 className={styles.title}>
            Bespoke Ink in a Premium Setting
          </h1>
          <p className={styles.description}>
            {bio}
          </p>
          
          <div className={styles.buttonGroup}>
            <Link href="/book" className="btn btn-primary">
              Book a Session
            </Link>
            <Link href="/portfolio" className="btn btn-outline">
              View Portfolio & Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Guest Spot / Location Banner */}
      <div className={styles.locationBanner}>
        <div className={styles.locationItem}>
          <svg className={styles.locationIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          <div className={styles.locationText}>
            LONDON <span>Currently Booking</span>
          </div>
        </div>
        <div className={styles.locationItem}>
          <svg className={styles.locationIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <div className={styles.locationText}>
            ISTANBUL <span>Upcoming Dates TBD</span>
          </div>
        </div>
      </div>

      {/* 3 Column Features Grid */}
      <section className={styles.featuresSection}>
        <div className={`container ${styles.threeColGrid}`}>
          
          {/* Column 1: Studio */}
          <div className={styles.featureCard}>
            <div className={styles.featureImageWrapper}>
              <Image
                src={PAGE_DATA.col1Image}
                alt={PAGE_DATA.col1Title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className={styles.featureImageHover}
              />
            </div>
            <h3 className={styles.featureTitle}>{PAGE_DATA.col1Title}</h3>
            <p className={styles.featureText}>{PAGE_DATA.col1Text}</p>
          </div>

          {/* Column 2: Personal Attention */}
          <div className={styles.featureCard}>
            <div className={styles.featureImageWrapper}>
              <Image
                src={PAGE_DATA.col2Image}
                alt={PAGE_DATA.col2Title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className={styles.featureImageHover}
              />
            </div>
            <h3 className={styles.featureTitle}>{PAGE_DATA.col2Title}</h3>
            <p className={styles.featureText}>{PAGE_DATA.col2Text}</p>
          </div>

          {/* Column 3: Specialized Artistry */}
          <div className={styles.featureCard}>
            <div className={styles.featureImageWrapper}>
              <Image
                src={PAGE_DATA.col3Image}
                alt={PAGE_DATA.col3Title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className={styles.featureImageHover}
              />
            </div>
            <h3 className={styles.featureTitle}>{PAGE_DATA.col3Title}</h3>
            <p className={styles.featureText}>
              {PAGE_DATA.col3Text}
              <Link href="/portfolio" className={styles.portfolioLink}>
                portfolio
              </Link>
              {" "}and see for yourself.
            </p>
          </div>

        </div>
      </section>

      {/* Biologist Story Section */}
      <section className={styles.bioSection}>
        <div className={styles.bioContent}>
          <h2 className={styles.bioQuote}>"Engraving the anatomy of nature onto the skin."</h2>
          <p className={styles.bioText}>
            As a biologist turned tattoo artist, I approach every design with scientific precision and a deep appreciation for natural forms. My fine line and microrealistic works are built on a foundation of anatomical and botanical accuracy. I believe that understanding the intricate details of nature allows me to craft pieces that flow perfectly with the human body.
          </p>
        </div>
      </section>

      {/* Available Flash Tattoos Slider */}
      {flashTattoos.length > 0 && (
        <section className={styles.healedSection} style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className={styles.healedHeader}>
            <h2 className={styles.healedTitle}>Available Flash Designs</h2>
            <p className="text-[var(--color-text-muted)] max-w-2xl mx-auto">
              Ready-to-ink designs available for instant booking. Secure your favorite piece before it's gone.
            </p>
          </div>
          
          <div className={styles.healedSlider}>
            {flashTattoos.map((flash) => (
              <div key={flash.id} className={styles.healedCard} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
                  <Image 
                    src={flash.image_url} 
                    alt={flash.title || "Flash Tattoo"} 
                    fill 
                    sizes="300px"
                    style={{ objectFit: 'cover' }} 
                  />
                </div>
                <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#111', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'white', fontWeight: 600 }}>{flash.title}</h4>
                    {flash.price_gbp && <p style={{ margin: '0 0 1rem 0', color: 'var(--color-primary)' }}>£{flash.price_gbp}</p>}
                  </div>
                  <Link href={`/book?mode=flash&id=${flash.id}`} style={{ display: 'block', backgroundColor: 'var(--color-primary)', color: '#000', padding: '0.5rem', borderRadius: '4px', fontWeight: 'bold', textDecoration: 'none' }}>
                    Get it now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Healed Tattoos Gallery Slider */}
      <section className={styles.healedSection}>
        <div className={styles.healedHeader}>
          <h2 className={styles.healedTitle}>Built to Last</h2>
          <p className="text-[var(--color-text-muted)] max-w-2xl mx-auto">
            The true test of a fine line tattoo is how it looks years later. My techniques ensure that your delicate pieces heal beautifully and stand the test of time without blowing out or fading away.
          </p>
        </div>
        
        <div className={styles.healedSlider}>
          {/* Slider Items (Using placeholders for now) */}
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className={styles.healedCard}>
              <div className={styles.healedLabel}>1 Year Healed</div>
              <Image 
                src="/tattoo-work.png" 
                alt={`Healed work ${item}`} 
                fill 
                sizes="300px"
                style={{ objectFit: 'cover' }} 
              />
            </div>
          ))}
        </div>
      </section>

      {/* Booking Process Flowchart */}
      <section className={styles.flowSection}>
        <h2 className="text-3xl text-[var(--color-primary)] mb-2 font-serif">How It Works</h2>
        <p className="text-[var(--color-text-muted)]">From concept to skin in three simple steps.</p>
        
        <div className={styles.flowGrid}>
          <div className={styles.flowStep}>
            <div className={styles.flowIconWrapper}>
              <div className={styles.flowNumber}>1</div>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <h3 className={styles.flowTitle}>Submit Your Idea</h3>
            <p className={styles.flowText}>Fill out the booking form with your reference images, placement ideas, and preferred dates.</p>
          </div>
          
          <div className={styles.flowStep}>
            <div className={styles.flowIconWrapper}>
              <div className={styles.flowNumber}>2</div>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h3 className={styles.flowTitle}>Design Consultation</h3>
            <p className={styles.flowText}>We will discuss the anatomical flow, sizing, and intricate details to ensure the design perfectly matches your vision.</p>
          </div>
          
          <div className={styles.flowStep}>
            <div className={styles.flowIconWrapper}>
              <div className={styles.flowNumber}>3</div>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h3 className={styles.flowTitle}>Studio Session</h3>
            <p className={styles.flowText}>Join me in a sterile, private, and relaxing environment to bring your bespoke ink to life.</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.testiSection}>
        <div className="text-center">
          <h2 className="text-3xl text-[var(--color-primary)] font-serif mb-2">Client Experiences</h2>
          <p className="text-[var(--color-text-muted)]">Don't just take my word for it.</p>
        </div>
        
        <div className={styles.testiGrid}>
          {/* Review 1 */}
          <div className={styles.testiCard}>
            <div className={styles.stars}>
              {[1,2,3,4,5].map(i => <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>)}
            </div>
            <p className={styles.testiText}>"Semih made my first tattoo experience incredibly comfortable. His attention to hygiene and the sterile environment immediately put me at ease. The fine line work is breathtaking!"</p>
            <div>
              <div className={styles.testiAuthor}>Sarah J.</div>
              <div className={styles.testiPlatform}>Tattoodo Review</div>
            </div>
          </div>
          
          {/* Review 2 */}
          <div className={styles.testiCard}>
            <div className={styles.stars}>
              {[1,2,3,4,5].map(i => <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>)}
            </div>
            <p className={styles.testiText}>"İnanılmaz bir detaycılık! Semih Bey'in biyoloji geçmişi kesinlikle çizimlerine yansıyor. Çiçek dövmemin anatomisi o kadar kusursuz ki herkes nerede yaptırdığımı soruyor."</p>
            <div>
              <div className={styles.testiAuthor}>Elif M.</div>
              <div className={styles.testiPlatform}>Google Maps</div>
            </div>
          </div>
          
          {/* Review 3 */}
          <div className={styles.testiCard}>
            <div className={styles.stars}>
              {[1,2,3,4,5].map(i => <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>)}
            </div>
            <p className={styles.testiText}>"I was worried about fine lines fading over time, but 2 years later, my piece still looks crisp. His communication during the design process was top notch."</p>
            <div>
              <div className={styles.testiAuthor}>Mark T.</div>
              <div className={styles.testiPlatform}>Tattoodo Review</div>
            </div>
          </div>
        </div>
      </section>

      {/* Location / Map Section */}
      <section className={styles.mapSection}>
        <h2 className="text-3xl mb-4 text-[var(--color-primary)] font-serif">Find the Studio</h2>
        <p className="text-[var(--color-text-muted)] mb-0">London Social Tattoo, Central London</p>
        
        <div className={styles.mapContainer}>
          <iframe 
            src={PAGE_DATA.mapEmbedUrl}
            width="100%" 
            height="100%" 
            style={{border:0}} 
            allowFullScreen={false} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      {/* Newsletter Section */}
      <section className={styles.newsletterSection}>
        <div className={styles.newsletterContent}>
          <h2 className={styles.newsletterTitle}>Join the Newsletter</h2>
          <p className={styles.newsletterText}>
            Be the first to know when London and Turkey booking books open. Don't miss out on subscriber-only flash designs!
          </p>
          <form className={styles.newsletterForm} onSubmit={handleSubscribe}>
            <input 
              type="email" 
              placeholder="Your email address" 
              required 
              className={styles.newsletterInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className={styles.newsletterButton}>
              {subscribed ? "Thank you!" : "Subscribe"}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <button onClick={scrollToTop} className={styles.backToTop}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
          BACK TO TOP
        </button>

        <div className={styles.footerContent}>
          {/* Left: Social Icons */}
          <div className={styles.socialGrid}>
            <a href={PAGE_DATA.socials.instagram} target="_blank" rel="noreferrer" className={styles.socialIconWrapper} aria-label="Instagram">
              <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href={PAGE_DATA.socials.facebook} target="_blank" rel="noreferrer" className={styles.socialIconWrapper} aria-label="Facebook">
              <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
              </svg>
            </a>
            <a href={PAGE_DATA.socials.pinterest} target="_blank" rel="noreferrer" className={styles.socialIconWrapper} aria-label="Pinterest">
              <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.172 0 7.41 2.973 7.41 6.942 0 4.148-2.613 7.483-6.242 7.483-1.219 0-2.365-.633-2.757-1.383l-.752 2.868c-.271 1.034-1.004 2.33-1.498 3.118 1.123.346 2.316.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.624 0 12.017 0z"/>
              </svg>
            </a>
            <a href={PAGE_DATA.socials.tiktok} target="_blank" rel="noreferrer" className={styles.socialIconWrapper} aria-label="TikTok">
              <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </a>
          </div>

          {/* Center Left: Email */}
          <a href={`mailto:${PAGE_DATA.email}`} className={styles.footerEmail}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
            {PAGE_DATA.email}
          </a>

          {/* Center Right: Book Now Button */}
          <Link href="/book" className={styles.bookNowBtn}>
            BOOK NOW
          </Link>

          {/* Right: Links & Copyright */}
          <div className={styles.footerLinks}>
            <Link href="/admin" className={styles.privacyLink}>Admin Login</Link>
            <Link href="/privacy" className={styles.privacyLink}>Privacy Policy</Link>
            <span>&copy;2026 All Right Reserved by Semih Duru</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
