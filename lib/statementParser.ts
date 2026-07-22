import Papa from 'papaparse'
import { parse as parseDate, isValid as isValidDate, format as formatDate } from 'date-fns'
import type { ExpenseCategory } from './types'

export interface ParsedTransaction {
  spent_on: string
  name: string
  amount: number
  category: ExpenseCategory
}

export interface StatementParseResult {
  transactions: ParsedTransaction[]
  truncated: boolean
  error?: string
}

const MAX_ROWS = 500

const CATEGORY_KEYWORDS: [ExpenseCategory, RegExp][] = [
  ['groceries', /woolworths|coles\b|aldi\b|\biga\b|safeway|walmart|kroger|trader joe|whole foods|supermarket|grocer|indomaret|alfamart|hypermart|superindo/i],
  ['transport', /uber(?!\s*eats)|lyft|\btaxi\b|\bcab\b|transit|\bmetro\b|\btrain\b|myki|opal card|fuel|petrol|gas station|parking|lalamove|\bgojek\b|\bgrab\b|\bflazz\b|\btol\b|transjakarta/i],
  ['food_dining', /restaurant|\bcafe\b|\bcoff\w*|starbucks|mcdonald|\bkfc\b|domino|pizza|uber\s*eats|doordash|menulog|deliveroo|grubhub|bakmi|\bboga\b|\bwarung\b|\bresto\b/i],
  ['entertainment', /netflix|spotify|disney\+|\bstan\b|\bhulu\b|cinema|\bmovie\b|steam\b|playstation|xbox|prime video/i],
  ['housing', /\brent\b|mortgage|\bstrata\b|landlord|real ?estate|property management/i],
  ['utilities', /electric|energy\b|water corp|gas bill|internet|broadband|telstra|optus|verizon|at&t|comcast|\butility\b|utilities/i],
  ['health', /pharmacy|chemist|\bdoctor\b|medical|dental|\bclinic\b|hospital|health insurance|invisalign|\bklinik\b|\bapotek\b|rumah sakit|\bdokter\b/i],
  ['travel', /airline|airbnb|\bhotel\b|\bflight\b|expedia|booking\.com|qantas|jetstar/i],
  ['shopping', /amazon|\bebay\b|\btarget\b|kmart|\bmyer\b|david jones|clothing|apparel|shopee|tokopedia|lazada|bukalapak/i],
]

export function guessCategory(description: string): ExpenseCategory {
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(description)) return category
  }
  return 'other'
}

// Bank exports use wildly different amount conventions: "$1,234.56", "(123.45)"
// for negatives, a trailing "-", or a trailing "CR"/"DR" marker instead of a sign.
export function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  let negative = /^\(.+\)$/.test(trimmed) || /-\s*$/.test(trimmed) || /^-/.test(trimmed)
  if (/\bcr\b/i.test(trimmed)) negative = false
  else if (/\bdr\b/i.test(trimmed)) negative = true

  const numeric = trimmed.replace(/[^0-9.]/g, '')
  if (!numeric) return null
  const value = Number(numeric)
  if (Number.isNaN(value)) return null
  return negative ? -value : value
}

// Numeric dates are ambiguous (03/04/2026 = 3 Apr or Mar 4?). Day-first formats
// are tried before month-first ones since that convention is more common
// internationally; users can still fix a misparsed date in the review step.
const DATE_FORMATS = [
  'yyyy-MM-dd',
  'yyyy/MM/dd',
  'dd/MM/yyyy',
  'dd-MM-yyyy',
  'dd.MM.yyyy',
  'dd/MM/yy',
  'dd-MM-yy',
  'MM/dd/yyyy',
  'd MMM yyyy',
  'dd MMM yyyy',
  'MMM d, yyyy',
  'MMM dd, yyyy',
  'd MMMM yyyy',
  // Year-less formats last (lowest priority) — some tabular ledgers (e.g.
  // Indonesian bank statements) only print day/month and rely on the
  // statement period for the year, which the caller supplies via referenceYear.
  'dd/MM',
  'dd-MM',
]

export function parseStatementDate(raw: string | undefined, referenceYear?: number): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const referenceDate = referenceYear ? new Date(referenceYear, 0, 1) : new Date()
  for (const format of DATE_FORMATS) {
    const parsed = parseDate(trimmed, format, referenceDate)
    // Use local date components, not toISOString (UTC) — the latter shifts
    // the date back a day for any timezone ahead of UTC.
    if (isValidDate(parsed) && parsed.getFullYear() > 1970) {
      return formatDate(parsed, 'yyyy-MM-dd')
    }
  }
  return null
}

interface CsvAmountMode {
  type: 'single' | 'debit-credit'
  key?: string
  debitKey?: string
  creditKey?: string
}

interface CsvColumnMap {
  dateKey: string
  descKey: string
  amountMode: CsvAmountMode
}

