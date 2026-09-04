// Vocabulary bookmarks and Anki flashcard deck export service

export interface VocabularyItem {
  id: string;
  timestamp: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  notes?: string;
}

const STORAGE_KEY = 'librelingo_saved_vocabulary';

export function getVocabulary(): VocabularyItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveVocabulary(items: VocabularyItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addVocabularyItem(
  sourceText: string,
  translatedText: string,
  sourceLang: string,
  targetLang: string
): VocabularyItem {
  const items = getVocabulary();
  // Check if already exists
  const existingIdx = items.findIndex(i => i.sourceText.trim() === sourceText.trim() && i.targetLang === targetLang);
  if (existingIdx >= 0) {
    return items[existingIdx];
  }

  const newItem: VocabularyItem = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    sourceText: sourceText.trim(),
    translatedText: translatedText.trim(),
    sourceLang,
    targetLang
  };

  items.unshift(newItem);
  saveVocabulary(items);
  return newItem;
}

export function removeVocabularyItem(id: string): void {
  const items = getVocabulary().filter(i => i.id !== id);
  saveVocabulary(items);
}

export function isItemSaved(sourceText: string, targetLang: string): boolean {
  if (!sourceText.trim()) return false;
  const items = getVocabulary();
  return items.some(i => i.sourceText.trim() === sourceText.trim() && i.targetLang === targetLang);
}

export function exportToAnkiCsv(): string {
  const items = getVocabulary();
  if (items.length === 0) return '';

  // Anki accepts tab-delimited files: Front \t Back \t Tags
  const header = '#separator:tab\n#html:true\n#tags column:3\n';
  const rows = items.map(item => {
    const front = escapeForTsv(item.sourceText);
    const back = escapeForTsv(item.translatedText);
    const tags = `LibreLingo ${item.sourceLang}-${item.targetLang}`;
    return `${front}\t${back}\t${tags}`;
  });

  return header + rows.join('\n');
}

function escapeForTsv(str: string): string {
  return str.replace(/\t/g, ' ').replace(/\n/g, '<br>');
}
