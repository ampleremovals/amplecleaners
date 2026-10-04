import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface InvoicePdfData {
  invoiceNumber: string;
  issuedAt: string;
  dueDate: string | null;
  paidAt: string | null;
  lineItems: { description: string; quantity: number; unit_price: number; total: number }[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  reference: string;
  customerName: string;
  customerEmail: string | null;
  company: { name: string; address: string | null; email: string | null; phone: string | null };
  bank: { accountName: string; sortCode: string; accountNumber: string } | null;
  logo: Buffer | null;
}

const GREEN = "#15803d";
const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  band: { backgroundColor: GREEN, height: 6, marginBottom: 24, borderRadius: 3 },
  top: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  logo: { width: 120, height: 48, objectFit: "contain" },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: GREEN },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", textAlign: "right" },
  muted: { color: "#64748b" },
  right: { textAlign: "right" },
  row: { flexDirection: "row" },
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  label: { fontSize: 8, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  th: { flexDirection: "row", backgroundColor: "#f0fdf4", paddingVertical: 7, paddingHorizontal: 8, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  cDesc: { flex: 5 }, cQty: { flex: 1, textAlign: "right" }, cUnit: { flex: 1.5, textAlign: "right" }, cTotal: { flex: 1.5, textAlign: "right" },
  totals: { alignSelf: "flex-end", width: 220, marginTop: 14 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, marginTop: 4, borderTopWidth: 2, borderTopColor: GREEN, fontFamily: "Helvetica-Bold", fontSize: 13 },
  paid: { marginTop: 18, alignSelf: "flex-end", borderWidth: 2, borderColor: GREEN, color: GREEN, paddingVertical: 4, paddingHorizontal: 14, fontSize: 16, fontFamily: "Helvetica-Bold", borderRadius: 4 },
  bank: { marginTop: 28, padding: 12, backgroundColor: "#f8fafc", borderRadius: 6 },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, textAlign: "center", color: "#94a3b8", fontSize: 8 },
});

function InvoiceDocument({ d }: { d: InvoicePdfData }) {
  return (
    <Document title={`Invoice ${d.invoiceNumber}`} author={d.company.name}>
      <Page size="A4" style={s.page}>
        <View style={s.band} />
        <View style={s.top}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's <Image> renders into a PDF and has no alt prop */}
            {d.logo ? <Image src={d.logo} style={s.logo} /> : <Text style={s.brand}>{d.company.name}</Text>}
            {d.company.address ? <Text style={[s.muted, { marginTop: 6 }]}>{d.company.address}</Text> : null}
            {d.company.email ? <Text style={s.muted}>{d.company.email}</Text> : null}
            {d.company.phone ? <Text style={s.muted}>{d.company.phone}</Text> : null}
          </View>
          <View>
            <Text style={s.title}>INVOICE</Text>
            <Text style={[s.right, s.muted, { marginTop: 4 }]}>{d.invoiceNumber}</Text>
          </View>
        </View>

        <View style={s.meta}>
          <View>
            <Text style={s.label}>Billed to</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.customerName}</Text>
            {d.customerEmail ? <Text style={s.muted}>{d.customerEmail}</Text> : null}
          </View>
          <View>
            <Text style={s.label}>Issued</Text>
            <Text>{formatDate(d.issuedAt)}</Text>
          </View>
          <View>
            <Text style={s.label}>Due</Text>
            <Text>{d.dueDate ? formatDate(d.dueDate) : "On receipt"}</Text>
          </View>
          <View>
            <Text style={s.label}>Booking ref</Text>
            <Text>{d.reference}</Text>
          </View>
        </View>

        <View style={s.th}>
          <Text style={s.cDesc}>Description</Text>
          <Text style={s.cQty}>Qty</Text>
          <Text style={s.cUnit}>Unit price</Text>
          <Text style={s.cTotal}>Amount</Text>
        </View>
        {d.lineItems.map((li, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={s.cDesc}>{li.description}</Text>
            <Text style={s.cQty}>{li.quantity}</Text>
            <Text style={s.cUnit}>{formatCurrency(li.unit_price)}</Text>
            <Text style={s.cTotal}>{formatCurrency(li.total)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}><Text style={s.muted}>Subtotal</Text><Text>{formatCurrency(d.subtotal)}</Text></View>
          {d.vatAmount > 0 ? <View style={s.totalRow}><Text style={s.muted}>VAT ({d.vatRate}%)</Text><Text>{formatCurrency(d.vatAmount)}</Text></View> : null}
          <View style={s.grand}><Text>Total</Text><Text>{formatCurrency(d.total)}</Text></View>
        </View>

        {d.paidAt ? <Text style={s.paid}>PAID {formatDate(d.paidAt)}</Text> : null}

        {!d.paidAt && d.bank ? (
          <View style={s.bank} wrap={false}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 6 }}>Pay by bank transfer</Text>
            <Text>Account name: {d.bank.accountName}</Text>
            <Text>Sort code: {d.bank.sortCode}   Account number: {d.bank.accountNumber}</Text>
            <Text>Payment reference: {d.invoiceNumber}</Text>
          </View>
        ) : null}

        <Text style={s.footer}>{d.company.name} · Thank you for your business</Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument d={data} />);
}
