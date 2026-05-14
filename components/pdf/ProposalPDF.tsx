import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'

const BLUE = '#1D4ED8'
const BLUE_LIGHT = '#EFF6FF'
const DARK = '#111827'
const GRAY = '#6B7280'
const LIGHT_GRAY = '#9CA3AF'
const BORDER = '#E5E7EB'
const BG_GRAY = '#F9FAFB'
const TEAL = '#0F766E'

const styles = StyleSheet.create({
  // ─── Cover page ──────────────────────────────────────────────────────────────
  coverPage: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  // Blue top bar (absolute)
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: BLUE,
  },
  // Header row
  coverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 20,
  },
  companyFirstWord: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    lineHeight: 1,
  },
  companyRest: {
    fontSize: 11,
    color: GRAY,
    marginTop: 3,
  },
  headshotWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 8,
  },
  headshotImg: {
    width: 50,
    height: 50,
  },
  coverMeta: {
    alignItems: 'flex-end',
  },
  coverMetaLine: {
    fontSize: 10,
    color: GRAY,
    marginBottom: 3,
  },
  // Hero section
  coverHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
    paddingTop: 80,
    paddingBottom: 40,
  },
  coverCustomerName: {
    fontSize: 42,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    textAlign: 'center',
    lineHeight: 1.15,
    marginBottom: 10,
  },
  coverCityState: {
    fontSize: 16,
    color: GRAY,
    textAlign: 'center',
  },
  // Decorative wave layers (absolute)
  waveBase: {
    position: 'absolute',
    left: -100,
    width: 850,
    height: 500,
  },
  // Rep contact footer (absolute, above bottom bar)
  repFooter: {
    position: 'absolute',
    bottom: 52,
    left: 40,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  repPhotoWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: BLUE,
    flexShrink: 0,
  },
  repPhotoImg: {
    width: 48,
    height: 48,
  },
  repContactName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  repContactLine: {
    fontSize: 9,
    color: GRAY,
    marginTop: 2,
  },
  // Bottom address bar (absolute)
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 45,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarText: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  // ─── Page 2 ──────────────────────────────────────────────────────────────────
  page2: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    paddingHorizontal: 48,
    paddingTop: 28,
    paddingBottom: 80,
    fontSize: 10,
    color: DARK,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BLUE,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  headerCompanyFirst: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
  },
  headerCompanyRest: {
    fontSize: 9,
    color: GRAY,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerMeta: {
    fontSize: 9,
    color: GRAY,
  },
  // Customer info box
  infoBox: {
    backgroundColor: BG_GRAY,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
  },
  infoCol: {
    width: '50%',
  },
  infoLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT_GRAY,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 2,
  },
  infoSubValue: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 2,
  },
  infoContactLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT_GRAY,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 3,
    marginTop: 8,
  },
  infoField: {
    marginBottom: 6,
  },
  infoFieldLabel: {
    fontSize: 8,
    color: GRAY,
    marginBottom: 1,
  },
  infoFieldValue: {
    fontSize: 10,
    color: '#374151',
  },
  // Section
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingBottom: 6,
    marginBottom: 8,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  scopeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  blueDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BLUE,
    marginTop: 3,
    marginRight: 8,
    flexShrink: 0,
  },
  scopeText: {
    flex: 1,
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
  },
  // YOUR INVESTMENT box
  investmentBox: {
    backgroundColor: BLUE_LIGHT,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 4,
    padding: 14,
    marginBottom: 14,
    marginTop: 10,
  },
  investmentTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  priceLabel: {
    fontSize: 10,
    color: '#374151',
  },
  priceValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  priceStrike: {
    fontSize: 10,
    color: LIGHT_GRAY,
    textDecoration: 'line-through',
  },
  priceSavings: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: TEAL,
  },
  priceDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#BFDBFE',
    marginVertical: 8,
  },
  yourPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  yourPriceLabel: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
  },
  yourPriceValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
  },
  financingNote: {
    fontSize: 9,
    color: GRAY,
    fontStyle: 'italic',
    marginTop: 6,
  },
  costcoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  costcoLabel: {
    fontSize: 10,
    color: '#B45309',
  },
  costcoValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#B45309',
  },
  // Authorization
  authSection: {
    marginTop: 16,
    marginBottom: 10,
  },
  sigRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  sigBlock: {
    flex: 1,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: DARK,
    height: 28,
    marginBottom: 4,
  },
  sigLabel: {
    fontSize: 8,
    color: GRAY,
  },
  sigRepName: {
    fontSize: 9,
    color: GRAY,
    fontStyle: 'italic',
    marginTop: 2,
  },
  dateLine: {
    width: 80,
  },
  dateSubLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#D1D5DB',
    height: 22,
    marginTop: 10,
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 8,
    color: GRAY,
  },
  // Terms
  termsText: {
    fontSize: 7.5,
    color: LIGHT_GRAY,
    lineHeight: 1.6,
    marginBottom: 3,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footerCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  footerColCenter: {
    flex: 1,
    alignItems: 'center',
  },
  footerColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  footerText: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.5,
  },
})

