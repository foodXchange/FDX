export type SupplierPortalLanguage = "en" | "es" | "it" | "fr" | "de";

export interface SupplierPortalTranslation {
  deskSubtitle: string;
  inquiryTitle: string;
  confidentialBadge: string;
  refLabel: string;
  buyerBriefTitle: string;
  targetProductLabel: string;
  catalogMatchLabel: string;
  benchmarkLabel: string;
  volumePackLabel: string;
  certificationsLabel: string;
  briefAndSpecsLabel: string;
  
  formTitle: string;
  formSubtitle: string;
  previousResponseNote: string;
  
  // Section 1
  sec1Title: string;
  canSupplyTitle: string;
  canSupplyDesc: string;
  similarOptionTitle: string;
  similarOptionDesc: string;
  cannotSupplyTitle: string;
  cannotSupplyDesc: string;

  // Section 2
  sec2Title: string;
  unitPriceLabel: string;
  currencyLabel: string;
  priceBasisLabel: string;
  incotermLabel: string;
  moqLabel: string;
  moqPlaceholder: string;
  leadTimeLabel: string;
  leadTimePlaceholder: string;
  paymentTermsLabel: string;

  // Section 3
  sec3Title: string;
  netWeightLabel: string;
  netWeightPlaceholder: string;
  packagingFormatLabel: string;
  packagingFormatPlaceholder: string;
  unitsPerCaseLabel: string;
  casesPerPalletLabel: string;
  shelfLifeLabel: string;
  brandingLabel: string;
  brandingBoth: string;
  brandingPrivateLabelOnly: string;
  brandingProducerOnly: string;

  // Section 4
  sec4Title: string;
  sec4Subtitle: string;

  // Section 5
  sec5Title: string;
  sec5Subtitle: string;
  uploadButton: string;
  uploading: string;
  uploadedFilesLabel: string;
  removeFile: string;

  // Section 6
  sec6Title: string;
  sampleStatusLabel: string;
  sampleReady: string;
  sampleDispatched: string;
  sampleOnPriceAlignment: string;
  sampleDigitalOnly: string;
  courierServiceLabel: string;
  courierAwbLabel: string;
  courierAwbPlaceholder: string;
  dispatchDateLabel: string;

  // Section 7
  sec7Title: string;
  contactNameLabel: string;
  contactNamePlaceholder: string;
  contactEmailLabel: string;
  contactPhoneLabel: string;
  notesLabel: string;
  notesPlaceholder: string;

  // Action
  submitButton: string;
  submittingButton: string;
  
  // Success
  thankYouTitle: string;
  thankYouMessage: string;
  updateResponseButton: string;
  contactDeskWhatsapp: string;
}

