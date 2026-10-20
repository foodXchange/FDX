export type ChaserLanguage = "en" | "es" | "it" | "fr" | "de";
export type ChaserRound = 1 | 2 | 3;

export interface ChaserTemplate {
  subject: string;
  body: string;
  whatsAppText: string;
}

export function detectSupplierLanguage(country: string | null | undefined): ChaserLanguage {
  if (!country) return "en";
  const c = country.toLowerCase().trim();
  if (
    c.includes("spain") ||
    c.includes("españa") ||
    c.includes("espana") ||
    c === "es" ||
    c.includes("madrid") ||
    c.includes("barcelona") ||
    c.includes("valencia") ||
    c.includes("sevilla")
  ) {
    return "es";
  }
  if (
    c.includes("italy") ||
    c.includes("italia") ||
    c === "it" ||
    c.includes("milan") ||
    c.includes("roma") ||
    c.includes("napoli") ||
    c.includes("torino")
  ) {
    return "it";
  }
  if (
    c.includes("france") ||
    c.includes("français") ||
    c === "fr" ||
    c.includes("paris") ||
    c.includes("lyon") ||
    c.includes("marseille")
  ) {
    return "fr";
  }
  if (
    c.includes("germany") ||
    c.includes("deutschland") ||
    c === "de" ||
    c.includes("berlin") ||
    c.includes("münchen") ||
    c.includes("frankfurt") ||
    c.includes("hamburg") ||
    c.includes("austria") ||
    c.includes("österreich")
  ) {
    return "de";
  }
  return "en";
}

