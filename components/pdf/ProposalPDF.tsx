import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const BLUE = '#1D4ED8'
const DARK = '#111827'
const GRAY = '#6B7280'
const LIGHT_GRAY = '#9CA3AF'
const BORDER = '#E5E7EB'
const BG_BLUE = '#EFF6FF'

const styles = StyleSheet.create({
  coverPage: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
  },
  page: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    paddingHorizontal: 48,
    paddingTop: 36,
    paddingBottom: 48,
    fontSize: 10,
    color: DARK,
  },
  // Cover page styles
  coverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 48,
    paddingBottom: 0,
  },
  coverLogoText: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
  },
  coverMeta: {
    alignItems: 'flex-end',
  },
  coverMetaLine: {
    fontSize: 9,
    color: GRAY,
    marginBottom: 3,
  },
  coverCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  coverTitle: {
    fontSize: 38,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    textAlign: 'center',
    lineHeight: 1.2,
  },
  coverBar: {
    backgroundColor: BLUE,
    paddingHorizontal: 48,
    paddingVertical: 18,
  },
  coverBarText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // Page 2 styles
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: BLUE,
  },
  logoText: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
  },
  proposalTypeLabel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Customer info box
  infoBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    width: 80,
    fontSize: 9,
    color: GRAY,
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  // Section
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 14,
  },
  scopeItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    width: 14,
    fontSize: 9,
    color: BLUE,
  },
  scopeText: {
    flex: 1,
    fontSize: 9,
    color: '#374151',
  },
  // Pricing table
  pricingTable: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  priceRowHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG_BLUE,
  },
  priceDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    marginHorizontal: 16,
  },
  priceLabel: {
    fontSize: 10,
    color: '#4B5563',
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
  priceDiscount: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
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
  // Financing row
  financingBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Signature section
  signatureSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  signatureRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: DARK,
    marginBottom: 4,
    height: 28,
  },
  signatureLabel: {
    fontSize: 8,
    color: GRAY,
  },
  dateLine: {
    width: 80,
  },
  // Terms
  termsText: {
    fontSize: 7.5,
    color: LIGHT_GRAY,
    lineHeight: 1.5,
    marginBottom: 3,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.5,
  },
})