export const SUPPLIER_PORTAL_TRANSLATIONS: Record<SupplierPortalLanguage, SupplierPortalTranslation> = {
  en: {
    deskSubtitle: "FoodXchange · Direct Sourcing Desk",
    inquiryTitle: "Commercial Inquiry & Specification Request",
    confidentialBadge: "Direct Sourcing RFQ",
    refLabel: "Ref:",
    buyerBriefTitle: "Target Buyer Requirement & Technical Brief",
    targetProductLabel: "Requested Product:",
    catalogMatchLabel: "Matched with your export line:",
    benchmarkLabel: "Benchmark Profile:",
    volumePackLabel: "Volume / Packaging:",
    certificationsLabel: "Required Certifications:",
    briefAndSpecsLabel: "Procurement Brief & Instructions:",

    formTitle: "Submit Your Export Quotation & Technical Specs",
    formSubtitle: "Takes ~60 seconds. Review specifications, enter export pricing & MOQ, attach data sheets, or confirm sample dispatch.",
    previousResponseNote: "Previous offer on file: You have already submitted a response to this inquiry. Submitting below will update your offer.",

    sec1Title: "1. Supply Capability & Availability",
    canSupplyTitle: "✅ Can Supply (Exact Match)",
    canSupplyDesc: "We produce or supply this exact specification",
    similarOptionTitle: "🔄 Alternative Specification",
    similarOptionDesc: "We offer a close alternative format, recipe, or size",
    cannotSupplyTitle: "❌ Cannot Supply",
    cannotSupplyDesc: "No export capacity or out of scope currently",

    sec2Title: "2. Commercial Pricing & Delivery Terms",
    unitPriceLabel: "Indicative Export Price",
    currencyLabel: "Currency",
    priceBasisLabel: "Unit of Measure",
    incotermLabel: "Delivery Term (Incoterms 2020)",
    moqLabel: "Minimum Order Quantity (MOQ)",
    moqPlaceholder: "e.g. 1 x 40ft HQ FCL / 5 pallets / 10,000 pcs",
    leadTimeLabel: "Production Lead Time",
    leadTimePlaceholder: "e.g. 3–4 weeks from order",
    paymentTermsLabel: "Preferred Payment Terms",

    sec3Title: "3. Packaging & Logistics Specifications",
    netWeightLabel: "Net Weight / Volume per Unit",
    netWeightPlaceholder: "e.g. 1L, 400g, 500ml",
    packagingFormatLabel: "Primary Packaging Format",
    packagingFormatPlaceholder: "e.g. Glass Bottle, Tetra Pak, Tin Can, Pouch",
    unitsPerCaseLabel: "Units per Master Case",
    casesPerPalletLabel: "Master Cases per Pallet",
    shelfLifeLabel: "Shelf Life (Months)",
    brandingLabel: "Branding Capability",
    brandingBoth: "Both Private Label & Factory Brand",
    brandingPrivateLabelOnly: "Private Label Only (OEM / Store Brand)",
    brandingProducerOnly: "Factory Brand Only",

    sec4Title: "4. Quality & Compliance Certifications",
    sec4Subtitle: "Select all certified standards applicable to this production line:",

    sec5Title: "5. Technical Data Sheet (TDS) & Certificates",
    sec5Subtitle: "Upload your product specification sheet, analysis report, or quality certificates (PDF, PNG, JPG):",
    uploadButton: "📎 Attach Spec Sheet / Certificate (PDF/Image)",
    uploading: "Uploading file…",
    uploadedFilesLabel: "Attached Documents:",
    removeFile: "Remove",

    sec6Title: "6. Courier Tasting / Evaluation Samples",
    sampleStatusLabel: "Sample Availability & Courier Dispatch",
    sampleReady: "Yes — Tasting samples ready to dispatch immediately",
    sampleDispatched: "Already dispatched via courier to Tel Aviv",
    sampleOnPriceAlignment: "Available after initial commercial alignment",
    sampleDigitalOnly: "Digital specifications first",
    courierServiceLabel: "Courier Service",
    courierAwbLabel: "Air Waybill (AWB) Tracking Number",
    courierAwbPlaceholder: "e.g. DHL 1234567890 / FedEx 987654321",
    dispatchDateLabel: "Dispatch / Shipping Date",

    sec7Title: "7. Direct Export Contact & Notes",
    contactNameLabel: "Export Manager Name",
    contactNamePlaceholder: "Your full name",
    contactEmailLabel: "Direct Email Address",
    contactPhoneLabel: "Direct Phone / WhatsApp",
    notesLabel: "Additional Notes / Technical Comments",
    notesPlaceholder: "Share palletization, shelf life, recipe details, or paste a link to your online catalog...",

    submitButton: "Submit Commercial Offer to FoodXchange →",
    submittingButton: "Submitting Offer…",

    thankYouTitle: "Thank you for your commercial proposal!",
    thankYouMessage: "Your quotation and technical details have been received directly by the FoodXchange Sourcing Desk. We will review your proposal with the buyer's procurement board and contact you promptly.",
    updateResponseButton: "Update or edit submitted offer",
    contactDeskWhatsapp: "Contact Sourcing Desk via WhatsApp",
  },

  es: {
    deskSubtitle: "FoodXchange · Mesa Directa de Suministro Internacional",
    inquiryTitle: "Solicitud Comercial y Requisitos Técnicos",
    confidentialBadge: "RFQ Directo y Confidencial",
    refLabel: "Ref:",
    buyerBriefTitle: "Requerimientos del Comprador y Ficha Técnica",
    targetProductLabel: "Producto Solicitado:",
    catalogMatchLabel: "Vinculado a su línea de producción:",
    benchmarkLabel: "Perfil de Referencia:",
    volumePackLabel: "Volumen / Envasado:",
    certificationsLabel: "Certificaciones Requeridas:",
    briefAndSpecsLabel: "Instrucciones de Aprovisionamiento:",

    formTitle: "Presentar Oferta de Exportación y Ficha Técnica",
    formSubtitle: "Completar toma ~60 segundos. Revise requisitos, indique precio y MOQ, adjunte fichas técnicas o confirme envío de muestras.",
    previousResponseNote: "Propuesta anterior en archivo: Ya ha enviado una respuesta a esta solicitud. Enviar nuevamente actualizará su oferta.",

    sec1Title: "1. Capacidad de Suministro y Disponibilidad",
    canSupplyTitle: "✅ Podemos Suministrar (Exacto)",
    canSupplyDesc: "Fabricamos o suministramos esta especificación exacta",
    similarOptionTitle: "🔄 Especificación Alternativa",
    similarOptionDesc: "Disponemos de un formato, receta o tamaño muy similar",
    cannotSupplyTitle: "❌ No Disponible",
    cannotSupplyDesc: "Sin capacidad de exportación o fuera de catálogo actual",

    sec2Title: "2. Cotización Comercial y Condiciones de Entrega",
    unitPriceLabel: "Precio Indicativo de Exportación",
    currencyLabel: "Moneda",
    priceBasisLabel: "Unidad de Medida",
    incotermLabel: "Término de Entrega (Incoterms 2020)",
    moqLabel: "Pedido Mínimo (MOQ)",
    moqPlaceholder: "Ej: 1 x contenedor 40' / 5 pallets / 10.000 uds",
    leadTimeLabel: "Plazo de Fabricación y Entrega",
    leadTimePlaceholder: "Ej: 3–4 semanas desde confirmación",
    paymentTermsLabel: "Condiciones de Pago Preferidas",

    sec3Title: "3. Envasado y Especificaciones Logísticas",
    netWeightLabel: "Peso Neto / Volumen por Unidad",
    netWeightPlaceholder: "Ej: 1L, 400g, 500ml",
    packagingFormatLabel: "Formato de Envase Primario",
    packagingFormatPlaceholder: "Ej: Botella de vidrio, Tetra Pak, Lata, Bolsa",
    unitsPerCaseLabel: "Unidades por Caja Máster",
    casesPerPalletLabel: "Cajas por Palet",
    shelfLifeLabel: "Vida Útil (Meses)",
    brandingLabel: "Modalidad de Marca",
    brandingBoth: "Tanto Marca Propia como Marca del Fabricante",
    brandingPrivateLabelOnly: "Marca del Distribuidor Únicamente (MDD / Private Label)",
    brandingProducerOnly: "Marca del Fabricante Únicamente",

    sec4Title: "4. Calidad y Certificaciones de Cumplimiento",
    sec4Subtitle: "Seleccione todas las certificaciones vigentes en su planta:",

    sec5Title: "5. Ficha Técnica (TDS) y Certificados",
    sec5Subtitle: "Adjunte su ficha técnica de producto, analítica o certificados de calidad (PDF, PNG, JPG):",
    uploadButton: "📎 Adjuntar Ficha Técnica / Certificado (PDF o Imagen)",
    uploading: "Subiendo documento…",
    uploadedFilesLabel: "Documentos Adjuntos:",
    removeFile: "Eliminar",

    sec6Title: "6. Muestras para Cata y Evaluación",
    sampleStatusLabel: "Disponibilidad de Muestras y Envío por Courier",
    sampleReady: "Sí — Muestras listas para despacho inmediato por courier",
    sampleDispatched: "Ya enviadas por courier con destino a Tel Aviv",
    sampleOnPriceAlignment: "Disponibles tras acuerdo comercial preliminar",
    sampleDigitalOnly: "Ficha técnica y catálogo digital primero",
    courierServiceLabel: "Empresa de Courier",
    courierAwbLabel: "Número de Seguimiento AWB (Guía Aérea)",
    courierAwbPlaceholder: "Ej: DHL 1234567890 / FedEx 987654321",
    dispatchDateLabel: "Fecha de Envío",

    sec7Title: "7. Contacto Directo de Exportación",
    contactNameLabel: "Nombre del Responsable de Exportación",
    contactNamePlaceholder: "Nombre completo",
    contactEmailLabel: "Correo Electrónico Directo",
    contactPhoneLabel: "Teléfono / WhatsApp de Contacto",
    notesLabel: "Comentarios Adicionales / Notas Técnicas",
    notesPlaceholder: "Comparta paletización, vida útil, receta o enlace a su catálogo web...",

    submitButton: "Enviar Oferta Comercial a FoodXchange →",
    submittingButton: "Enviando Oferta…",

    thankYouTitle: "¡Muchas gracias por su propuesta comercial!",
    thankYouMessage: "Su cotización y especificaciones técnicas han sido recibidas por la mesa de compras de FoodXchange. Analizaremos su propuesta con el cliente importador y nos comunicaremos en breve.",
    updateResponseButton: "Actualizar o modificar la oferta enviada",
    contactDeskWhatsapp: "Contactar con la Mesa de Compras vía WhatsApp",
  },

  it: {
    deskSubtitle: "FoodXchange · Ufficio Acquisti e Import-Export",
    inquiryTitle: "Richiesta di Offerta Commerciale e Specifiche Tecniche",
    confidentialBadge: "RFQ Riservata Fornitori",
    refLabel: "Rif:",
    buyerBriefTitle: "Requisiti del Buyer e Specifiche Richieste",
    targetProductLabel: "Prodotto Richiesto:",
    catalogMatchLabel: "Abbinato alla vostra linea di produzione:",
    benchmarkLabel: "Prodotto di Riferimento:",
    volumePackLabel: "Volume / Confezionamento:",
    certificationsLabel: "Certificazioni Richieste:",
    briefAndSpecsLabel: "Istruzioni di Approvvigionamento:",

    formTitle: "Invia Quotazione di Esportazione e Scheda Tecnica",
    formSubtitle: "Richiede ~60 secondi. Verificate i requisiti, indicate prezzo e MOQ, allegate le schede tecniche o confermate l'invio campioni.",
    previousResponseNote: "Risposta precedente in archivio: Avete già risposto a questa richiesta. Inviare di nuovo aggiornerà la vostra quotazione.",

    sec1Title: "1. Capacità Produttiva e Disponibilità",
    canSupplyTitle: "✅ Possiamo Fornire (Esatto)",
    canSupplyDesc: "Produciamo o forniamo esattamente questa specifica",
    similarOptionTitle: "🔄 Prodotto Alternativo",
    similarOptionDesc: "Offriamo un formato, ricetta o peso molto simile",
    cannotSupplyTitle: "❌ Non Disponibile",
    cannotSupplyDesc: "Nessuna disponibilità o prodotto fuori catalogo",

    sec2Title: "2. Condizioni Economiche e Termini di Consegna",
    unitPriceLabel: "Prezzo Indicativo Export",
    currencyLabel: "Valuta",
    priceBasisLabel: "Unità di Misura",
    incotermLabel: "Resa di Consegna (Incoterms 2020)",
    moqLabel: "Minimo d'Ordine (MOQ)",
    moqPlaceholder: "Es: 1 container 40' / 5 pallet / 10.000 pz",
    leadTimeLabel: "Tempi di Produzione",
    leadTimePlaceholder: "Es: 3–4 settimane dalla conferma",
    paymentTermsLabel: "Condizioni di Pagamento",

    sec3Title: "3. Packaging e Specifiche Logistiche",
    netWeightLabel: "Peso Netto / Volume per Unità",
    netWeightPlaceholder: "Es: 1L, 400g, 500ml",
    packagingFormatLabel: "Formato Packaging Primario",
    packagingFormatPlaceholder: "Es: Bottiglia di vetro, Tetra Pak, Lattina, Busta",
    unitsPerCaseLabel: "Pezzi per Cartone",
    casesPerPalletLabel: "Cartoni per Pallet",
    shelfLifeLabel: "Shelf Life (Mesi)",
    brandingLabel: "Opzione Marchio",
    brandingBoth: "Sia Private Label che Marchio Proprio",
    brandingPrivateLabelOnly: "Solo Private Label (Marchio del Distributore)",
    brandingProducerOnly: "Solo Marchio di Fabbrica",

    sec4Title: "4. Qualità e Certificazioni Alimentari",
    sec4Subtitle: "Selezionate tutte le certificazioni attive presso il vostro stabilimento:",

    sec5Title: "5. Scheda Tecnica di Prodotto (TDS) e Certificati",
    sec5Subtitle: "Caricate la scheda tecnica di prodotto, analisi di laboratorio o certificazioni (PDF, PNG, JPG):",
    uploadButton: "📎 Allega Scheda Tecnica / Certificato (PDF/Immagine)",
    uploading: "Caricamento in corso…",
    uploadedFilesLabel: "Documenti Allegati:",
    removeFile: "Rimuovi",

    sec6Title: "6. Campionatura per Degustazione e Valutazione",
    sampleStatusLabel: "Disponibilità Campioni e Spedizione Corriere",
    sampleReady: "Sì — Campioni pronti per il ritiro immediato via corriere",
    sampleDispatched: "Già spediti via corriere a Tel Aviv",
    sampleOnPriceAlignment: "Disponibili dopo allineamento sui prezzi",
    sampleDigitalOnly: "Solo scheda tecnica digitale al momento",
    courierServiceLabel: "Corriere Espresso",
    courierAwbLabel: "Numero di Tracciamento AWB (Lettera di Vettura)",
    courierAwbPlaceholder: "Es: DHL 1234567890 / FedEx 987654321",
    dispatchDateLabel: "Data di Spedizione",

    sec7Title: "7. Contatto Diretto Export e Note",
    contactNameLabel: "Nome del Responsabile Export",
    contactNamePlaceholder: "Nome e cognome",
    contactEmailLabel: "Email Diretta",
    contactPhoneLabel: "Telefono / WhatsApp",
    notesLabel: "Note Aggiuntive / Dettagli Tecnici",
    notesPlaceholder: "Condividete dettagli di pallettizzazione, shelf life, ricetta o link al catalogo online...",

    submitButton: "Invia Offerta Commerciale a FoodXchange →",
    submittingButton: "Invio Offerta in corso…",

    thankYouTitle: "Grazie per la vostra proposta commerciale!",
    thankYouMessage: "La vostra offerta e le specifiche tecniche sono state trasmesse all'ufficio acquisti di FoodXchange. Valuteremo la proposta con la direzione acquisti del cliente e vi aggiorneremo prontamente.",
    updateResponseButton: "Modifica o aggiorna l'offerta inviata",
    contactDeskWhatsapp: "Contatta l'ufficio acquisti su WhatsApp",
  },

  fr: {
    deskSubtitle: "FoodXchange · Pôle Sourcing & Export International",
    inquiryTitle: "Demande Commerciale et Spécifications Techniques",
    confidentialBadge: "Appel d'Offres Direct & Confidentiel",
    refLabel: "Réf:",
    buyerBriefTitle: "Cahier des Charges de l'Acheteur & Fiche Produit",
    targetProductLabel: "Produit Demandé:",
    catalogMatchLabel: "Associé à votre gamme d'exportation:",
    benchmarkLabel: "Produit de Référence:",
    volumePackLabel: "Volume / Conditionnement:",
    certificationsLabel: "Certifications Requises:",
    briefAndSpecsLabel: "Instructions d'Approvisionnement:",

    formTitle: "Soumettre Votre Offre Commerciale et Fiche Technique",
    formSubtitle: "Prend environ 60 secondes. Vérifiez les exigences, indiquez vos prix et MOQ, joignez vos fiches techniques ou confirmez l'envoi d'échantillons.",
    previousResponseNote: "Offre précédente enregistrée: Vous avez déjà répondu à cette demande. Une nouvelle soumission mettra à jour votre offre.",

    sec1Title: "1. Capacité de Fourniture & Disponibilité",
    canSupplyTitle: "✅ Nous Pouvons Fournir (Conforme)",
    canSupplyDesc: "Nous fabriquons ou fournissons exactement cette référence",
    similarOptionTitle: "🔄 Référence Alternative",
    similarOptionDesc: "Nous proposons un format, recette ou grammage équivalent",
    cannotSupplyTitle: "❌ Non Disponible",
    cannotSupplyDesc: "Pas de capacité disponible ou hors catalogue",

    sec2Title: "2. Tarification Export & Conditions de Vente",
    unitPriceLabel: "Prix Export Indicatif",
    currencyLabel: "Devise",
    priceBasisLabel: "Unité de Facturation",
    incotermLabel: "Incoterm de Livraison (Incoterms 2020)",
    moqLabel: "Quantité Minimum de Commande (MOQ)",
    moqPlaceholder: "Ex: 1 conteneur 40' / 5 palettes / 10 000 pièces",
    leadTimeLabel: "Délai de Fabrication",
    leadTimePlaceholder: "Ex: 3 à 4 semaines dès confirmation",
    paymentTermsLabel: "Conditions de Règlement Souhaitées",

    sec3Title: "3. Conditionnement & Données Logistiques",
    netWeightLabel: "Poids Net / Volume Unitaire",
    netWeightPlaceholder: "Ex: 1L, 400g, 500ml",
    packagingFormatLabel: "Format d'Emballage Primaire",
    packagingFormatPlaceholder: "Ex: Bouteille en verre, Tetra Pak, Boîte métal, Sachet",
    unitsPerCaseLabel: "Unités par Carton",
    casesPerPalletLabel: "Cartons par Palette",
    shelfLifeLabel: "Durée de Vie / DLUO (Mois)",
    brandingLabel: "Capacité Marque",
    brandingBoth: "Marque de Distributeur (MDD) et Marque Propre",
    brandingPrivateLabelOnly: "Marque de Distributeur Exclusivement (MDD / Private Label)",
    brandingProducerOnly: "Marque Propre Exclusivement",

    sec4Title: "4. Qualité & Certifications Alimentaires",
    sec4Subtitle: "Sélectionnez toutes les certifications valides pour votre usine:",

    sec5Title: "5. Fiche Technique (TDS) et Certificats",
    sec5Subtitle: "Téléchargez votre fiche technique produit, bulletin d'analyse ou certificats de qualité (PDF, PNG, JPG):",
    uploadButton: "📎 Joindre Fiche Technique / Certificat (PDF ou Image)",
    uploading: "Téléchargement du document…",
    uploadedFilesLabel: "Documents Joints:",
    removeFile: "Supprimer",

    sec6Title: "6. Échantillons pour Dégustation & Validation",
    sampleStatusLabel: "Disponibilité des Échantillons & Envoi Coursier",
    sampleReady: "Oui — Échantillons prêts pour expédition immédiate par coursier",
    sampleDispatched: "Déjà expédiés par coursier vers Tel Aviv",
    sampleOnPriceAlignment: "Disponibles après validation préliminaire des prix",
    sampleDigitalOnly: "Spécifications numériques d'abord",
    courierServiceLabel: "Société de Coursier",
    courierAwbLabel: "Numéro de Suivi AWB (Bordereau Aérien)",
    courierAwbPlaceholder: "Ex: DHL 1234567890 / FedEx 987654321",
    dispatchDateLabel: "Date d'Expédition",

    sec7Title: "7. Contact Direct Export & Remarques",
    contactNameLabel: "Nom du Responsable Export",
    contactNamePlaceholder: "Nom complet",
    contactEmailLabel: "Email Direct",
    contactPhoneLabel: "Téléphone / WhatsApp",
    notesLabel: "Informations Complémentaires & Détails Techniques",
    notesPlaceholder: "Précisez la palettisation, la DLUO, la recette ou insérez un lien vers votre catalogue...",

    submitButton: "Transmettre Votre Offre à FoodXchange →",
    submittingButton: "Envoi de l'offre…",

    thankYouTitle: "Merci pour votre proposition commerciale !",
    thankYouMessage: "Votre offre et vos spécifications ont été transmises au bureau des achats de FoodXchange. Nous étudierons votre proposition avec la centrale d'achats du client et reviendrons vers vous rapidement.",
    updateResponseButton: "Modifier ou mettre à jour l'offre transmise",
    contactDeskWhatsapp: "Contacter le Bureau des Achats via WhatsApp",
  },

  de: {
    deskSubtitle: "FoodXchange · Direkte Beschaffungsabteilung",
    inquiryTitle: "Kommerzielle Anfrage & Spezifikationsabfrage",
    confidentialBadge: "Vertrauliche Direktausschreibung (RFQ)",
    refLabel: "Ref:",
    buyerBriefTitle: "Bedarfsprofil des Einkäufers & Spezifikationen",
    targetProductLabel: "Angefragtes Produkt:",
    catalogMatchLabel: "Zugeordnet zu Ihrer Produktlinie:",
    benchmarkLabel: "Referenzmarke:",
    volumePackLabel: "Bedarfsmenge / Gebinde:",
    certificationsLabel: "Geforderte Zertifizierungen:",
    briefAndSpecsLabel: "Einkaufsbriefing & Vorgaben:",

    formTitle: "Exportangebot & Technische Datenblätter Einreichen",
    formSubtitle: "Dauert ca. 60 Sekunden. Prüfen Sie Spezifikationen, geben Sie Exportpreise & MOQ an, laden Sie Datenblätter hoch oder bestätigen Sie den Musterversand.",
    previousResponseNote: "Bestehendes Angebot vorhanden: Sie haben bereits auf diese Anfrage geantwortet. Eine erneute Übermittlung aktualisiert Ihr Angebot.",

    sec1Title: "1. Lieferfähigkeit & Verfügbarkeit",
    canSupplyTitle: "✅ Lieferbar (Exakte Spezifikation)",
    canSupplyDesc: "Wir produzieren oder liefern exakt diese geforderte Spezifikation",
    similarOptionTitle: "🔄 Alternative Spezifikation",
    similarOptionDesc: "Wir bieten eine vergleichbare Rezeptur, Format oder Grammatur",
    cannotSupplyTitle: "❌ Nicht Lieferbar",
    cannotSupplyDesc: "Keine Exportkapazitäten oder derzeit außerhalb des Sortiments",

    sec2Title: "2. Preise & Lieferbedingungen",
    unitPriceLabel: "Indikativer Exportpreis",
    currencyLabel: "Währung",
    priceBasisLabel: "Preiseinheit",
    incotermLabel: "Lieferbedingung (Incoterms 2020)",
    moqLabel: "Mindestbestellmenge (MOQ)",
    moqPlaceholder: "Z.B. 1 x 40ft HQ Container / 5 Paletten / 10.000 Stk.",
    leadTimeLabel: "Produktionsvorlaufzeit",
    leadTimePlaceholder: "Z.B. 3–4 Wochen ab Auftragsklarheit",
    paymentTermsLabel: "Bevorzugte Zahlungsbedingungen",

    sec3Title: "3. Verpackung & Logistische Daten",
    netWeightLabel: "Nettogewicht / Füllmenge je Einheit",
    netWeightPlaceholder: "Z.B. 1L, 400g, 500ml",
    packagingFormatLabel: "Primärverpackung",
    packagingFormatPlaceholder: "Z.B. Glasflasche, Tetra Pak, Dose, Beutel",
    unitsPerCaseLabel: "Einheiten pro Umkarton",
    casesPerPalletLabel: "Umkartons pro Palette",
    shelfLifeLabel: "Mindesthaltbarkeit / MHD (Monate)",
    brandingLabel: "Markenoptionen",
    brandingBoth: "Sowohl Eigenmarke (Private Label) als auch Herstellermarke",
    brandingPrivateLabelOnly: "Ausschließlich Eigenmarke (Handelsmarke / OEM)",
    brandingProducerOnly: "Ausschließlich Herstellermarke",

    sec4Title: "4. Qualitätsstandards & Zertifizierungen",
    sec4Subtitle: "Wählen Sie alle gültigen Zertifizierungen Ihres Werkes aus:",

    sec5Title: "5. Technisches Datenblatt (TDS) & Zertifikate",
    sec5Subtitle: "Laden Sie Ihr Produktdatenblatt, Laboranalysen oder Qualitätszertifikate hoch (PDF, PNG, JPG):",
    uploadButton: "📎 Datenblatt / Zertifikat Hochladen (PDF/Bild)",
    uploading: "Dokument wird hochgeladen…",
    uploadedFilesLabel: "Angehängte Dokumente:",
    removeFile: "Entfernen",

    sec6Title: "6. Musterversand für Verkostung & Qualitätsprüfung",
    sampleStatusLabel: "Musterverfügbarkeit & Kurierversand",
    sampleReady: "Ja — Verkostungsmuster sofort versandbereit per Kurier",
    sampleDispatched: "Bereits per Kurier nach Tel Aviv versandt",
    sampleOnPriceAlignment: "Verfügbar nach erster kaufmännischer Abstimmung",
    sampleDigitalOnly: "Zunächst nur digitale Spezifikationen",
    courierServiceLabel: "Kurierdienstleister",
    courierAwbLabel: "Sendungsnummer / AWB Tracking-Code",
    courierAwbPlaceholder: "Z.B. DHL 1234567890 / FedEx 987654321",
    dispatchDateLabel: "Versanddatum",

    sec7Title: "7. Exportansprechpartner & Anmerkungen",
    contactNameLabel: "Name des Exportleiters",
    contactNamePlaceholder: "Ihr vollständiger Name",
    contactEmailLabel: "Direkte E-Mail-Adresse",
    contactPhoneLabel: "Direkte Telefon- / WhatsApp-Nummer",
    notesLabel: "Zusätzliche Hinweise & Technische Details",
    notesPlaceholder: "Palettierungsangaben, MHD, Rezepturbesonderheiten oder Link zum Online-Katalog...",

    submitButton: "Exportangebot an FoodXchange Übermitteln →",
    submittingButton: "Angebot wird übermittelt…",

    thankYouTitle: "Vielen Dank für Ihr Angebot!",
    thankYouMessage: "Ihr Angebot und Ihre technischen Spezifikationen wurden direkt an die Einkaufsabteilung von FoodXchange übermittelt. Wir prüfen Ihre Offerte mit dem Einkäufer und melden uns in Kürze.",
    updateResponseButton: "Übermitteltes Angebot bearbeiten oder ergänzen",
    contactDeskWhatsapp: "Einkaufsabteilung via WhatsApp Kontaktieren",
  },
};
