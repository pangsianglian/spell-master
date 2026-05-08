const fileInput = document.getElementById('file-input');
const extractBtn = document.getElementById('extract-btn');
const pasteText = document.getElementById('paste-text');
const usePasteBtn = document.getElementById('use-paste-btn');
const previewText = document.getElementById('preview-text');
const listNameInput = document.getElementById('list-name');
const confirmSaveBtn = document.getElementById('confirm-save-btn');
const clearBtn = document.getElementById('clear-btn');
const statusText = document.getElementById('status');

window.addEventListener('load', renderVersion);

extractBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    showStatus('Please choose a file first.', true);
    return;
  }

  showStatus('Reading file...');

  try {
    let rawText = '';
    const lowerName = file.name.toLowerCase();

    if (file.type === 'text/plain' || lowerName.endsWith('.txt')) {
      rawText = await file.text();
    } else if (lowerName.endsWith('.docx')) {
      rawText = await readDocxFile(file);
    } else if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
      rawText = await readPdfFile(file);
    } else if (file.type.startsWith('image/')) {
      rawText = await readImageFile(file);
    } else {
      showStatus('Unsupported file type. Please use TXT, DOCX, PDF, JPG, or PNG.', true);
      return;
    }

    const cleanedLines = cleanImportedText(rawText);
    previewText.value = cleanedLines.join('\n');
    if (!listNameInput.value.trim()) listNameInput.value = makeDefaultListName(file.name);
    showStatus(`Imported ${cleanedLines.length} line(s). Please check and edit before clicking Confirm & Save.`);
  } catch (error) {
    console.error(error);
    showStatus('Sorry, I could not read this file. Please try another file or paste the words instead.', true);
  }
});

usePasteBtn.addEventListener('click', () => {
  const rawText = pasteText.value.trim();
  if (!rawText) {
    showStatus('Please paste some words first.', true);
    return;
  }
  const cleanedLines = cleanImportedText(rawText);
  previewText.value = cleanedLines.join('\n');
  if (!listNameInput.value.trim()) listNameInput.value = 'Imported Spelling List';
  showStatus(`Prepared ${cleanedLines.length} line(s). Please check and edit before saving.`);
});

confirmSaveBtn.addEventListener('click', () => {
  const listName = listNameInput.value.trim();
  const content = previewText.value.trim();

  if (!listName) {
    showStatus('Please enter a list name before saving.', true);
    return;
  }

  if (!content) {
    showStatus('There are no words to save. Please import or paste words first.', true);
    return;
  }

  const items = parsePreviewLines(content);
  if (!items.length) {
    showStatus('No valid spelling words found.', true);
    return;
  }

  const isConfirmed = window.confirm(
    `Please confirm:\n\nYou are about to save ${items.length} spelling word(s) to "${listName}".\n\nHave you checked that the spelling list is correct?`
  );

  if (!isConfirmed) {
    showStatus('Save cancelled. Please continue checking the list.');
    return;
  }

  const custom = getCustomLists();
  custom[listName] = items;
  saveCustomLists(custom);
  saveLastList(listName);
  showStatus(`Saved "${listName}" with ${items.length} word(s). ⭐`);
});

clearBtn.addEventListener('click', () => {
  if (!window.confirm('Clear the imported spelling list preview?')) return;
  previewText.value = '';
  pasteText.value = '';
  listNameInput.value = '';
  fileInput.value = '';
  showStatus('Import preview cleared.');
});

function showStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.className = isError ? 'status-note error-text' : 'status-note success-text';
}

async function readDocxFile(file) {
  if (!window.mammoth) throw new Error('Mammoth library is not loaded.');
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function readPdfFile(file) {
  const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const extractedLines = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    showStatus(`Reading PDF page ${pageNumber} of ${pdf.numPages}...`);
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageLines = extractPdfTableRows(textContent.items);

    if (pageLines.length) {
      extractedLines.push(...pageLines);
    } else {
      // Fallback for simple PDFs without table-like coordinates.
      extractedLines.push(textContent.items.map(item => item.str).join(' '));
    }
  }

  return extractedLines.join('\n');
}

function extractPdfTableRows(items) {
  const tokens = items
    .map(item => ({
      text: String(item.str || '').replace(/\s+/g, ' ').trim(),
      x: Number(item.transform?.[4] || 0),
      y: Number(item.transform?.[5] || 0)
    }))
    .filter(item => item.text);

  const rows = [];
  const yTolerance = 3;

  tokens.forEach(token => {
    let row = rows.find(existing => Math.abs(existing.y - token.y) <= yTolerance);
    if (!row) {
      row = { y: token.y, items: [] };
      rows.push(row);
    }
    row.items.push(token);
  });

  rows.sort((a, b) => b.y - a.y);
  rows.forEach(row => row.items.sort((a, b) => a.x - b.x));

  const output = [];
  let pendingNumber = '';

  rows.forEach(row => {
    let line = row.items.map(item => item.text).join(' ').replace(/\s+/g, ' ').trim();
    if (!line) return;

    // Some PDFs place the row number slightly above the word/sentence row.
    if (/^\d+[.)]?$/.test(line)) {
      pendingNumber = line;
      return;
    }

    if (pendingNumber && !/^\d+[.)]?\s+/.test(line)) {
      line = `${pendingNumber} ${line}`;
      pendingNumber = '';
    }

    const parsed = parsePotentialWordSentenceLine(line);
    if (parsed) output.push(parsed);
  });

  return dedupeLines(output);
}

