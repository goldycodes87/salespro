import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    paddingTop: 48,
    paddingBottom: 60,
    paddingHorizontal: 48,
    fontSize: 10,
    color: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    borderBottomWidth: 2,
    borderBottomColor: '#1D4ED8',
    paddingBottom: 16,
  },
  logoText: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1D4ED8',
  },
  proposalTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1D4ED8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 140,
    color: '#6B7280',
    fontSize: 9,
  },
  value: {
    flex: 1,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  pricingBox: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  priceLabel: {
    fontSize: 10,
    color: '#4B5563',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  monthlyText: {
    fontSize: 10,
    color: '#6B7280',
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bullet: {
    width: 16,
    color: '#1D4ED8',
    fontSize: 10,
  },
  scopeText: {
    flex: 1,
    fontSize: 9,
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  footerLeft: {
    fontSize: 8,
    color: '#6B7280',
  },
  footerRight: {
    fontSize: 8,
    color: '#6B7280',
    alignItems: 'flex-end',
  },
  expirationBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  expirationText: {
    fontSize: 9,
    color: '#92400E',
    textAlign: 'center',
  },
})

const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

function formatDate(dateStr: string) {
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
  const proposalType = pricing.proposal_type ?? 'windows'
  const yourPrice = proposal.your_price ?? 0
  const monthlyPayment = pricing.monthly_payment ?? null

  const customerName = proposal.customer_name
    ?? [proposal.customer_first_name, proposal.customer_last_name].filter(Boolean).join(' ')
    ?? 'Customer'

  const addressParts = [
    proposal.customer_address,
    proposal.customer_city,
    proposal.customer_state,
    proposal.customer_zip,
  ].filter(Boolean)
  const address = addressParts.join(', ')

  const repName = repSettings?.rep_name ?? ''
  const repPhone = repSettings?.phone ?? ''
  const repEmail = repSettings?.email ?? ''
  const companyName = repSettings?.company_name ?? 'Lifetime Home Remodeling'

  const createdDate = formatDate(proposal.created_at ?? new Date().toISOString())
  const expirationDate = proposal.offer_expiration_date ? formatDate(proposal.offer_expiration_date) : null

  const sidingScope = pricing.siding_scope ?? {}
  const lineItems: Array<{ description: string; qty: number }> = pricing.line_items ?? []

  const scopeItems: string[] = []

  if (proposalType === 'siding' || proposalType === 'both') {
    if (sidingScope.install_siding_type) scopeItems.push(`Install ${sidingScope.install_siding_type} siding`)
    if (sidingScope.remove_siding) scopeItems.push('Remove existing siding')
    if (sidingScope.install_sheathing) {
      const sqft = sidingScope.install_sheathing_sqft ? ` (${sidingScope.install_sheathing_sqft} sq ft)` : ''
      scopeItems.push(`Install sheathing${sqft}`)
    }
    if (sidingScope.fanfold) scopeItems.push('Install fanfold insulation')
    if (sidingScope.trim_windows_doors) {
      const type = sidingScope.trim_windows_doors_type ? ` — ${sidingScope.trim_windows_doors_type}` : ''
      scopeItems.push(`Wrap/trim windows & doors${type}`)
    }
    if (sidingScope.soffit) scopeItems.push('Replace soffit')
    if (sidingScope.fascia) scopeItems.push('Replace fascia')
    if (sidingScope.gutters) scopeItems.push('Replace gutters')
  }

  if (proposalType === 'windows' || proposalType === 'both') {
    if (pricing.num_windows) {
      scopeItems.push(`Install ${pricing.num_windows} replacement window${pricing.num_windows !== 1 ? 's' : ''}`)
    } else {
      for (const item of lineItems) {
        if (item.description) scopeItems.push(`${item.qty}x ${item.description}`)
      }
    }
  }

  const proposalTypeLabel = proposalType === 'both'
    ? 'Windows & Siding'
    : proposalType === 'siding' ? 'Siding' : 'Windows'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logoText}>SalesPro</Text>
            <Text style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>{companyName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.proposalTitle}>Project Proposal</Text>
            <Text style={styles.dateText}>{createdDate}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{customerName}</Text>
          </View>
          {address && (
            <View style={styles.row}>
              <Text style={styles.label}>Property Address</Text>
              <Text style={styles.value}>{address}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Project Type</Text>
            <Text style={styles.value}>{proposalTypeLabel}</Text>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.pricingBox}>
          <Text style={styles.priceLabel}>Your Investment</Text>
          <Text style={styles.priceValue}>{fmt(yourPrice)}</Text>
          {monthlyPayment && monthlyPayment > 0 && (
            <Text style={styles.monthlyText}>
              Or as low as {fmt(monthlyPayment)}/month with financing
            </Text>
          )}
        </View>

        {/* Expiration */}
        {expirationDate && (
          <View style={styles.expirationBox}>
            <Text style={styles.expirationText}>
              This offer is valid through {expirationDate}
            </Text>
          </View>
        )}

        {/* Scope of Work */}
        {scopeItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scope of Work</Text>
            {scopeItems.map((item, i) => (
              <View key={i} style={styles.scopeRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.scopeText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerLeft}>
              {repName && `Prepared by: ${repName}`}
            </Text>
            {repPhone && <Text style={[styles.footerLeft, { marginTop: 2 }]}>{repPhone}</Text>}
            {repEmail && <Text style={[styles.footerLeft, { marginTop: 2 }]}>{repEmail}</Text>}
          </View>
          <View style={styles.footerRight}>
            <Text>Confidential — For Customer Use Only</Text>
            <Text style={{ marginTop: 2 }}>© {new Date().getFullYear()} {companyName}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
