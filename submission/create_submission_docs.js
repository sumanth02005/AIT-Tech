const fs = require('fs')
const path = require('path')
const pptxgen = require('pptxgenjs')
const { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } = require('docx')

const outDir = __dirname
fs.mkdirSync(outDir, { recursive: true })

function paragraph(text, options = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...options })],
  })
}

async function createWriteup() {
  const rows = [
    ['Team', 'CivicLens'],
    ['College', 'SJB Institute of Technology'],
    ['Team leader', 'Manoj N'],
    ['Leader email', 'manoj062005@gmail.com'],
    ['Leader phone', '8123259754'],
  ]

  const memberRows = [
    ['Sumanth V', '1jb24cd057gdg@gmail.com', 'sumanth02005'],
    ['Manoj N', 'manoj062005@gmail.com', 'Manoj-man'],
  ]

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: 'CIVICLENS', bold: true, size: 56, color: '17252B' })], spacing: { after: 80 } }),
        paragraph('Citizen Complaint Management · AI Classification · Geospatial Duplicate Detection', { size: 28, color: 'DD493F', bold: true }),
        paragraph('Final Project Write-up', { size: 24, color: '66757A', italics: true }),
        paragraph(''),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [2500, 6500],
          rows: rows.map(([a, b]) => new TableRow({
            children: [
              new TableCell({ children: [paragraph(a, { bold: true })], width: { size: 2500, type: WidthType.DXA } }),
              new TableCell({ children: [paragraph(b)], width: { size: 6500, type: WidthType.DXA } }),
            ],
          })),
        }),
        paragraph(''),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Team Members')] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [3000, 4000, 2000],
          rows: [
            new TableRow({ children: ['Name', 'Email', 'GitHub'].map(x => new TableCell({ children: [paragraph(x, { bold: true })] })) }),
            ...memberRows.map(row => new TableRow({ children: row.map(x => new TableCell({ children: [paragraph(x)] })) })),
          ],
        }),
        paragraph(''),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Project Overview')] }),
        paragraph('CivicLens gives citizens a direct way to report roads, utilities, public-safety, sanitation, and other municipal issues. It combines structured complaint capture, optional evidence photos, GPS or manual location, Gemini AI analysis, deterministic policy rules, multilingual embeddings, and geographic/semantic duplicate detection.', { size: 24 }),
        paragraph('The citizen-facing interface presents one focused report flow and a clear reference receipt. The officer-facing interface displays a priority-sorted queue and supports assignment and status changes.', { size: 24 }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Problem and Solution')] }),
        paragraph('Municipal complaint systems commonly lose context across unstructured reports, separate channels, and repeated submissions. CivicLens preserves every original citizen report while linking likely repeats to one incident or operational ticket. This preserves evidence and avoids discarding individual reports.', { size: 24 }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Implemented Features')] }),
        ...[
          'Citizen complaint submission with name, contact, description, GPS/manual location, and image evidence.',
          'EXIF location extraction with GPS and manual-location fallbacks.',
          'Gemini classification of category, severity, hazards, summary, language, confidence, and department.',
          'Independent rules engine for critical keywords and low-confidence human-review flags.',
          '384-dimensional multilingual Sentence Transformer embeddings.',
          'Supabase PostgreSQL storage with PostGIS location points and pgvector similarity search.',
          'Combined geographic, semantic, category, and duplicate-likelihood evaluation.',
          'Incident, ticket, audit, and status workflow with priority sorting.',
          'React citizen reporting desk and officer operations dashboard.',
          'Supabase private evidence bucket, table permissions, and analytics endpoints.',
        ].map(item => new Paragraph({ text: item, bullet: { level: 0 }, spacing: { after: 80 } })),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Technology Stack')] }),
        paragraph('React + TypeScript, FastAPI + Python, Gemini, Sentence Transformers, Supabase PostgreSQL, PostGIS, pgvector, Supabase Storage, and Vite.', { size: 24 }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Processing Workflow')] }),
        ...[
          'A citizen submits a report and optional evidence.',
          'The backend validates the payload and stores the original complaint.',
          'The system resolves the location from EXIF metadata, GPS, or manual coordinates.',
          'Gemini produces structured AI analysis and the rules engine independently evaluates severity.',
          'Sentence Transformers generate a 384-dimensional embedding.',
          'PostGIS and pgvector identify geographic and semantic candidates.',
          'A combined decision creates a new incident or links the report to an existing incident.',
          'The system creates a prioritized department ticket and stores an audit trail.',
          'Officers review the queue, assign teams, update status, and resolve incidents.',
        ].map((item, i) => new Paragraph({ children: [new TextRun({ text: `${i + 1}. `, bold: true }), new TextRun(item)], spacing: { after: 80 } })),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Verification and Results')] }),
        paragraph('The backend, database, embedding model, complaint submission, incident creation, ticket routing, analytics, and React interface have been tested locally. A live-wire complaint was classified by Gemini as ELECTRICITY / CRITICAL with 99% confidence and routed to Electrical with priority 100. The system also correctly returned a likely-duplicate result for repeated geographic and semantic evidence.', { size: 24 }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Repository')] }),
        paragraph('https://github.com/sumanth02005/AIT-Tech', { size: 24, color: '203A43', bold: true }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('AI Usage')] }),
        paragraph('GitHub Copilot / VS Code Copilot was used for implementation and debugging. Google Gemini performs runtime complaint analysis. The team retains an independent rules engine and database fallback behavior rather than relying on AI output alone.', { size: 24 }),
      ],
    }],
  })

  await Packer.toBuffer(doc).then(buffer => fs.writeFileSync(path.join(outDir, 'CivicLens_Project_Writeup.docx'), buffer))
}