async function readImageFile(file) {
  if (!window.Tesseract) throw new Error('Tesseract library is not loaded.');
  showStatus('Reading picture text... 0%');
  const result = await window.Tesseract.recognize(file, 'eng', {
    logger: message => {
      if (message.status === 'recognizing text') {
        showStatus(`Reading picture text... ${Math.round(message.progress * 100)}%`);
      }
    }
  });
  return result.data.text;
}

function cleanImportedText(text) {
  const sourceLines = text
    .split(/\r?\n|;/)
    .map(line => line.trim())
    .filter(Boolean);

  const structuredLines = sourceLines
    .flatMap(line => splitCommaOnlyWordRows(line))
    .map(line => line.replace(/^[•\-*]\s*/, '').replace(/\s+/g, ' ').trim())
    .map(parsePotentialWordSentenceLine)
    .filter(Boolean);

  if (structuredLines.length >= 3) return dedupeLines(structuredLines);

  const flatRows = extractRowsFromFlatPdfText(text);
  if (flatRows.length >= 3) return dedupeLines(flatRows);

  return sourceLines
    .flatMap(line => splitCommaOnlyWordRows(line))
    .map(line => line.replace(/^\d+[.)\-\s]+/, ''))
    .map(line => line.replace(/^[•\-*]\s*/, ''))
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0)
    .filter(line => /[a-zA-Z]/.test(line))
    .filter(line => !isLikelyHeaderLine(line))
    .map(normalisePreviewLine)
    .filter(line => line.split(/\s+/).length <= 4 || line.includes('|'));
}

function splitCommaOnlyWordRows(line) {
  if (line.includes('|')) return [line];
  const parts = line.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length > 1 && parts.every(part => /^[a-zA-Z' -]+$/.test(part))) return parts;
  return [line];
}

function parsePotentialWordSentenceLine(line) {
  const cleaned = line
    .replace(/^\d+[.)\-\s]+/, '')
    .replace(/^[•\-*]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || isLikelyHeaderLine(cleaned)) return null;

  if (cleaned.includes('|')) {
    const [word, ...sentenceParts] = cleaned.split('|');
    const cleanWord = cleanWordText(word);
    const sentence = sentenceParts.join('|').trim();
    if (!isValidSpellingWord(cleanWord)) return null;
    return sentence ? `${cleanWord} | ${cleanSentence(sentence)}` : cleanWord;
  }

  // Table row style: "1. fly The bird can fly in the sky." or "fly The bird can fly..."
  const match = cleaned.match(/^(?:\d+[.)]?\s+)?([A-Za-z][A-Za-z'-]*)\s+(.{6,})$/);
  if (match) {
    const word = cleanWordText(match[1]);
    const sentence = cleanSentence(match[2]);
    if (isValidSpellingWord(word) && looksLikeSentence(sentence)) {
      return `${word} | ${sentence}`;
    }
  }

  return null;
}

function extractRowsFromFlatPdfText(text) {
  // Safety net for PDFs where all table text becomes one long paragraph.
  // It looks for numbered spelling rows such as "1. fly The bird can fly... 2. snap ...".
  const oneLine = text.replace(/\s+/g, ' ').trim();
  const numberedRows = [...oneLine.matchAll(/(?:^|\s)(\d+[.)])\s+([A-Za-z][A-Za-z'-]*)\s+(.+?)(?=\s+\d+[.)]\s+[A-Za-z]|\s+TERM\s+\d|$)/gi)];

  return numberedRows
    .map(match => {
      const word = cleanWordText(match[2]);
      const sentence = cleanSentence(match[3]);
      if (!isValidSpellingWord(word) || !looksLikeSentence(sentence)) return null;
      return `${word} | ${sentence}`;
    })
    .filter(Boolean);
}

function normalisePreviewLine(line) {
  const parsed = parsePotentialWordSentenceLine(line);
  if (parsed) return parsed;
  return cleanWordText(line);
}

function cleanWordText(text) {
  return text
    .replace(/[^a-zA-Z\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cleanSentence(text) {
  const sentence = text
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return sentence || '';
}

function isValidSpellingWord(word) {
  return /^[a-z][a-z'-]{1,24}$/.test(word) && !STOP_WORDS.has(word);
}

function looksLikeSentence(sentence) {
  if (!sentence || sentence.length < 6) return false;
  if (isLikelyHeaderLine(sentence)) return false;
  return /\s/.test(sentence) || /[.!?]$/.test(sentence);
}

function isLikelyHeaderLine(line) {
  const lower = line.toLowerCase().replace(/\s+/g, ' ').trim();
  return (
    lower.includes('east spring primary school') ||
    lower.includes('primary 1 spelling list') ||
    lower.includes('parent') ||
    lower.includes('signature') ||
    lower.includes('spelling is carried') ||
    lower.includes('only the bold') ||
    lower.includes('underlined words') ||
    lower.includes('you are encouraged') ||
    /^term\s+\d/i.test(lower) ||
    lower === 'word sentence' ||
    lower === 'word' ||
    lower === 'sentence' ||
    /^name\b/i.test(lower) ||
    /^class\b/i.test(lower)
  );
}

function dedupeLines(lines) {
  const seen = new Set();
  return lines.filter(line => {
    const key = line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const STOP_WORDS = new Set([
  'term', 'week', 'word', 'sentence', 'name', 'class', 'parent', 'signature',
  'spelling', 'note', 'only', 'bold', 'underlined', 'tested', 'test', 'school'
]);

function makeDefaultListName(fileName) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Imported Spelling List';
}