export const CHASER_TEMPLATES: Record<ChaserRound, Record<ChaserLanguage, ChaserTemplate>> = {
  // Round 1: Gentle Bump (>48 hours without reply)
  1: {
    en: {
      subject: "Follow-Up: Sourcing Inquiry for {{product_name}} (Israel Market)",
      body: `Dear {{company_name}} Export Team,

I am following up on the sourcing inquiry we sent a couple of days ago regarding {{product_name}} for our buyer in Israel ({{specs_summary}}).

Could you please confirm if your sales department received our inquiry, and let us know if you can provide indicative pricing, available packaging formats, and MOQ?

👉 Fast 30-Second Quotation & Spec Portal:
{{portal_url}}

We look forward to hearing from you.`,
      whatsAppText: `Hello {{company_name}} team, following up on our sourcing inquiry for {{product_name}} (Ref: {{ref_tag}}). View buyer specs & submit quick quote here: {{portal_url}} — Thank you!`,
    },
    es: {
      subject: "Seguimiento: Solicitud de cotización para {{product_name}} (Mercado Israel)",
      body: `Estimado equipo de exportación de {{company_name}},

Les escribo para dar un cordial seguimiento a nuestra solicitud de información enviada hace unos días referente a {{product_name}} para nuestro cliente en Israel ({{specs_summary}}).

¿Podrían confirmarnos si han tenido oportunidad de revisar los requisitos y si tendrían disponibilidad para compartir precios orientativos, formatos de envasado y pedido mínimo (MOQ)?

👉 Portal de cotización rápida y especificaciones (30 seg):
{{portal_url}}

Quedamos a su entera disposición y a la espera de sus amables comentarios.`,
      whatsAppText: `Hola equipo de {{company_name}}, damos seguimiento a nuestra solicitud para {{product_name}} (Ref: {{ref_tag}}). Pueden revisar requisitos y cotizar en 30 seg aquí: {{portal_url}} — ¡Muchas gracias!`,
    },
    it: {
      subject: "Sollecito: Richiesta di offerta per {{product_name}} (Mercato Israele)",
      body: `Gentile team export di {{company_name}},

Facciamo seguito alla nostra richiesta di quotazione inviata nei giorni scorsi per la fornitura di {{product_name}} destinata al nostro cliente importatore in Israele ({{specs_summary}}).

Vi chiediamo cortesemente se avete avuto modo di verificare la disponibilità e se potete fornirci indicazioni su prezzi orientativi, formati di confezionamento e minimo d'ordine (MOQ).

👉 Portale rapido per offerta e schede tecniche:
{{portal_url}}

Restiamo a vostra disposizione in attesa di un vostro cortese riscontro.`,
      whatsAppText: `Gentile team di {{company_name}}, facciamo seguito alla richiesta per {{product_name}} (Rif: {{ref_tag}}). Potete verificare le specifiche e inviare offerta rapida qui: {{portal_url}} — Grazie!`,
    },
    fr: {
      subject: "Suivi: Demande de cotation pour {{product_name}} (Marché Israël)",
      body: `Chère équipe export de {{company_name}},

Je me permets de revenir vers vous suite à notre demande d'information concernant {{product_name}} pour notre acheteur en Israël ({{specs_summary}}).

Pourriez-vous nous confirmer la bonne réception de notre demande et nous indiquer si vous pouvez nous transmettre une offre indicative (prix, MOQ et conditionnement) ?

👉 Portail de cotation rapide et fiches techniques:
{{portal_url}}

Restant à votre entière disposition.`,
      whatsAppText: `Bonjour équipe {{company_name}}, suivi de notre demande pour {{product_name}} (Réf: {{ref_tag}}). Spécifications et cotation rapide ici: {{portal_url}} — Merci!`,
    },
    de: {
      subject: "Nachfassen: Ausschreibung für {{product_name}} (Markt Israel)",
      body: `Guten Tag Export-Team von {{company_name}},

wir möchten uns kurz bezüglich unserer Beschaffungsanfrage für {{product_name}} für unseren Kunden in Israel ({{specs_summary}}) erkundigen.

Könnten Sie uns kurz bestätigen, ob Sie exportbereit sind und uns indikative Richtpreise, Gebindegrößen und MOQ mitteilen?

👉 Schnelles Angebots- und Datenblatt-Portal:
{{portal_url}}

Vielen Dank für Ihre Rückmeldung.`,
      whatsAppText: `Guten Tag Team {{company_name}}, kurzes Nachfassen zu {{product_name}} (Ref: {{ref_tag}}). Details & schnelles Angebot hier: {{portal_url}} — Danke!`,
    },
  },

  // Round 2: Urgent Shortlist Call (>96 hours without reply)
  2: {
    en: {
      subject: "Urgent Follow-Up: Shortlist Finalization for {{product_name}}",
      body: `Dear {{company_name}} Export Team,

We are currently finalizing the shortlist of European manufacturers to present to our buyer's procurement board this week for {{product_name}}.

We strongly value {{company_name}}'s catalog fit and track record for this requirement ({{specs_summary}}). Please let us know by return if you wish to be included in this sourcing round, along with your indicative offer and available lead times.

👉 Submit Offer to Procurement Shortlist:
{{portal_url}}

Thank you for your prompt response.`,
      whatsAppText: `Urgent update for {{company_name}}: Finalizing manufacturer shortlist this week for {{product_name}} (Ref: {{ref_tag}}). Submit quick offer here: {{portal_url}} — Thank you!`,
    },
    es: {
      subject: "Urgente: Cierre de selección de proveedores para {{product_name}}",
      body: `Estimado equipo de exportación de {{company_name}},

Nos encontramos cerrando la selección final de fabricantes europeos que presentaremos esta semana a la mesa de compras de nuestro cliente para {{product_name}}.

Consideramos que el perfil y calidad de {{company_name}} encajan perfectamente con los requisitos solicitados ({{specs_summary}}). Les agradeceríamos confirmar a la brevedad si desean ser incluidos en esta licitación, facilitándonos su oferta indicativa y plazos de entrega.

👉 Incluir oferta en la selección de compra:
{{portal_url}}

Agradecemos de antemano su pronta atención.`,
      whatsAppText: `Aviso urgente {{company_name}}: Estamos cerrando la selección final para {{product_name}} (Ref: {{ref_tag}}). Pueden confirmar participación y precios aquí: {{portal_url}} — ¡Gracias!`,
    },
    it: {
      subject: "Urgente: Selezione finale fornitori per {{product_name}}",
      body: `Gentile team export di {{company_name}},

Stiamo definendo in questi giorni la rosa ristretta dei produttori europei da sottoporre alla direzione acquisti del nostro cliente per {{product_name}}.

Riteniamo che {{company_name}} possieda le credenziali ideali per questa fornitura ({{specs_summary}}). Vi preghiamo di confermarci al più presto se desiderate essere inclusi in questa selezione, inviandoci condizioni economiche e tempi di consegna.

👉 Inserimento offerta nella rosa acquisti:
{{portal_url}}

Ringraziamo per la consueta collaborazione.`,
      whatsAppText: `Aggiornamento urgente per {{company_name}}: Stiamo chiudendo la rosa fornitori per {{product_name}} (Rif: {{ref_tag}}). Inviate la vostra quotazione qui: {{portal_url}} — Grazie!`,
    },
    fr: {
      subject: "Urgent: Finalisation de la sélection fournisseurs pour {{product_name}}",
      body: `Chère équipe export de {{company_name}},

Nous finalisons actuellement la présélection des fabricants européens que nous soumettons cette semaine à la direction des achats pour {{product_name}}.

Le savoir-faire de {{company_name}} correspond aux exigences requises ({{specs_summary}}). Merci de nous indiquer rapidement si vous souhaitez être retenu avec votre offre de prix indicative.

👉 Portail de soumission directe:
{{portal_url}}

Merci d'avance pour votre réactivité.`,
      whatsAppText: `Avis urgent {{company_name}}: Clôture de la sélection pour {{product_name}} (Réf: {{ref_tag}}). Votre offre ici: {{portal_url}} — Merci!`,
    },
    de: {
      subject: "Dringend: Finale Lieferantenauswahl für {{product_name}}",
      body: `Guten Tag Export-Team von {{company_name}},

wir schließen diese Woche die Vorauswahl der europäischen Hersteller für das Einkaufsgremium unseres Kunden bezüglich {{product_name}} ab.

Das Sortiment von {{company_name}} passt ideal zu den Spezifikationen ({{specs_summary}}). Bitte teilen Sie uns kurzfristig mit, ob Sie mit einem Richtangebot berücksichtigt werden möchten.

👉 Angebot direkt einreichen:
{{portal_url}}

Vielen Dank für Ihre schnelle Rückmeldung.`,
      whatsAppText: `Dringend für {{company_name}}: Finalisierung der Shortlist für {{product_name}} (Ref: {{ref_tag}}). Angebot hier eingeben: {{portal_url}} — Danke!`,
    },
  },

  // Round 3: Final Call Before Tender Close (>144 hours without reply)
  3: {
    en: {
      subject: "Final Notice: Sourcing Tender Closing for {{product_name}}",
      body: `Dear {{company_name}} Export Team,

This is our final call regarding the sourcing project for {{product_name}} (Israel Market). The client review begins tomorrow, after which we will not be able to add new supplier proposals.

If you have export capacity and wish to participate, please submit your price and product datasheet today. Otherwise, we will keep your details on file for future sourcing rounds.

👉 Final Submission Window:
{{portal_url}}

Best regards,`,
      whatsAppText: `Final call for {{company_name}}: Sourcing round for {{product_name}} closes today (Ref: {{ref_tag}}). Submit quote here: {{portal_url}} — Thank you!`,
    },
    es: {
      subject: "Aviso Final: Cierre de convocatoria de compra para {{product_name}}",
      body: `Estimado equipo de exportación de {{company_name}},

Este es nuestro último aviso respecto al proyecto de suministro para {{product_name}} (Mercado Israel). La evaluación de propuestas con el comprador inicia mañana, momento tras el cual cerraremos la recepción de ofertas.

Si cuentan con capacidad exportadora y desean ser considerados, les rogamos nos faciliten hoy mismo su cotización y ficha técnica. En caso contrario, mantendremos su contacto para futuras oportunidades.

👉 Ventana final de envío de oferta:
{{portal_url}}

Atentamente,`,
      whatsAppText: `Último aviso para {{company_name}}: Cerramos hoy la recepción de ofertas para {{product_name}} (Ref: {{ref_tag}}). Enlace directo: {{portal_url}} — ¡Saludos!`,
    },
    it: {
      subject: "Ultimo Sollecito: Chiusura selezione per {{product_name}}",
      body: `Gentile team export di {{company_name}},

Questo è il nostro ultimo avviso in merito al progetto di fornitura per {{product_name}} (Mercato Israele). La valutazione finale con il buyer si terrà domani, termine ultimo per l'inserimento delle offerte.

Se avete disponibilità e desiderate partecipare, vi preghiamo di inviarci la vostra migliore offerta entro oggi. In alternativa, conserveremo i vostri riferimenti per future commesse.

👉 Ultima possibilità di invio offerta:
{{portal_url}}

Cordiali saluti,`,
      whatsAppText: `Ultimo sollecito per {{company_name}}: La selezione per {{product_name}} chiude oggi (Rif: {{ref_tag}}). Invia qui: {{portal_url}} — Grazie!`,
    },
    fr: {
      subject: "Dernier Avis: Clôture de l'appel d'offres pour {{product_name}}",
      body: `Chère équipe export de {{company_name}},

Ceci est notre dernier appel concernant le dossier {{product_name}} (Marché Israël). La revue finale avec la centrale d'achats se tient demain.

Si vous disposez de capacités et souhaitez participer, merci de transmettre votre offre et fiche technique aujourd'hui.

👉 Soumission de dernière minute:
{{portal_url}}

Cordialement,`,
      whatsAppText: `Dernier appel pour {{company_name}}: Clôture aujourd'hui pour {{product_name}} (Réf: {{ref_tag}}). Offre: {{portal_url}} — Merci!`,
    },
    de: {
      subject: "Letzter Aufruf: Abschluss der Ausschreibung für {{product_name}}",
      body: `Guten Tag Export-Team von {{company_name}},

dies ist unser letzter Aufruf für das Beschaffungsprojekt {{product_name}} (Markt Israel). Die finale Entscheidung mit dem Einkäufer findet morgen statt.

Falls Sie Kapazitäten haben und teilnehmen möchten, bitten wir um Übermittlung Ihres Angebots bis heute Abend.

👉 Letzte Angebotsabgabe:
{{portal_url}}

Mit freundlichen Grüßen,`,
      whatsAppText: `Letzter Aufruf {{company_name}}: Runde für {{product_name}} schließt heute (Ref: {{ref_tag}}). Hier abgeben: {{portal_url}} — Danke!`,
    },
  },
};