async function createDeck() {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'CivicLens Team'
  pptx.subject = 'Citizen Complaint Management'
  pptx.title = 'CivicLens'

  const colors = { ink: '17252B', red: 'DD493F', paper: 'F7F8F4', line: 'D8DDDA', muted: '66757A', mint: 'DCE9DF', navy: '203A43' }
  const addFooter = (slide, num) => {
    slide.addText(`CIVICLENS  /  ${String(num).padStart(2, '0')}`, { x: 0.65, y: 7.08, w: 3.5, h: 0.18, fontFace: 'Arial', fontSize: 8, color: colors.muted, charSpacing: 1.2 })
  }

  let slide = pptx.addSlide()
  slide.background = { color: colors.ink }
  slide.addText('CivicLens', { x: 0.75, y: 1.15, w: 7.2, h: 0.8, fontFace: 'Cambria', fontSize: 46, bold: true, color: 'FFFFFF' })
  slide.addText('REPORT THE ISSUE.\nROUTE THE RESPONSE.', { x: 0.75, y: 2.05, w: 7.2, h: 1.7, fontFace: 'Arial', fontSize: 30, bold: true, color: 'FFFFFF', breakLine: false })
  slide.addText('Citizen complaint intelligence for fast municipal action', { x: 0.75, y: 4.15, w: 6.4, h: 0.55, fontFace: 'Arial', fontSize: 16, color: 'DCE9DF' })
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.35, y: 1.05, w: 3.1, h: 3.1, line: { color: colors.red, width: 3 }, fill: { color: '203A43', transparency: 100 } })
  slide.addShape(pptx.ShapeType.ellipse, { x: 10.15, y: 1.85, w: 1.5, h: 1.5, line: { color: 'FFFFFF', width: 2 }, fill: { color: colors.red } })
  slide.addText('AI + RULES\n+ LOCATION', { x: 9.75, y: 5.15, w: 2.3, h: 1.0, align: 'center', fontFace: 'Arial', fontSize: 13, bold: true, color: 'FFFFFF', breakLine: false })
  addFooter(slide, 1)

  slide = pptx.addSlide()
  slide.background = { color: colors.paper }
  slide.addText('The civic reporting gap', { x: 0.75, y: 0.65, w: 6.5, h: 0.55, fontFace: 'Cambria', fontSize: 34, bold: true, color: colors.ink })
  slide.addText('A report arrives—but context, urgency, routing, and repeat incidents remain fragmented.', { x: 0.75, y: 1.38, w: 5.2, h: 1.1, fontFace: 'Arial', fontSize: 20, color: colors.muted })
  const oldItems = [['1', 'Free-text reports'], ['2', 'Photo evidence'], ['3', 'Location uncertainty'], ['4', 'Duplicate complaints']]
  oldItems.forEach((item, i) => {
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 2.7 + i * 0.78, w: 4.65, h: 0.58, rectRadius: 0.08, line: { color: colors.line }, fill: { color: 'FFFFFF' } })
    slide.addText(item[0], { x: 0.92, y: 2.84 + i * 0.78, w: 0.35, h: 0.2, fontFace: 'Arial', fontSize: 11, bold: true, color: colors.red })
    slide.addText(item[1], { x: 1.35, y: 2.78 + i * 0.78, w: 3.7, h: 0.25, fontFace: 'Arial', fontSize: 14, bold: true, color: colors.ink })
  })
  slide.addShape(pptx.ShapeType.chevron, { x: 6.05, y: 3.05, w: 1.2, h: 1.15, fill: { color: colors.red }, line: { color: colors.red } })
  slide.addShape(pptx.ShapeType.roundRect, { x: 7.55, y: 1.55, w: 4.7, h: 4.6, rectRadius: 0.08, line: { color: colors.ink, width: 1 }, fill: { color: colors.ink } })
  slide.addText('CivicLens', { x: 8.15, y: 2.05, w: 3.5, h: 0.55, fontFace: 'Cambria', fontSize: 28, bold: true, color: 'FFFFFF' })
  ;['Understand', 'Verify', 'Geolocate', 'Deduplicate', 'Prioritize', 'Route'].forEach((t, i) => {
    slide.addText(t, { x: 8.15, y: 2.85 + i * 0.48, w: 3.1, h: 0.28, fontFace: 'Arial', fontSize: 13, bold: i === 0, color: i === 0 ? 'FF7770' : 'FFFFFF' })
  })
  addFooter(slide, 2)

  slide = pptx.addSlide()
  slide.background = { color: 'FFFFFF' }
  slide.addText('One report becomes a managed incident', { x: 0.75, y: 0.65, w: 9.0, h: 0.55, fontFace: 'Cambria', fontSize: 34, bold: true, color: colors.ink })
  const stages = [
    ['01', 'Capture', 'Description, photo, GPS'],
    ['02', 'Understand', 'Gemini + policy rules'],
    ['03', 'Detect', 'PostGIS + pgvector'],
    ['04', 'Route', 'Priority + department'],
  ]
  stages.forEach((stage, i) => {
    const x = 0.75 + i * 3.05
    slide.addShape(pptx.ShapeType.roundRect, { x, y: 2.0, w: 2.65, h: 2.75, rectRadius: 0.08, line: { color: i === 3 ? colors.red : colors.line, width: i === 3 ? 2 : 1 }, fill: { color: i === 3 ? 'FFF1EE' : 'F7F8F4' } })
    slide.addText(stage[0], { x: x + 0.18, y: 2.18, w: 0.5, h: 0.28, fontFace: 'Arial', fontSize: 11, bold: true, color: i === 3 ? colors.red : colors.muted })
    slide.addText(stage[1], { x: x + 0.18, y: 2.78, w: 2.2, h: 0.45, fontFace: 'Arial', fontSize: 20, bold: true, color: colors.ink })
    slide.addText(stage[2], { x: x + 0.18, y: 3.55, w: 2.2, h: 0.65, fontFace: 'Arial', fontSize: 13, color: colors.muted })
  })
  slide.addShape(pptx.ShapeType.line, { x: 3.4, y: 3.35, w: 0.38, h: 0, line: { color: colors.muted, width: 1.5, beginArrowType: 'none', endArrowType: 'triangle' } })
  slide.addShape(pptx.ShapeType.line, { x: 6.45, y: 3.35, w: 0.38, h: 0, line: { color: colors.muted, width: 1.5, beginArrowType: 'none', endArrowType: 'triangle' } })
  slide.addShape(pptx.ShapeType.line, { x: 9.5, y: 3.35, w: 0.38, h: 0, line: { color: colors.muted, width: 1.5, beginArrowType: 'none', endArrowType: 'triangle' } })
  slide.addText('Preserve every original report', { x: 0.75, y: 5.55, w: 5.6, h: 0.4, fontFace: 'Arial', fontSize: 15, bold: true, color: colors.red })
  addFooter(slide, 3)

  slide = pptx.addSlide()
  slide.background = { color: colors.ink }
  slide.addText('Built for a complete pilot', { x: 0.75, y: 0.65, w: 7.2, h: 0.55, fontFace: 'Cambria', fontSize: 34, bold: true, color: 'FFFFFF' })
  const features = [
    ['ELECTRICITY', 'CRITICAL', 'Gemini classification'],
    ['POSTGIS', 'LOCATION', 'Geographic candidates'],
    ['PGVECTOR', '384D', 'Semantic similarity'],
    ['TICKET', 'OPEN', 'Officer status workflow'],
  ]
  features.forEach((feature, i) => {
    const x = 0.75 + (i % 2) * 6.15
    const y = 1.65 + Math.floor(i / 2) * 2.35
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 5.55, h: 1.85, rectRadius: 0.08, line: { color: 'FFFFFF', transparency: 80 }, fill: { color: i === 0 ? colors.red : '203A43', transparency: i === 0 ? 0 : 10 } })
    slide.addText(feature[0], { x: x + 0.25, y: y + 0.28, w: 2.9, h: 0.28, fontFace: 'Arial', fontSize: 11, bold: true, color: i === 0 ? 'FFFFFF' : 'DCE9DF' })
    slide.addText(feature[1], { x: x + 0.25, y: y + 0.72, w: 2.8, h: 0.48, fontFace: 'Arial', fontSize: 26, bold: true, color: 'FFFFFF' })
    slide.addText(feature[2], { x: x + 0.25, y: y + 1.35, w: 4.8, h: 0.25, fontFace: 'Arial', fontSize: 12, color: i === 0 ? 'FFFFFF' : 'DCE9DF' })
  })
  slide.addText('React + FastAPI + Supabase', { x: 0.75, y: 6.42, w: 5.4, h: 0.35, fontFace: 'Arial', fontSize: 13, bold: true, color: 'DCE9DF' })
  addFooter(slide, 4)

  slide = pptx.addSlide()
  slide.background = { color: colors.paper }
  slide.addText('Impact and next step', { x: 0.75, y: 0.65, w: 8.0, h: 0.55, fontFace: 'Cambria', fontSize: 34, bold: true, color: colors.ink })
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 1.55, w: 3.75, h: 4.75, rectRadius: 0.08, line: { color: colors.line }, fill: { color: 'FFFFFF' } })
  slide.addText('Verified', { x: 1.12, y: 2.0, w: 2.7, h: 0.35, fontFace: 'Arial', fontSize: 12, bold: true, color: colors.red })
  slide.addText('99%', { x: 1.12, y: 2.55, w: 2.5, h: 0.75, fontFace: 'Cambria', fontSize: 54, bold: true, color: colors.ink })
  slide.addText('Gemini confidence on a live-wire complaint', { x: 1.12, y: 3.55, w: 2.8, h: 0.75, fontFace: 'Arial', fontSize: 15, color: colors.muted })
  slide.addText('CRITICAL  /  ELECTRICITY  /  PRIORITY 100', { x: 1.12, y: 4.65, w: 2.9, h: 0.65, fontFace: 'Arial', fontSize: 12, bold: true, color: colors.red })
  slide.addShape(pptx.ShapeType.roundRect, { x: 5.05, y: 1.55, w: 7.2, h: 4.75, rectRadius: 0.08, line: { color: colors.ink }, fill: { color: colors.ink } })
  slide.addText('Next', { x: 5.55, y: 2.05, w: 2.0, h: 0.35, fontFace: 'Arial', fontSize: 12, bold: true, color: 'FF7770' })
  slide.addText('Deploy the pilot', { x: 5.55, y: 2.65, w: 5.7, h: 0.65, fontFace: 'Cambria', fontSize: 36, bold: true, color: 'FFFFFF' })
  slide.addText('Public hosting · Demo video · Officer authentication · Realtime status · Mobile notifications', { x: 5.55, y: 3.65, w: 5.7, h: 1.2, fontFace: 'Arial', fontSize: 16, color: 'DCE9DF' })
  slide.addText('GitHub: github.com/sumanth02005/AIT-Tech', { x: 5.55, y: 5.35, w: 5.8, h: 0.35, fontFace: 'Arial', fontSize: 12, bold: true, color: 'FFFFFF' })
  addFooter(slide, 5)

  await pptx.writeFile({ fileName: path.join(outDir, 'CivicLens_Presentation.pptx') })
}

createWriteup().then(createDeck).catch(error => {
  console.error(error)
  process.exit(1)
})
