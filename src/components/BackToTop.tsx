"use client";

import Link from "next/link";
import styles from "./BackToTop.module.css";

export default function BackToTop() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className={styles.footer}>
      <button onClick={scrollToTop} className={styles.backToTop}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
        BACK TO TOP
      </button>
      <div className={styles.footerLinks}>
        <Link href="/" className={styles.footerLink}>Home</Link>
        <Link href="/portfolio" className={styles.footerLink}>Portfolio</Link>
        <Link href="/book" className={styles.footerLink}>Book Now</Link>
        <span className={styles.copyright}>&copy;2026 Semih Duru</span>
      </div>
    </footer>
  );
}