export interface FollowUpUrgencyAssessment {
  isEligible: boolean;
  isDue: boolean;
  hoursElapsed: number;
  daysElapsed: number;
  recommendedRound: ChaserRound;
  followUpCount: number;
  lastFollowUpAt: string | null;
  urgency: "none" | "gentle" | "urgent" | "critical";
  badgeText: string;
  badgeClass: string;
}

export function evaluateFollowUpUrgency(match: {
  status: string;
  sent_at?: string | null;
  match_breakdown?: Record<string, unknown> | null;
}): FollowUpUrgencyAssessment {
  const s = match.status;
  const isPendingReply = s === "sent" || s === "rfq_sent";

  if (!isPendingReply || !match.sent_at) {
    return {
      isEligible: false,
      isDue: false,
      hoursElapsed: 0,
      daysElapsed: 0,
      recommendedRound: 1,
      followUpCount: 0,
      lastFollowUpAt: null,
      urgency: "none",
      badgeText: "",
      badgeClass: "",
    };
  }

  const breakdown = match.match_breakdown ?? {};
  const followUpCount =
    typeof breakdown.followup_count === "number"
      ? breakdown.followup_count
      : typeof breakdown.follow_up_count === "number"
      ? breakdown.follow_up_count
      : Array.isArray(breakdown.follow_ups)
      ? breakdown.follow_ups.length
      : 0;

  const lastFollowUpAt =
    typeof breakdown.last_follow_up_at === "string"
      ? breakdown.last_follow_up_at
      : Array.isArray(breakdown.follow_ups) && breakdown.follow_ups.length > 0
      ? (breakdown.follow_ups[breakdown.follow_ups.length - 1]?.date as string)
      : null;

  const baselineTime = lastFollowUpAt
    ? new Date(lastFollowUpAt).getTime()
    : new Date(match.sent_at).getTime();

  const now = Date.now();
  const msElapsed = Math.max(0, now - baselineTime);
  const hoursElapsed = Math.floor(msElapsed / 3600000);
  const daysElapsed = Math.floor(hoursElapsed / 24);

  // Cadence rules
  let isDue = false;
  let recommendedRound: ChaserRound = 1;
  let urgency: "none" | "gentle" | "urgent" | "critical" = "none";
  let badgeText = "";
  let badgeClass = "";

  if (followUpCount === 0) {
    if (hoursElapsed >= 48) {
      isDue = true;
      recommendedRound = 1;
      urgency = "gentle";
      badgeText = `Round 1 Due (${daysElapsed}d silent)`;
      badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
    } else {
      badgeText = `Sent ${daysElapsed === 0 ? "today" : `${daysElapsed}d ago`}`;
      badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
    }
  } else if (followUpCount === 1) {
    if (hoursElapsed >= 48) {
      isDue = true;
      recommendedRound = 2;
      urgency = "urgent";
      badgeText = `Round 2 Shortlist Due (${daysElapsed}d silent)`;
      badgeClass = "bg-orange-100 text-orange-800 border-orange-300";
    } else {
      badgeText = `Round 1 sent · Waiting`;
      badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    }
  } else if (followUpCount >= 2) {
    if (hoursElapsed >= 48) {
      isDue = true;
      recommendedRound = 3;
      urgency = "critical";
      badgeText = `Round 3 Tender Close Due`;
      badgeClass = "bg-red-100 text-red-800 border-red-300 animate-pulse";
    } else {
      badgeText = `Round ${followUpCount} sent`;
      badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
    }
  }

  return {
    isEligible: true,
    isDue,
    hoursElapsed,
    daysElapsed,
    recommendedRound,
    followUpCount,
    lastFollowUpAt,
    urgency,
    badgeText,
    badgeClass,
  };
}
