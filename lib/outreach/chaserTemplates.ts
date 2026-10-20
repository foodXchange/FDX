export type ChaserLanguage = "en" | "es" | "it";
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

We look forward to hearing from you.`,
      whatsAppText: `Hello {{company_name}} team, following up on our sourcing inquiry for {{product_name}} (Ref: {{ref_tag}}). Could you please let us know if you have export availability and indicative pricing? Thank you!`,
    },
    es: {
      subject: "Seguimiento: Solicitud de cotización para {{product_name}} (Mercado Israel)",
      body: `Estimado equipo de exportación de {{company_name}},

Les escribo para dar un cordial seguimiento a nuestra solicitud de información enviada hace unos días referente a {{product_name}} para nuestro cliente en Israel ({{specs_summary}}).

¿Podrían confirmarnos si han tenido oportunidad de revisar los requisitos y si tendrían disponibilidad para compartir precios orientativos, formatos de envasado y pedido mínimo (MOQ)?

Quedamos a su entera disposición y a la espera de sus amables comentarios.`,
      whatsAppText: `Hola equipo de {{company_name}}, damos seguimiento a nuestra solicitud para {{product_name}} (Ref: {{ref_tag}}). ¿Tendrían disponibilidad para cotizarnos precio orientativo y MOQ? ¡Muchas gracias!`,
    },
    it: {
      subject: "Sollecito: Richiesta di offerta per {{product_name}} (Mercato Israele)",
      body: `Gentile team export di {{company_name}},

Facciamo seguito alla nostra richiesta di quotazione inviata nei giorni scorsi per la fornitura di {{product_name}} destinata al nostro cliente importatore in Israele ({{specs_summary}}).

Vi chiediamo cortesemente se avete avuto modo di verificare la disponibilità e se potete fornirci indicazioni su prezzi orientativi, formati di confezionamento e minimo d'ordine (MOQ).

Restiamo a vostra disposizione in attesa di un vostro cortese riscontro.`,
      whatsAppText: `Gentile team di {{company_name}}, facciamo seguito alla richiesta per {{product_name}} (Rif: {{ref_tag}}). Avete disponibilità e quotazione indicativa? Grazie mille!`,
    },
  },

  // Round 2: Urgent Shortlist Call (>96 hours without reply)
  2: {
    en: {
      subject: "Urgent Follow-Up: Shortlist Finalization for {{product_name}}",
      body: `Dear {{company_name}} Export Team,

We are currently finalizing the shortlist of European manufacturers to present to our buyer's procurement board this week for {{product_name}}.

We strongly value {{company_name}}'s catalog fit and track record for this requirement ({{specs_summary}}). Please let us know by return if you wish to be included in this sourcing round, along with your indicative offer and available lead times.

Thank you for your prompt response.`,
      whatsAppText: `Urgent update for {{company_name}}: We are finalizing our manufacturer shortlist this week for {{product_name}} (Ref: {{ref_tag}}). Please confirm if you wish to submit an offer. Thank you!`,
    },
    es: {
      subject: "Urgente: Cierre de selección de proveedores para {{product_name}}",
      body: `Estimado equipo de exportación de {{company_name}},

Nos encontramos cerrando la selección final de fabricantes europeos que presentaremos esta semana a la mesa de compras de nuestro cliente para {{product_name}}.

Consideramos que el perfil y calidad de {{company_name}} encajan perfectamente con los requisitos solicitados ({{specs_summary}}). Les agradeceríamos confirmar a la brevedad si desean ser incluidos en esta licitación, facilitándonos su oferta indicativa y plazos de entrega.

Agradecemos de antemano su pronta atención.`,
      whatsAppText: `Aviso urgente {{company_name}}: Estamos cerrando la selección de proveedores esta semana para {{product_name}} (Ref: {{ref_tag}}). ¿Desean participar con su oferta indicativa? ¡Gracias!`,
    },
    it: {
      subject: "Urgente: Selezione finale fornitori per {{product_name}}",
      body: `Gentile team export di {{company_name}},

Stiamo definendo in questi giorni la rosa ristretta dei produttori europei da sottoporre alla direzione acquisti del nostro cliente per {{product_name}}.

Riteniamo che {{company_name}} possieda le credenziali ideali per questa fornitura ({{specs_summary}}). Vi preghiamo di confermarci al più presto se desiderate essere inclusi in questa selezione, inviandoci condizioni economiche e tempi di consegna.

Ringraziamo per la consueta collaborazione.`,
      whatsAppText: `Aggiornamento urgente per {{company_name}}: Stiamo chiudendo la selezione fornitori per {{product_name}} (Rif: {{ref_tag}}). Ci confermate il vostro interesse a quotare? Grazie!`,
    },
  },

  // Round 3: Final Call Before Tender Close (>144 hours without reply)
  3: {
    en: {
      subject: "Final Notice: Sourcing Tender Closing for {{product_name}}",
      body: `Dear {{company_name}} Export Team,

