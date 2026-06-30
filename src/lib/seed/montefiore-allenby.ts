import type { Page } from "@/types/page";

// Seed content for the Montefiore / Allenby project.
// Also lives in the DB (see db/slice1.sql). Used as a dev fallback so the
// renderer is demonstrable before the external Supabase project is wired up.
export const SEED_PAGES: Record<string, Page> = {
  "montefiore-allenby": {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "montefiore-allenby",
    status: "published",
    source_lang: "fr",
    seo: {
      // Slice 5: SEO is per-language. Source (fr) authored; he/en stay empty.
      fr: {
        meta_title: "Montefiore / Allenby - CCInvest",
        meta_description:
          "À VENDRE – TLV. Nouvel immeuble de 6 étages à proximité de la mer et du marché. 17 appartements de 2 et 3 pièces, livraison Avril 2027.",
        canonical: "/montefiore-allenby",
      },
    },

    content: {
      hero: {
        kicker: "À VENDRE - TLV",
        title: "Projet Montefiore / Allenby",
        subtitle: "Nouvel immeuble de 6 étages à proximité de la mer et du marché",
        cta_label: "Contact Us",
      },
      stats: [
        { value: "1", label: "immeuble neuf" },
        { value: "6", label: "ÉTAGES" },
        { value: "1", label: "PARKING" },
        { value: "1", label: "ASCENSEUR" },
      ],
      location: {
        heading: "Emplacement idéal",
        map_query: "Montefiore Allenby Tel Aviv",
        name_i18n: {
          fr: "Montefiore / Allenby",
          en: "Montefiore / Allenby",
          he: "מונטיפיורי / אלנבי",
        },
        text: "L'immeuble se situe à l'angle des rues Montefiore et Allenby près de la Grande Synagogue en cours de rénovation, à la fois près du marché et de la mer mais aussi des commerces et cafés au centre de la ville.",
      },
      about: {
        heading: "À propos du projet",
        body: "Le projet est un immeuble neuf de 6 étages conçu par l'architecte réputé Bar Orian, accompagné par la banque Benleumi. Des prestations hôtelières de qualité sont mises à disposition des locataires : salle de sport, salle de laverie, lobby luxueux, parkings souterrains, balcons / terrasses. Reste à la vente 17 appartements de 2 et 3 pièces, livraison Avril 2027, conditions de paiement très intéressantes.",
      },
      gallery: [
        { url: "https://placehold.co/800x600?text=Gallery+1" },
        { url: "https://placehold.co/800x600?text=Gallery+2" },
        { url: "https://placehold.co/800x600?text=Gallery+3" },
        { url: "https://placehold.co/800x600?text=Gallery+4" },
      ],
      units: [
        {
          name: "Appartement 4",
          floor: "1er étage",
          orientation: "Est",
          rooms: "2 pièces",
          area_m2: "61",
          balcony_m2: "6.5",
          parking: "1",
          price: "5.850.000 ₪",
          description:
            "À l'avant sur Allenby. Salon avec balcon, cuisine, une chambre, salle de douche et toilettes.",
        },
        {
          name: "Appartement 22",
          floor: "1er étage",
          orientation: "Nord-Ouest",
          rooms: "2 pièces",
          area_m2: "50.7",
          balcony_m2: "13",
          parking: "1",
          price: "5.950.000 ₪",
          description:
            "Terrasse de 13m². Salon avec balcon, cuisine, une chambre, salle de douche et toilettes.",
        },
        {
          name: "Appartement 26",
          floor: "1er étage",
          orientation: "Nord",
          rooms: "2 pièces",
          area_m2: "43.9",
          parking: "1",
          price: "3.990.000 ₪",
          description: "Salon, cuisine, une chambre, salle de douche et toilettes.",
        },
        {
          name: "Penthouse 28",
          floor: "6ème étage",
          orientation: "Est",
          rooms: "2 pièces",
          area_m2: "48",
          balcony_m2: "40.5",
          parking: "1",
          price: "7.640.000 ₪",
          description:
            "Terrasse de 40.5m². Salon avec terrasse, cuisine, chambre avec accès terrasse, salle de douche et toilettes.",
        },
        {
          name: "Penthouse 29",
          floor: "6ème étage",
          orientation: "Nord-Est",
          rooms: "2 pièces",
          area_m2: "60",
          balcony_m2: "25",
          parking: "1",
          price: "8.100.000 ₪",
          description:
            "Terrasse de 25m². Salon avec terrasse, cuisine, une chambre, salle de douche et toilettes.",
        },
      ],
      videos: [],
      contact: { heading: "Plus d'informations sur ce projet ?" },
    },
  },
};