function fmtDollar(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
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

interface ProposalPDFProps {
  proposal: Record<string, any>
  repSettings?: Record<string, any>
}

export default function ProposalPDF({ proposal, repSettings }: ProposalPDFProps) {
  const pricing = proposal.pricing_data ?? {}
  const proposalType = pricing.proposal_type ?? proposal.type ?? 'windows'

  // Customer info
  const customerFirstName = proposal.customer_first_name ?? ''
  const customerLastName = proposal.customer_last_name ?? ''
  const customerName = proposal.customer_name
    ?? [customerFirstName, customerLastName].filter(Boolean).join(' ')
    ?? 'Customer'
  const addressLine = [proposal.customer_address].filter(Boolean).join(', ')
  const cityStateZip = [proposal.customer_city, proposal.customer_state, proposal.customer_zip].filter(Boolean).join(', ')
  const fullAddress = [addressLine, cityStateZip].filter(Boolean).join(', ')
  const phone = fmtPhone(proposal.customer_phone)
  const email = proposal.customer_email ?? ''

  // Rep info
  const repName = repSettings?.rep_name ?? ''
  const repPhone = fmtPhone(repSettings?.phone)
  const repEmail = repSettings?.email ?? ''
  const companyName = repSettings?.company_name ?? 'Lifetime Home Remodeling'

  // Dates & meta
  const createdDate = formatDate(proposal.created_at)
  const quoteNumber = (proposal.id ?? '').slice(-6).toUpperCase()

  // Pricing — DISPLAY STORED VALUES ONLY. Never recalculate.
  const packagePrice: number | null = pricing.package_price ?? null
  const discountName: string = pricing.discount_name ?? 'Promo Discount'
  const discountAmount: number | null = pricing.discount_amount ?? null
  const adminFee: number | null = pricing.admin_fee > 0 ? pricing.admin_fee : null
  const yourPrice: number = pricing.your_price ?? proposal.your_price ?? 0
  const subtotal: number | null = pricing.subtotal ??
    (packagePrice != null && discountAmount != null ? packagePrice - discountAmount : null)
  const youSave: number | null = discountAmount
  const monthlyPayment: number | null = pricing.monthly_payment > 0 ? pricing.monthly_payment : null
  const financingOption: string | null = pricing.financing_option ?? null
  const costcoMember: boolean = !!pricing.costco_member
  const costcoSavings: number | null = pricing.costco_savings > 0 ? pricing.costco_savings : null

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

  return (
    <Document>
      {/* ─── PAGE 1: COVER ─── */}
      <Page size="A4" style={styles.coverPage}>
        {/* Header */}
        <View style={styles.coverHeader}>
          <Text style={styles.coverLogoText}>Lifetime</Text>
          <View style={styles.coverMeta}>
            <Text style={styles.coverMetaLine}>Date: {createdDate}</Text>
            <Text style={styles.coverMetaLine}>Quote #: {quoteNumber}</Text>
            {repName ? <Text style={styles.coverMetaLine}>Prepared by: {repName}</Text> : null}
          </View>
        </View>

        {/* Center */}
        <View style={styles.coverCenter}>
          <Text style={styles.coverTitle}>{customerName} Project</Text>
        </View>

        {/* Bottom bar */}
        <View style={styles.coverBar}>
          <Text style={styles.coverBarText}>{fullAddress || companyName}</Text>
        </View>
      </Page>

      {/* ─── PAGE 2: PRICING SUMMARY ─── */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.logoText}>Lifetime</Text>
          <Text style={styles.proposalTypeLabel}>{proposalTypeLabel}</Text>
        </View>

        {/* Customer info */}
        <View style={styles.infoBox}>
          {[
            { label: 'Name', value: customerName },
            { label: 'Address', value: fullAddress },
            phone ? { label: 'Phone', value: phone } : null,
            email ? { label: 'Email', value: email } : null,
            { label: 'Date', value: createdDate },
            { label: 'Quote #', value: quoteNumber },
          ].filter(Boolean).map((row: any, i) => (
            <View key={i} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Project summary */}
        {scopeItems.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Project Summary</Text>
            {scopeItems.map((item, i) => (
              <View key={i} style={styles.scopeItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.scopeText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Pricing table */}
        <Text style={styles.sectionTitle}>Pricing</Text>
        <View style={styles.pricingTable}>
          {/* Package Price */}
          {packagePrice != null && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Package Price</Text>
              <Text style={discountAmount ? styles.priceStrike : styles.priceValue}>
                {fmtDollar(packagePrice)}
              </Text>
            </View>
          )}

          {/* Discount */}
          {discountAmount != null && discountAmount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{discountName}</Text>
              <Text style={styles.priceDiscount}>-{fmtDollar(discountAmount)}</Text>
            </View>
          )}

          {/* You Save */}
          {youSave != null && youSave > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: '#059669' }]}>You Save</Text>
              <Text style={[styles.priceValue, { color: '#059669' }]}>{fmtDollar(youSave)}</Text>
            </View>
          )}

          {/* Subtotal */}
          {subtotal != null && discountAmount != null && discountAmount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>{fmtDollar(subtotal)}</Text>
            </View>
          )}

          {/* Admin Fee */}
          {adminFee != null && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Admin Fee</Text>
              <Text style={styles.priceValue}>{fmtDollar(adminFee)}</Text>
            </View>
          )}

          {/* Divider before final price */}
          <View style={styles.priceDivider} />

          {/* Your Price */}
          <View style={styles.priceRowHighlight}>
            <Text style={styles.yourPriceLabel}>Your Price</Text>
            <Text style={styles.yourPriceValue}>{fmtDollar(yourPrice)}</Text>
          </View>
        </View>

        {/* Costco savings */}
        {costcoMember && costcoSavings != null && (
          <View style={[styles.financingBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Text style={[styles.priceLabel, { color: '#047857' }]}>Costco Member Savings</Text>
            <Text style={[styles.priceValue, { color: '#047857' }]}>-{fmtDollar(costcoSavings)}</Text>
          </View>
        )}

        {/* Financing */}
        {monthlyPayment != null && (
          <View style={styles.financingBox}>
            <View>
              <Text style={[styles.priceLabel, { fontFamily: 'Helvetica-Bold', color: '#0369A1' }]}>
                {financingOption ?? 'Financing Available'}
              </Text>
              <Text style={[styles.priceLabel, { color: '#6B7280', fontSize: 8, marginTop: 2 }]}>Subject to credit approval</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.yourPriceLabel, { color: '#0369A1', fontSize: 14 }]}>{fmtDollar(monthlyPayment)}/mo</Text>
            </View>
          </View>
        )}

        {/* Signature section */}
        <View style={styles.signatureSection}>
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Authorization</Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Customer Signature</Text>
            </View>
            <View style={styles.dateLine}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Date</Text>
            </View>
          </View>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Sales Representative</Text>
            </View>
            <View style={styles.dateLine}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Date</Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={{ marginBottom: 60 }}>
          <Text style={styles.termsText}>• James Hardie HZ5 30-year limited product warranty / Infinity by Marvin lifetime limited warranty</Text>
          <Text style={styles.termsText}>• Lifetime Labor Warranty provided by {companyName}</Text>
          <Text style={styles.termsText}>• Estimated project completion: 4–6 weeks from signed agreement</Text>
          <Text style={styles.termsText}>• This proposal is valid for 30 days from the date above</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View>
            {repName ? <Text style={styles.footerText}>{repName}</Text> : null}
            {repEmail ? <Text style={styles.footerText}>{repEmail}</Text> : null}
            {repPhone ? <Text style={styles.footerText}>{repPhone}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.footerText}>Office: 303-934-4508</Text>
            <Text style={styles.footerText}>www.mylifetimehome.com</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