function detectColumns(headers: string[]): CsvColumnMap | null {
  const findKey = (re: RegExp, exclude: Set<string> = new Set()): string | undefined =>
    headers.find((h) => re.test(h.toLowerCase().trim()) && !exclude.has(h))

  const dateKey = findKey(/date/)
  if (!dateKey) return null

  const debitKey = findKey(/debit|withdrawal|money\s*out/)
  const creditKey = findKey(/credit|deposit|money\s*in/, debitKey ? new Set([debitKey]) : undefined)

  let amountMode: CsvAmountMode | undefined
  if (debitKey && creditKey && debitKey !== creditKey) {
    amountMode = { type: 'debit-credit', debitKey, creditKey }
  } else {
    const amountKey = findKey(/amount|value/, new Set([dateKey]))
    if (amountKey && !/balance/i.test(amountKey)) {
      amountMode = { type: 'single', key: amountKey }
    }
  }
  if (!amountMode) return null

  const usedKeys = new Set(
    [dateKey, amountMode.key, amountMode.debitKey, amountMode.creditKey].filter((v): v is string => !!v)
  )
  const descKey =
    findKey(/desc|narrative|detail|merchant|payee|particular|reference/, usedKeys) ??
    headers.find((h) => !usedKeys.has(h) && !/balance/i.test(h))

  return { dateKey, descKey: descKey ?? dateKey, amountMode }
}

export function parseCsvStatement(text: string): StatementParseResult {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
  const headers = result.meta.fields ?? []
  const columns = detectColumns(headers)
  if (!columns) {
    return {
      transactions: [],
      truncated: false,
      error: 'Could not find date and amount columns in this CSV. Try exporting a different format, or add expenses manually.',
    }
  }

  const rows: { date: string; desc: string; amount: number }[] = []

  if (columns.amountMode.type === 'debit-credit') {
    // Debit/credit columns are unambiguous — only debits (money out) are expenses.
    for (const row of result.data) {
      const date = parseStatementDate(row[columns.dateKey])
      const debit = parseAmount(row[columns.amountMode.debitKey!])
      if (!date || debit == null || debit === 0) continue
      const desc = (row[columns.descKey] ?? '').trim() || 'Imported transaction'
      rows.push({ date, desc, amount: Math.abs(debit) })
    }
  } else {
    // Single signed column: convention varies by bank (outflows negative or
    // positive). If the file has any negative amounts, treat those as the
    // expenses; otherwise assume every row already represents money spent.
    const signed: { date: string; desc: string; amount: number }[] = []
    for (const row of result.data) {
      const date = parseStatementDate(row[columns.dateKey])
      const amount = parseAmount(row[columns.amountMode.key!])
      if (!date || amount == null || amount === 0) continue
      const desc = (row[columns.descKey] ?? '').trim() || 'Imported transaction'
      signed.push({ date, desc, amount })
    }
    const hasNegative = signed.some((r) => r.amount < 0)
    for (const r of signed) {
      if (hasNegative && r.amount >= 0) continue
      rows.push({ date: r.date, desc: r.desc, amount: Math.abs(r.amount) })
    }
  }

  return {
    transactions: rows.slice(0, MAX_ROWS).map((r) => ({
      spent_on: r.date,
      name: r.desc,
      amount: r.amount,
      category: guessCategory(r.desc),
    })),
    truncated: rows.length > MAX_ROWS,
  }
}

interface StatementTextItem {
  str: string
  x: number
  y: number
}

function reconstructLines(items: StatementTextItem[]): string[] {
  if (items.length === 0) return []
  // PDF text items arrive unordered relative to visual layout; cluster by
  // y-position (pdf.js y grows upward) into rows, then order each row by x.
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const Y_TOLERANCE = 3
  const lines: StatementTextItem[][] = []
  for (const item of sorted) {
    const current = lines[lines.length - 1]
    if (current && Math.abs(current[0].y - item.y) <= Y_TOLERANCE) {
      current.push(item)
    } else {
      lines.push([item])
    }
  }
  return lines
    .map((line) =>
      line
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)
}

// A transaction "record" starts at a line beginning with a date. Bank PDFs
// commonly wrap one transaction across several visual lines (reference
// numbers, payee name, then the amount+running-balance a few lines later),
// so records are read as blocks bounded by the next date line, not per-line.
const RECORD_START_RE =
  /^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}-\d{1,2}(?:-\d{2,4})?|\d{1,2}\.\d{1,2}\.\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{2,4})\s+(.*)$/

// Matches a standalone, properly thousands-grouped currency amount (with an
// optional DB/CR-style marker attached) as a whole token — the (?<![\d,]) /
// (?!\d) guards stop it from matching a fragment of a longer, comma-less
// reference number that a statement echoes elsewhere in the same line
// (e.g. "270000.00" in a reference column vs. the real "270,000.00" amount).
const MONEY_TOKEN_RE =
  /(?<![\d,])(\(?-?\$?\d{1,3}(?:,\d{3})+\.\d{2}\)?|\(?-?\$?\d{1,3}\.\d{2}\)?)(?!\d)(?:\s*(DB|CR|DEBIT|CREDIT|KREDIT|KR|DEBET)\b)?/gi

