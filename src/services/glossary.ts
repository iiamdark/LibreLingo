// Custom glossary and terminology rules manager

export interface GlossaryTerm {
  id: string;
  source: string;
  target: string;
  caseSensitive: boolean;
}

const STORAGE_KEY = 'librelingo_glossary_terms';

export function getGlossaryTerms(): GlossaryTerm[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveGlossaryTerms(terms: GlossaryTerm[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
}

export function addGlossaryTerm(source: string, target: string, caseSensitive: boolean = false): GlossaryTerm {
  const terms = getGlossaryTerms();
  const newTerm: GlossaryTerm = {
    id: Math.random().toString(36).substring(2, 9),
    source: source.trim(),
    target: target.trim(),
    caseSensitive
  };
  terms.unshift(newTerm);
  saveGlossaryTerms(terms);
  return newTerm;
}

export function removeGlossaryTerm(id: string): void {
  const terms = getGlossaryTerms().filter(t => t.id !== id);
  saveGlossaryTerms(terms);
}

export function applyGlossary(text: string): string {
  const terms = getGlossaryTerms();
  if (terms.length === 0 || !text) return text;

  let result = text;
  for (const term of terms) {
    if (!term.source) continue;
    try {
      const flags = term.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(`\\b${escapeRegExp(term.source)}\\b`, flags);
      result = result.replace(regex, term.target);
    } catch {
      // Fallback simple replace
      result = result.split(term.source).join(term.target);
    }
  }
  return result;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