This is our final call regarding the sourcing project for {{product_name}} (Israel Market). The client review begins tomorrow, after which we will not be able to add new supplier proposals.

If you have export capacity and wish to participate, please reply with your price and product datasheet today. Otherwise, we will keep your details on file for future sourcing rounds.

Best regards,`,
      whatsAppText: `Final call for {{company_name}}: Sourcing round for {{product_name}} closes today (Ref: {{ref_tag}}). Please let us know if you can supply. Thank you!`,
    },
    es: {
      subject: "Aviso Final: Cierre de convocatoria de compra para {{product_name}}",
      body: `Estimado equipo de exportación de {{company_name}},

Este es nuestro último aviso respecto al proyecto de suministro para {{product_name}} (Mercado Israel). La evaluación de propuestas con el comprador inicia mañana, momento tras el cual cerraremos la recepción de ofertas.

Si cuentan con capacidad exportadora y desean ser considerados, les rogamos nos respondan hoy mismo con su cotización y ficha técnica. En caso contrario, mantendremos su contacto para futuras oportunidades.

Atentamente,`,
      whatsAppText: `Último aviso para {{company_name}}: Cerramos hoy la recepción de ofertas para {{product_name}} (Ref: {{ref_tag}}). Por favor confírmennos si participan. ¡Saludos!`,
    },
    it: {
      subject: "Ultimo Sollecito: Chiusura selezione per {{product_name}}",
      body: `Gentile team export di {{company_name}},

Questo è il nostro ultimo avviso in merito al progetto di fornitura per {{product_name}} (Mercato Israele). La valutazione finale con il buyer si terrà domani, termine ultimo per l'inserimento delle offerte.

Se avete disponibilità e desiderate partecipare, vi preghiamo di inviarci la vostra migliore offerta entro oggi. In alternativa, conserveremo i vostri riferimenti per future commesse.

Cordiali saluti,`,
      whatsAppText: `Ultimo sollecito per {{company_name}}: La selezione per {{product_name}} chiude oggi (Rif: {{ref_tag}}). Fateci sapere se volete inviare un'offerta. Grazie!`,
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
      : typeof breakdown.last_outreach_at === "string" && followUpCount > 0
      ? breakdown.last_outreach_at
      : null;

  // Measure time since the MOST RECENT communication (either initial RFQ or last follow-up)
  const referenceTimestamp = lastFollowUpAt || match.sent_at;
  const elapsedMs = Math.max(0, Date.now() - new Date(referenceTimestamp).getTime());
  const hoursElapsed = Math.floor(elapsedMs / (1000 * 60 * 60));
  const daysElapsed = Math.floor(hoursElapsed / 24);

  // Total time since original RFQ was sent
  const originalElapsedMs = Math.max(0, Date.now() - new Date(match.sent_at).getTime());
  const totalHoursElapsed = Math.floor(originalElapsedMs / (1000 * 60 * 60));

  let recommendedRound: ChaserRound = 1;
  let urgency: "none" | "gentle" | "urgent" | "critical" = "none";
  let isDue = false;
  let badgeText = "";
  let badgeClass = "";

  if (followUpCount === 0) {
    if (totalHoursElapsed >= 96) {
      isDue = true;
      recommendedRound = 2;
      urgency = "urgent";
      badgeText = `⚠️ Follow-up Due (${Math.floor(totalHoursElapsed / 24)}d stalled)`;
      badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
    } else if (totalHoursElapsed >= 48) {
      isDue = true;
      recommendedRound = 1;
      urgency = "gentle";
      badgeText = `⏰ Follow-up Due (${Math.floor(totalHoursElapsed / 24)}d ago)`;
      badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    } else {
      isDue = false;
      urgency = "none";
      badgeText = `Sent ${totalHoursElapsed}h ago`;
      badgeClass = "bg-slate-50 text-slate-600 border-slate-200";
    }
  } else if (followUpCount === 1) {
    if (hoursElapsed >= 48 || totalHoursElapsed >= 96) {
      isDue = true;
      recommendedRound = 2;
      urgency = "urgent";
      badgeText = `⚡ 2nd Follow-up Due (Reminder #1 sent ${daysElapsed}d ago)`;
      badgeClass = "bg-orange-100 text-orange-800 border-orange-300";
    } else {
      isDue = false;
      urgency = "gentle";
      badgeText = `📨 Reminder #1 sent (${daysElapsed === 0 ? "today" : `${daysElapsed}d ago`})`;
      badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
    }
  } else {
    // 2 or more follow-ups sent
    if (hoursElapsed >= 48) {
      isDue = true;
      recommendedRound = 3;
      urgency = "critical";
      badgeText = `🚨 Final Chaser Due (${followUpCount} reminders sent)`;
      badgeClass = "bg-rose-100 text-rose-800 border-rose-300";
    } else {
      isDue = false;
      urgency = "urgent";
      badgeText = `📨 Reminder #${followUpCount} sent (${daysElapsed === 0 ? "today" : `${daysElapsed}d ago`})`;
      badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
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
