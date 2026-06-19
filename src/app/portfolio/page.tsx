"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import BackToTop from "@/components/BackToTop";

interface PortfolioItem {
  id: string;
  image_url: string;
  title: string;
  price_gbp: number | null;
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    async function fetchPortfolio() {
      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .neq('is_flash', true)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setItems(data);
      }
      setLoading(false);
    }

    fetchPortfolio();
  }, []);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedItem(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const featuredItems = items.slice(0, 5);
  const standardItems = items.slice(5);

  return (
    <>
    <Navbar />
    <div className={styles.portfolioSection}>
      <div className={styles.portfolioHeader}>
        <h1 className={styles.portfolioTitle}>The Gallery</h1>
        <p className={styles.portfolioSubtitle}>
          Explore some of my recent work. From fine line minimalist pieces to detailed custom designs. 
          Find inspiration for your next session.
        </p>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>LOADING...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-[var(--color-text-muted)] py-12">
          No portfolio items available yet.
        </div>
      ) : (
        <>
          {/* Top 5 Featured Images */}
          <div className={styles.featuredGrid}>
            {featuredItems.map((item, index) => {
              const spanHeight = 25 + (index % 3) * 5; 
              return (
                <div 
                  key={item.id} 
                  className={styles.featuredItem}
                  onClick={() => setSelectedItem(item)}
                >
                  <Image 
                    src={item.image_url} 
                    alt={item.title || "Tattoo work"} 
                    fill
                    sizes="(max-width: 600px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    className={styles.galleryImage}
                  />
                  <div className={styles.itemOverlay}>
                    <h3 className={styles.itemTitle}>{item.title || "Custom Design"}</h3>
                    {item.price_gbp && <div className={styles.itemPrice}>from £{item.price_gbp}</div>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Remaining Smaller Images */}
          {standardItems.length > 0 && (
            <div className={styles.standardGrid}>
              {standardItems.map((item, index) => {
                // Smaller span heights for standard items
                const spanHeight = 15 + (index % 3) * 3; 
                return (
                  <div 
                    key={item.id} 
                    className={styles.standardItem}
                    onClick={() => setSelectedItem(item)}
                  >
                    <Image 
                      src={item.image_url} 
                      alt={item.title || "Tattoo work"} 
                      fill
                      sizes="(max-width: 600px) 33vw, (max-width: 1200px) 20vw, 15vw"
                      className={styles.galleryImage}
                    />
                    <div className={styles.itemOverlay}>
                      <h3 className={styles.itemTitle}>{item.title || "Custom Design"}</h3>
                      {item.price_gbp && <div className={styles.itemPrice}>from £{item.price_gbp}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Lightbox Modal */}
      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelectedItem(null)}>
              &times;
            </button>
            <div className={styles.modalImageWrapper}>
                <Image 
                  src={selectedItem.image_url} 
                  alt={selectedItem.title || "Tattoo detail"} 
                  fill
                  sizes="100vw"
                  className={styles.modalImage}
                />
              <div className={styles.modalInfo}>
                <h3 className={styles.modalTitle}>{selectedItem.title || "Custom Design"}</h3>
                {selectedItem.price_gbp && <p className={styles.modalPrice}>Estimated Price: £{selectedItem.price_gbp}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    <BackToTop />
    </>
  );
}
