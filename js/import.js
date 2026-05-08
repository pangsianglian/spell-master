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
  let fullText = '';
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
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
  return text
    .split(/\r?\n|;/)
    .map(line => line.trim())
    .flatMap(line => splitCommaOnlyWordRows(line))
    .map(line => line.replace(/^\d+[.)\-\s]+/, ''))
    .map(line => line.replace(/^[•\-*]\s*/, ''))
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0)
    .filter(line => /[a-zA-Z]/.test(line))
    .map(normalisePreviewLine);
}

function splitCommaOnlyWordRows(line) {
  if (line.includes('|')) return [line];
  const parts = line.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length > 1 && parts.every(part => /^[a-zA-Z' -]+$/.test(part))) return parts;
  return [line];
}

function normalisePreviewLine(line) {
  if (line.includes('|')) {
    const [word, ...sentenceParts] = line.split('|');
    const cleanWord = cleanWordText(word);
    const sentence = sentenceParts.join('|').trim();
    return sentence ? `${cleanWord} | ${sentence}` : cleanWord;
  }
  return cleanWordText(line);
}

function cleanWordText(text) {
  return text
    .replace(/[^a-zA-Z\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parsePreviewLines(text) {
  return text
    .split(/\r?\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      if (line.includes('|')) {
        const [word, ...sentenceParts] = line.split('|');
        const cleanWord = cleanWordText(word);
        const sentence = sentenceParts.join('|').trim() || `The word is ${cleanWord}.`;
        return { w: cleanWord, s: sentence };
      }
      const cleanWord = cleanWordText(line);
      return { w: cleanWord, s: `The word is ${cleanWord}.` };
    })
    .filter(item => item.w);
}

function makeDefaultListName(fileName) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Imported Spelling List';
}
