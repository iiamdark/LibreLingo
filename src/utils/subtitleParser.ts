// Subtitle parser and formatter for .srt and .vtt formats

export interface SubtitleCue {
  id: string;
  start: string;
  end: string;
  text: string;
}

export function parseSrt(content: string): SubtitleCue[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 2) {
      // Check if line 0 is numeric index or timestamp
      let timeLineIdx = 1;
      let id = lines[0].trim();
      if (!lines[0].includes('-->')) {
        timeLineIdx = 1;
      } else {
        timeLineIdx = 0;
        id = String(cues.length + 1);
      }

      const timeMatch = lines[timeLineIdx]?.match(/(.*?)\s*-->\s*(.*)/);
      if (timeMatch) {
        const start = timeMatch[1].trim();
        const end = timeMatch[2].trim();
        const text = lines.slice(timeLineIdx + 1).join('\n').trim();

        if (text) {
          cues.push({ id, start, end, text });
        }
      }
    }
  }

  return cues;
}

export function formatSrt(cues: SubtitleCue[]): string {
  return cues.map((cue, idx) => {
    return `${idx + 1}\n${cue.start} --> ${cue.end}\n${cue.text}\n`;
  }).join('\n');
}

export function parseVtt(content: string): SubtitleCue[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const cues: SubtitleCue[] = [];
  let currentCue: Partial<SubtitleCue> | null = null;
  let textLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      if (currentCue && textLines.length > 0) {
        cues.push({
          id: currentCue.id || String(cues.length + 1),
          start: currentCue.start || '00:00:00.000',
          end: currentCue.end || '00:00:00.000',
          text: textLines.join('\n')
        });
        textLines = [];
      }
      const parts = line.split('-->');
      currentCue = {
        id: String(cues.length + 1),
        start: parts[0].trim(),
        end: parts[1].trim().split(' ')[0]
      };
    } else if (currentCue && line) {
      textLines.push(line);
    } else if (!line && currentCue && textLines.length > 0) {
      cues.push({
        id: currentCue.id || String(cues.length + 1),
        start: currentCue.start || '00:00:00.000',
        end: currentCue.end || '00:00:00.000',
        text: textLines.join('\n')
      });
      currentCue = null;
      textLines = [];
    }
  }

  if (currentCue && textLines.length > 0) {
    cues.push({
      id: currentCue.id || String(cues.length + 1),
      start: currentCue.start || '00:00:00.000',
      end: currentCue.end || '00:00:00.000',
      text: textLines.join('\n')
    });
  }

  return cues;
}

export function formatVtt(cues: SubtitleCue[]): string {
  let out = 'WEBVTT\n\n';
  out += cues.map((cue, idx) => {
    return `${idx + 1}\n${cue.start} --> ${cue.end}\n${cue.text}\n`;
  }).join('\n');
  return out;
}