const DEBIT_KEYWORDS = /\bDB\b|\bDEBIT\b|\bDEBET\b/i
const CREDIT_KEYWORDS = /\bCR\b|\bCREDIT\b|\bKREDIT\b|\bKR\b/i
const BALANCE_LINE_KEYWORDS = /SALDO\s*AWAL|SALDO\s*AKHIR|OPENING\s*BALANCE|CLOSING\s*BALANCE|BEGINNING\s*BALANCE|ENDING\s*BALANCE/i
const REFERENCE_ONLY_RE = /^[\d\s/.:@-]+$/

function findMoneyToken(line: string): { amount: number; marker?: string; index: number } | null {
  MONEY_TOKEN_RE.lastIndex = 0
  const match = MONEY_TOKEN_RE.exec(line)
  if (!match) return null
  const negative = /^[(-]/.test(match[1])
  const numeric = Number(match[1].replace(/[^0-9.]/g, ''))
  if (Number.isNaN(numeric)) return null
  return { amount: negative ? -numeric : numeric, marker: match[2], index: match.index }
}

function buildDescription(headerRemainder: string, descLines: string[]): string {
  const cleanedHeader = headerRemainder.replace(/\b(DB|CR|DEBIT|CREDIT|KREDIT|KR|DEBET)\b/gi, '').replace(/\s+/g, ' ').trim()
  const meaningfulDesc = descLines.filter((l) => /[A-Za-z]/.test(l) && !REFERENCE_ONLY_RE.test(l))
  const joined = [cleanedHeader, ...meaningfulDesc].filter(Boolean).join(' · ').replace(/\s+/g, ' ').trim()
  if (!joined) return 'Imported transaction'
  return joined.length > 100 ? `${joined.slice(0, 97)}...` : joined
}

// Statements printing day/month-only dates (see RECORD_START_RE) need a year
// from context; most declare it as e.g. "PERIODE : JUNI 2026".
function extractStatementYear(text: string): number {
  const match = /(?:PERIODE|PERIOD)\s*:?\s*[A-Za-z]*\s*(\d{4})/i.exec(text)
  return match ? Number(match[1]) : new Date().getFullYear()
}

function parseTransactionBlocks(lines: string[], referenceYear: number): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  let currentDate: string | null = null
  let headerRemainder = ''
  let descLines: string[] = []
  let foundAmount: { amount: number; marker?: string; index: number } | null = null

  function flush() {
    if (currentDate && foundAmount && foundAmount.amount !== 0) {
      const blockText = `${headerRemainder} ${descLines.join(' ')}`
      if (!BALANCE_LINE_KEYWORDS.test(blockText)) {
        let isDebit: boolean
        if (foundAmount.marker && DEBIT_KEYWORDS.test(foundAmount.marker)) isDebit = true
        else if (foundAmount.marker && CREDIT_KEYWORDS.test(foundAmount.marker)) isDebit = false
        else if (foundAmount.amount < 0) isDebit = true
        else if (DEBIT_KEYWORDS.test(blockText) && !CREDIT_KEYWORDS.test(blockText)) isDebit = true
        else if (CREDIT_KEYWORDS.test(blockText) && !DEBIT_KEYWORDS.test(blockText)) isDebit = false
        // Genuinely ambiguous (no marker anywhere): default to expense so it
        // surfaces in the review table rather than silently being dropped.
        else isDebit = true

        if (isDebit) {
          transactions.push({
            spent_on: currentDate,
            name: buildDescription(headerRemainder, descLines),
            amount: Math.abs(foundAmount.amount),
            category: guessCategory(blockText),
          })
        }
      }
    }
    currentDate = null
    headerRemainder = ''
    descLines = []
    foundAmount = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const recordMatch = RECORD_START_RE.exec(line)
    if (recordMatch) {
      flush()
      const [, dateToken, remainder] = recordMatch
      const date = parseStatementDate(dateToken, referenceYear)
      if (!date) continue
      currentDate = date
      const money = findMoneyToken(remainder)
      // Money found on the same line as the date (a fully single-line
      // record) — keep only the text before it as the description.
      headerRemainder = money ? remainder.slice(0, money.index).trim() : remainder
      foundAmount = money
      continue
    }

    // Once past the amount line, anything else before the next record start
    // is page-boundary noise (running totals, repeated letterhead, "continued
    // on next page") — not part of this transaction.
    if (!currentDate || foundAmount) continue

    const money = findMoneyToken(line)
    if (money) {
      foundAmount = money
      continue
    }
    descLines.push(line)
  }
  flush()

  return transactions
}

export function parsePdfStatement(pagesItems: StatementTextItem[][]): StatementParseResult {
  const lines = pagesItems.flatMap(reconstructLines)
  const referenceYear = extractStatementYear(lines.join('\n'))
  const all = parseTransactionBlocks(lines, referenceYear)
  return {
    transactions: all.slice(0, MAX_ROWS),
    truncated: all.length > MAX_ROWS,
  }
}