function fmtDollar(n: number | null | undefined): string {
  if (n == null || isNaN(n) || n === 0) return '—'
  return '$' + Math.round(n).toLocaleString()
}

function fmtPhone(p: string | null | undefined): string {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  return p
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

type DiscountLineProp = { label: string; amount: number }

interface ProposalPDFProps {
  proposal: Record<string, any>
  repSettings?: Record<string, any>
  discountLines?: DiscountLineProp[]
  totalSavings?: number
}

export default function ProposalPDF({ proposal, repSettings, discountLines: propDiscountLines, totalSavings: propTotalSavings }: ProposalPDFProps) {
  const pricing = proposal.pricing_data ?? {}
  const proposalType = pricing.proposal_type ?? proposal.type ?? 'windows'

  // Customer info
  const customerFirstName = proposal.customer_first_name ?? ''
  const customerLastName = proposal.customer_last_name ?? ''
  const customerName = proposal.customer_name
    ?? [customerFirstName, customerLastName].filter(Boolean).join(' ')
    ?? 'Customer'
  const spouseFirst = proposal.spouse_first_name ?? ''
  const spouseLast = proposal.spouse_last_name ?? customerLastName
  const addressLine = proposal.customer_address ?? ''
  const cityStateZip = [proposal.customer_city, proposal.customer_state, proposal.customer_zip].filter(Boolean).join(', ')
  const cityState = [proposal.customer_city, proposal.customer_state].filter(Boolean).join(', ')
  const fullAddress = [addressLine, cityStateZip].filter(Boolean).join(', ')
  const customerPhone = fmtPhone(proposal.customer_phone)
  const customerEmail = proposal.customer_email ?? ''

  // Rep info
  const repName = repSettings?.rep_name ?? ''
  const repPhone = fmtPhone(repSettings?.phone)
  const repEmail = repSettings?.email ?? ''
  const companyName: string = repSettings?.company ?? ''
  const industry: string = repSettings?.industry ?? 'windows_siding'
  const headshotData: string | null = repSettings?.headshot_data ?? null
  const companyParts = companyName.trim().split(/\s+/)
  const companyFirst = companyParts[0] ?? ''
  const companyRest = companyParts.slice(1).join(' ')

  // Quote number — use proposal_number if available, fall back to id
  const quoteNumber: string = proposal.proposal_number
    ?? ('SP-' + (proposal.id ?? '').slice(-4).toUpperCase())
  const createdDate = formatDate(proposal.created_at)

  // Pricing — DISPLAY STORED VALUES ONLY. Never recalculate.
  const packagePrice: number | null = pricing.package_price ?? null
  const yourPrice: number = pricing.your_price ?? proposal.your_price ?? 0
  const adminFee: number | null = pricing.admin_fee > 0 ? pricing.admin_fee : null
  const leadPaint: number | null = pricing.lead_paint > 0 ? pricing.lead_paint : null
  const monthlyPayment: number | null = pricing.monthly_payment > 0 ? pricing.monthly_payment : null
  const financingOption: string | null = pricing.financing_option ?? null
  const costcoMember: boolean = !!pricing.costco_member
  const costcoSavings: number | null = pricing.costco_savings > 0 ? pricing.costco_savings : null
  const netAfterCostco: number | null = costcoMember && costcoSavings ? yourPrice - costcoSavings : null

  // Discount lines — props from server take priority; internal calc is fallback
  type DiscountLine = { label: string; amount: number }
  const toggles = pricing.toggle_state || {}
  const adminFeeEnabled: boolean = pricing.admin_fee_enabled !== false
  const adminFeeForDiscount: number = adminFeeEnabled
    ? (pricing.admin_fee_amount ?? pricing.admin_fee ?? 850)
    : 0
  const basePackagePrice: number =
    pricing.package_price > 0
      ? pricing.package_price
      : pricing.windows_project_value > 0
        ? pricing.windows_project_value
        : Number(proposal.package_price) || 0
  const discountableBase: number = basePackagePrice - adminFeeForDiscount

  const internalDiscountLines: DiscountLine[] = []
  if (toggles.promotion === '20_off') {
    internalDiscountLines.push({ label: 'Package Discount (20%)', amount: Math.round(discountableBase * 0.20) })
  }
  if (toggles.promotion === '25_off') {
    internalDiscountLines.push({ label: 'Package Discount (25%)', amount: Math.round(discountableBase * 0.25) })
  }
  if (toggles.bnsn === '10_off') {
    internalDiscountLines.push({ label: 'Buy Now Save Now (10%)', amount: Math.round(discountableBase * 0.10) })
  }
  if (toggles.bnsn === '5_off') {
    internalDiscountLines.push({ label: 'Buy Now Save Now (5%)', amount: Math.round(discountableBase * 0.05) })
  }
  if (toggles.cash_incentive) {
    internalDiscountLines.push({ label: 'Cash Incentive (7%)', amount: Math.round(discountableBase * 0.07) })
  }
  // Fallback: Vendo import or any stored discount_amount
  if (internalDiscountLines.length === 0 && pricing.discount_amount > 0) {
    internalDiscountLines.push({ label: pricing.discount_name || 'Promotional Discount', amount: pricing.discount_amount })
  }

  const discountLines: DiscountLine[] = propDiscountLines ?? internalDiscountLines
  const totalSavings: number = propTotalSavings ?? discountLines.reduce((s, d) => s + d.amount, 0)

  const proposalTypeLabel = proposalType === 'both'
    ? 'Windows & Siding Proposal'
    : proposalType === 'siding'
    ? 'Siding Proposal'
    : 'Window Proposal'

  // Scope items
  const scopeItems: string[] = []
  if (proposalType === 'windows' || proposalType === 'both') {
    if (pricing.num_windows) scopeItems.push(`${pricing.num_windows} Replacement Window${pricing.num_windows !== 1 ? 's' : ''} — Infinity by Marvin`)
    if (pricing.num_doors) scopeItems.push(`${pricing.num_doors} Patio Door${pricing.num_doors !== 1 ? 's' : ''}`)
    if (!pricing.num_windows && pricing.line_items?.length) {
      for (const item of pricing.line_items) {
        if (item.description) scopeItems.push(`${item.qty ?? 1}x ${item.description}`)
      }
    }
  }
  if (proposalType === 'siding' || proposalType === 'both') {
    scopeItems.push('James Hardie Siding Installation')
    const s = pricing.siding_scope ?? {}
    if (s.install_siding_type) scopeItems.push(`Product: ${s.install_siding_type}`)
    if (s.remove_siding) scopeItems.push('Remove existing siding')
    if (s.install_sheathing) scopeItems.push(`Install sheathing${s.install_sheathing_sqft ? ` (${s.install_sheathing_sqft} sq ft)` : ''}`)
    if (s.fanfold) scopeItems.push('Install fanfold insulation')
    if (s.trim_windows_doors) scopeItems.push(`Wrap/trim windows & doors${s.trim_windows_doors_type ? ` — ${s.trim_windows_doors_type}` : ''}`)
  }

  // Warranty lines based on industry
  const warrantyLines: string[] = []
  if (industry === 'windows_siding' || industry === 'windows' || industry === 'siding') {
    if (proposalType === 'windows' || proposalType === 'both') {
      warrantyLines.push('Infinity by Marvin lifetime limited warranty')
    }
    if (proposalType === 'siding' || proposalType === 'both') {
      warrantyLines.push('James Hardie HZ5 30-year limited product warranty')
    }
    if (companyName) {
      warrantyLines.push(`${companyName} Lifetime Labor Warranty, transferable to next homeowner`)
    }
  } else {
    if (companyName) {
      warrantyLines.push(`${companyName} service warranty — see contract for full terms`)
    }
  }
  warrantyLines.push('Estimated project completion: 4–6 weeks from signed agreement')
  warrantyLines.push('This proposal is valid for 30 days from the date above')

  return (
    <Document>
      {/* ─── PAGE 1: COVER ─── */}
      <Page size="A4" style={styles.coverPage}>
        {/* Blue top bar */}
        <View style={styles.topBar} />

        {/* Header */}
        <View style={styles.coverHeader}>
          <View>
            {companyFirst ? (
              <>
                <Text style={styles.companyFirstWord}>{companyFirst}</Text>
                {companyRest ? <Text style={styles.companyRest}>{companyRest}</Text> : null}
              </>
            ) : null}
            {headshotData ? (
              <View style={styles.headshotWrapper}>
                <Image src={headshotData} style={styles.headshotImg} />
              </View>
            ) : null}
          </View>
          <View style={styles.coverMeta}>
            <Text style={styles.coverMetaLine}>{createdDate}</Text>
            <Text style={styles.coverMetaLine}>Quote #: {quoteNumber}</Text>
            {repName ? <Text style={styles.coverMetaLine}>Prepared by: {repName}</Text> : null}
          </View>
        </View>

        {/* Hero section */}
        <View style={styles.coverHero}>
          <Text style={styles.coverCustomerName}>{customerName}</Text>
          {cityState ? <Text style={styles.coverCityState}>{cityState}</Text> : null}
        </View>

        {/* Decorative wave layers */}
        <View style={{ ...styles.waveBase, top: 490, backgroundColor: 'rgba(29,78,216,0.06)', transform: 'rotate(-12deg)' }} />
        <View style={{ ...styles.waveBase, top: 520, left: 0, backgroundColor: 'rgba(15,118,110,0.07)', transform: 'rotate(-12deg)' }} />
        <View style={{ ...styles.waveBase, top: 550, left: 80, backgroundColor: 'rgba(6,182,212,0.06)', transform: 'rotate(-12deg)' }} />
        <View style={{ ...styles.waveBase, top: 580, left: 160, backgroundColor: 'rgba(29,78,216,0.08)', transform: 'rotate(-12deg)' }} />

        {/* Rep contact footer */}
        <View style={styles.repFooter}>
          {headshotData ? (
            <View style={styles.repPhotoWrapper}>
              <Image src={headshotData} style={styles.repPhotoImg} />
            </View>
          ) : null}
          <View>
            {repName ? <Text style={styles.repContactName}>{repName}</Text> : null}
            {repEmail ? <Text style={styles.repContactLine}>{repEmail}</Text> : null}
            {repPhone ? <Text style={styles.repContactLine}>Cell: {repPhone}</Text> : null}
          </View>
        </View>

        {/* Blue bottom bar */}
        <View style={styles.bottomBar}>
          <Text style={styles.bottomBarText}>{fullAddress || companyName}</Text>
        </View>
      </Page>

      {/* ─── PAGE 2: PROPOSAL DETAILS ─── */}
      <Page size="A4" style={styles.page2}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <View style={styles.headerLeft}>
            {companyFirst ? (
              <>
                <Text style={styles.headerCompanyFirst}>{companyFirst}</Text>
                {companyRest ? <Text style={styles.headerCompanyRest}> {companyRest}</Text> : null}
              </>
            ) : <Text style={styles.headerCompanyFirst}>{proposalTypeLabel}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>{quoteNumber}  ·  {createdDate}</Text>
          </View>
        </View>

        {/* Customer info box */}
        <View style={styles.infoBox}>
          {/* Left column */}
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{customerName}</Text>
            {spouseFirst ? (
              <Text style={styles.infoSubValue}>& {spouseFirst} {spouseLast}</Text>
            ) : null}
            {addressLine ? <Text style={[styles.infoSubValue, { marginTop: 4, color: GRAY, fontSize: 9 }]}>{addressLine}</Text> : null}
            {cityStateZip ? <Text style={[styles.infoSubValue, { color: GRAY, fontSize: 9 }]}>{cityStateZip}</Text> : null}
          </View>
          {/* Right column */}
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Contact</Text>
            {customerPhone ? (
              <View style={styles.infoField}>
                <Text style={styles.infoFieldLabel}>Phone</Text>
                <Text style={styles.infoFieldValue}>{customerPhone}</Text>
              </View>
            ) : null}
            {customerEmail ? (
              <View style={styles.infoField}>
                <Text style={styles.infoFieldLabel}>Email</Text>
                <Text style={styles.infoFieldValue}>{customerEmail}</Text>
              </View>
            ) : null}
            <View style={styles.infoField}>
              <Text style={styles.infoFieldLabel}>Date</Text>
              <Text style={styles.infoFieldValue}>{createdDate}</Text>
            </View>
            <View style={styles.infoField}>
              <Text style={styles.infoFieldLabel}>Quote #</Text>
              <Text style={styles.infoFieldValue}>{quoteNumber}</Text>
            </View>
          </View>
        </View>

        {/* Project summary */}
        {scopeItems.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Project Summary</Text>
            {scopeItems.map((item, i) => (
              <View key={i} style={styles.scopeItem}>
                <View style={styles.blueDot} />
                <Text style={styles.scopeText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* YOUR INVESTMENT box */}
        <View style={styles.investmentBox}>
          <Text style={styles.investmentTitle}>Your Investment</Text>

          {packagePrice != null && packagePrice > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Package Price</Text>
              <Text style={discountLines.length > 0 ? styles.priceStrike : styles.priceValue}>
                {fmtDollar(packagePrice)}
              </Text>
            </View>
          )}

          {discountLines.map((dl, i) => (
            <View key={i} style={styles.priceRow}>
              <Text style={{ fontSize: 10, color: TEAL, fontFamily: 'Helvetica' }}>{dl.label}</Text>
              <Text style={{ fontSize: 10, color: TEAL, fontFamily: 'Helvetica-Bold' }}>-{fmtDollar(dl.amount)}</Text>
            </View>
          ))}

          {totalSavings > 0 && (
            <View style={styles.priceRow}>
              {/* Helvetica-Oblique = italic without combining with Helvetica-Bold (which crashes react-pdf) */}
              <Text style={{ fontSize: 10, color: TEAL, fontFamily: 'Helvetica-Oblique' }}>Total Savings</Text>
              <Text style={{ fontSize: 10, color: TEAL, fontFamily: 'Helvetica-Bold' }}>-{fmtDollar(totalSavings)}</Text>
            </View>
          )}

          {adminFee != null && adminFee > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Admin Fee</Text>
              <Text style={styles.priceValue}>{fmtDollar(adminFee)}</Text>
            </View>
          )}

          {leadPaint != null && leadPaint > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Lead Paint Test</Text>
              <Text style={styles.priceValue}>{fmtDollar(leadPaint)}</Text>
            </View>
          )}

          <View style={styles.priceDivider} />

          <View style={styles.yourPriceRow}>
            <Text style={styles.yourPriceLabel}>Your Price</Text>
            <Text style={styles.yourPriceValue}>{fmtDollar(yourPrice)}</Text>
          </View>

          {monthlyPayment != null && monthlyPayment > 0 && (
            <Text style={styles.financingNote}>
              Or {financingOption ?? 'financing'}: {fmtDollar(monthlyPayment)}/mo · Subject to credit approval
            </Text>
          )}
        </View>

        {/* Costco savings */}
        {costcoMember && costcoSavings != null && costcoSavings > 0 && (
          <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 4, padding: 10, marginBottom: 10 }}>
            <View style={styles.costcoRow}>
              <Text style={styles.costcoLabel}>Costco Member Savings</Text>
              <Text style={styles.costcoValue}>-{fmtDollar(costcoSavings)}</Text>
            </View>
            {netAfterCostco != null && (
              <View style={styles.costcoRow}>
                <Text style={[styles.costcoLabel, { fontFamily: 'Helvetica-Bold' }]}>Net After Costco</Text>
                <Text style={[styles.costcoValue, { fontFamily: 'Helvetica-Bold' }]}>{fmtDollar(netAfterCostco)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Authorization */}
        <View style={styles.authSection}>
          <Text style={styles.sectionTitle}>Authorization</Text>
          <View style={styles.sigRow}>
            <View style={styles.sigBlock}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>Customer Signature</Text>
            </View>
            <View style={styles.dateLine}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>Date</Text>
            </View>
          </View>
          <View style={styles.sigRow}>
            <View style={styles.sigBlock}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>Sales Representative</Text>
              {repName ? <Text style={styles.sigRepName}>{repName}</Text> : null}
            </View>
            <View style={styles.dateLine}>
              <View style={styles.sigLine} />
              <Text style={styles.sigLabel}>Date</Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={{ marginBottom: 52 }}>
          {warrantyLines.map((line, i) => (
            <Text key={i} style={styles.termsText}>• {line}</Text>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerCol}>
            {repName ? <Text style={styles.footerText}>{repName}</Text> : null}
            {repEmail ? <Text style={styles.footerText}>{repEmail}</Text> : null}
            {repPhone ? <Text style={styles.footerText}>Cell: {repPhone}</Text> : null}
          </View>
          <View style={styles.footerColCenter}>
            <Text style={styles.footerText}>Office: 303-934-4508</Text>
          </View>
          <View style={styles.footerColRight}>
            <Text style={styles.footerText}>www.mylifetimehome.com</Text>
            <Text style={{ fontSize: 7, color: '#D1D5DB', marginTop: 3 }}>Powered by Clozr</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
